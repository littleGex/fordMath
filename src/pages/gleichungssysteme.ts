import "./sw-register";
import "../styles/zone.css";
import "../styles/gleichungssysteme.css";
import { makeSystem, solveSystem, type Equation, type SystemSolution } from "../lib/linear-system";
import { parseRational, toNumber, type Rational } from "../lib/rational";
import { METHODS, checkStep, methodWork, num, solutionText, type Method, type WorkStep } from "../explain/linear-system";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Gleichungssysteme", subtitle: "Zwei Gleichungen, zwei Unbekannte",
    boxes: "Trag die Zahlen vor x und y und rechts vom = ein.",
    hint: "Minus, Komma (1,5) und Brüche (3/4) gehen. Ein leeres Feld zählt als 0.",
    bad: "Hier steht etwas, das keine Zahl ist. Erlaubt sind z. B. 3, −2, 1,5 oder 3/4.",
    reveal: "Lösung zeigen", howTitle: "So rechnest du es aus", dice: "🎲 Neue Aufgabe",
    tryFirst: "Rechne erst selbst! Dann tippe auf „Lösung zeigen“.",
    methods: { gleich: "Gleichsetzen", einsetz: "Einsetzen", addition: "Addieren", graph: "Zeichnen" } satisfies Record<Method, string>,
    methodLong: {
      gleich: "Gleichsetzungsverfahren", einsetz: "Einsetzungsverfahren", addition: "Additionsverfahren", graph: "Zeichnerisches Verfahren",
    } satisfies Record<Method, string>,
    examples: ["Buch", "Brüche", "Parallel", "Dieselbe Gerade", "Senkrecht"],
    graphLabel: "Die beiden Geraden im Koordinatensystem",
  },
  en: {
    title: "Two equations", subtitle: "Simultaneous equations with two unknowns",
    boxes: "Type the numbers in front of x and y, and after the =.",
    hint: "Minus signs, decimals (1.5) and fractions (3/4) all work. An empty box counts as 0.",
    bad: "Something here isn't a number. Try 3, −2, 1.5 or 3/4.",
    reveal: "Show the solution", howTitle: "How to work it out", dice: "🎲 New one",
    tryFirst: "Have a go yourself first! Then tap “Show the solution”.",
    methods: { gleich: "Equate", einsetz: "Substitute", addition: "Eliminate", graph: "Draw" } satisfies Record<Method, string>,
    methodLong: {
      gleich: "Equating (Gleichsetzungsverfahren)", einsetz: "Substitution (Einsetzungsverfahren)",
      addition: "Elimination (Additionsverfahren)", graph: "Drawing the lines",
    } satisfies Record<Method, string>,
    examples: ["Textbook", "Fractions", "Parallel", "Same line", "Vertical"],
    graphLabel: "Both lines on a grid",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

/** Example systems as the text in the six boxes: a1, b1, c1, a2, b2, c2. */
const EXAMPLES: string[][] = [
  ["2", "3", "13", "1", "-1", "-1"],
  ["3", "4", "10", "5", "-6", "1"],
  ["1", "2", "3", "2", "4", "7"],
  ["1", "2", "3", "-2", "-4", "-6"],
  ["1", "", "4", "1", "1", "1"],
];

let lang: Lang = getLang();
let method: Method = "einsetz";
let hidden = false; // a dice task waits for "show the solution"
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const boxes = (row: 1 | 2) => [...document.querySelectorAll<HTMLInputElement>(`.eq-row[data-row="${row}"] input`)];

function setBoxes(values: readonly string[]): void {
  [...boxes(1), ...boxes(2)].forEach((input, i) => (input.value = (values[i] ?? "").replace("-", "−")));
}

/** Both equations, or null if a box can't be read (those boxes get marked). */
function readSystem(): [Equation, Equation] | null {
  let ok = true;
  const row = (r: 1 | 2): Equation => {
    const [a, b, c] = boxes(r).map((input) => {
      const v = parseRational(input.value);
      input.classList.toggle("bad", v === null);
      if (v === null) ok = false;
      return v ?? parseRational("0")!;
    });
    return { a: a!, b: b!, c: c! };
  };
  const system: [Equation, Equation] = [row(1), row(2)];
  return ok ? system : null;
}

// ---------- the graph ----------

const NS = "http://www.w3.org/2000/svg";
function drawGraph(e: [Equation, Equation], sol: SystemSolution): void {
  const svg = $("graph") as unknown as SVGSVGElement;
  svg.replaceChildren();
  svg.setAttribute("aria-label", t().graphLabel);
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    svg.appendChild(n);
    return n;
  };
  // Centre on the crossing point, with room around it; at least −8 … 8.
  const cx = sol.kind === "unique" ? Math.round(toNumber(sol.x)) : 0;
  const cy = sol.kind === "unique" ? Math.round(toNumber(sol.y)) : 0;
  const half = Math.min(60, Math.max(8, Math.abs(cx) + 3, Math.abs(cy) + 3));
  const [x0, x1, y0, y1] = [cx - half, cx + half, cy - half, cy + half];
  const S = 400;
  const px = (x: number) => ((x - x0) / (x1 - x0)) * S;
  const py = (y: number) => S - ((y - y0) / (y1 - y0)) * S;
  const step = half <= 10 ? 1 : half <= 25 ? 5 : 10;

  for (let g = Math.ceil(x0 / step) * step; g <= x1; g += step) {
    add("line", { x1: px(g), x2: px(g), y1: 0, y2: S, stroke: "#2c3a58", "stroke-width": g === 0 ? 2.5 : 1 });
  }
  for (let g = Math.ceil(y0 / step) * step; g <= y1; g += step) {
    add("line", { x1: 0, x2: S, y1: py(g), y2: py(g), stroke: "#2c3a58", "stroke-width": g === 0 ? 2.5 : 1 });
  }
  // Axis numbers every few grid lines, kept inside the picture.
  const labelEvery = step * 2;
  const clampX = (v: number) => Math.min(S - 14, Math.max(14, v));
  const clampY = (v: number) => Math.min(S - 6, Math.max(14, v));
  for (let g = Math.ceil(x0 / labelEvery) * labelEvery; g <= x1; g += labelEvery) {
    if (g !== 0 && px(g) > 16 && px(g) < S - 16) add("text", { x: px(g), y: clampY(py(0) + 16), "text-anchor": "middle" }, String(g).replace("-", "−"));
  }
  for (let g = Math.ceil(y0 / labelEvery) * labelEvery; g <= y1; g += labelEvery) {
    if (g !== 0 && py(g) > 16 && py(g) < S - 10) add("text", { x: clampX(px(0) - 6), y: py(g) + 4, "text-anchor": "end" }, String(g).replace("-", "−"));
  }
  if (x0 < 0 && x1 > 0) add("text", { x: S - 6, y: clampY(py(0) - 8), "text-anchor": "end" }, "x");
  if (y0 < 0 && y1 > 0) add("text", { x: clampX(px(0) + 18), y: 16, "text-anchor": "start" }, "y");

  const colours = ["#00d4ff", "#ffb347"];
  e.forEach((eqn, i) => {
    const [a, b, c] = [toNumber(eqn.a), toNumber(eqn.b), toNumber(eqn.c)];
    const style = { stroke: colours[i]!, "stroke-width": 3.5, "stroke-linecap": "round", ...(i === 1 && sol.kind === "infinite" ? { "stroke-dasharray": "10 8" } : {}) };
    if (b !== 0) add("line", { x1: px(x0), y1: py((c - a * x0) / b), x2: px(x1), y2: py((c - a * x1) / b), ...style });
    else if (a !== 0) add("line", { x1: px(c / a), y1: 0, x2: px(c / a), y2: S, ...style });
  });
  if (sol.kind === "unique") {
    const [x, y] = [toNumber(sol.x), toNumber(sol.y)];
    add("circle", { cx: px(x), cy: py(y), r: 7, fill: "#7cfc00", stroke: "#141c2e", "stroke-width": 2.5 });
    const right = px(x) < S - 110;
    add("text", { x: px(x) + (right ? 12 : -12), y: Math.max(20, py(y) - 10), "text-anchor": right ? "start" : "end", class: "pt" }, `S(${num(sol.x)} | ${num(sol.y)})`);
  }
  $("legend").replaceChildren(
    ...[0, 1].map((i) => {
      const span = el("span");
      span.append(el("i", "", `k-l${i + 1}`), document.createTextNode(i === 0 ? "(I)" : "(II)"));
      return span;
    }),
  );
}

// ---------- the working ----------

function renderSteps(box: HTMLElement, steps: WorkStep[], numbered: boolean): void {
  box.replaceChildren(
    ...steps.map((s, k) => {
      const wrap = el("div", "", `work-step${s.lines.length === 0 && k === steps.length - 1 && steps.length > 1 ? " end" : ""}`);
      const p = el("p");
      if (numbered) p.append(el("span", `${k + 1}.`, "num"));
      p.append(document.createTextNode(s.say));
      wrap.append(p);
      if (s.lines.length) {
        const grid = el("div", "", "work-lines");
        s.lines.forEach((l, i) => {
          const isResult = i === s.lines.length - 1 && /^[xy] = [^xy]*$/.test(l.math) && !l.op;
          const mark = l.math.endsWith("✓") ? " ok" : l.math.endsWith("✗") ? " no" : "";
          grid.append(el("span", l.tag ?? "", "tag"), el("span", l.math, `math${isResult ? " result" : ""}${mark}`), el("span", l.op ?? "", "op"));
        });
        wrap.append(grid);
      }
      return wrap;
    }),
  );
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

  $("examples").replaceChildren(
    ...EXAMPLES.map((values, i) => {
      const b = el("button", t().examples[i], "chip") as HTMLButtonElement;
      b.type = "button";
      b.addEventListener("click", () => {
        setBoxes(values);
        hidden = false;
        render();
      });
      return b;
    }),
    (() => {
      const b = el("button", t().dice, "chip") as HTMLButtonElement;
      b.type = "button";
      b.addEventListener("click", () => {
        const s = makeSystem(Math.random);
        const text = (q: Rational) => num(q);
        setBoxes([s.e1.a, s.e1.b, s.e1.c, s.e2.a, s.e2.b, s.e2.c].map(text));
        hidden = true;
        render();
      });
      return b;
    })(),
  );

  $("methods").replaceChildren(
    ...METHODS.map((m) => {
      const b = el("button", t().methods[m], "chip") as HTMLButtonElement;
      b.type = "button";
      b.title = t().methodLong[m];
      b.setAttribute("aria-pressed", String(m === method));
      b.addEventListener("click", () => {
        method = m;
        render();
      });
      return b;
    }),
  );

  const system = readSystem();
  $("error").hidden = system !== null;
  $("error").textContent = t().bad;
  $("answer").hidden = system === null;
  if (!system) return;

  const sol = solveSystem(...system);
  const text = solutionText(sol, lang);
  $("sol-set").textContent = hidden ? "L = { ? }" : text.set;
  $("sol-set").className = `sol-set${sol.kind === "none" ? " none" : sol.kind === "unique" ? "" : " many"}`;
  $("sol-say").textContent = hidden ? t().tryFirst : text.say;
  $("reveal").hidden = !hidden;
  $("details").hidden = hidden;
  if (hidden) return;

  drawGraph(system, sol);
  const work = methodWork(...system, method, lang);
  const box = $("work");
  if (work.ok) renderSteps(box, work.steps, true);
  else box.replaceChildren(el("p", work.why, "why-not"));
  box.prepend(el("h3", t().methodLong[method], "work-title"));

  const check = $("check");
  check.hidden = sol.kind !== "unique";
  if (sol.kind === "unique") renderSteps(check, [checkStep(...system, sol.x, sol.y, lang)], false);
}

// ---------- wiring ----------

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
document.querySelectorAll<HTMLInputElement>(".eq-row input").forEach((input) => {
  input.placeholder = "0";
  input.addEventListener("input", () => {
    hidden = false;
    render();
  });
});
$("reveal").addEventListener("click", () => {
  hidden = false;
  render();
});

setBoxes(EXAMPLES[0]!);
render();
