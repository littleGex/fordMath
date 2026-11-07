import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/lineare-funktionen.css";
import {
  makeFunctionRound, meet, onLine, slopeTriangle, throughPoints, zeroOf, type FunctionQuestion, type Line, type RPoint,
} from "../lib/linear-function";
import { add, parseRational, rat, toNumber, type Rational } from "../lib/rational";
import {
  interceptText, lineText, meetSteps, pointText, probeSteps, quizChoice, quizPrompt, quizSteps, slopeText, twoPointSteps, zeroSteps,
} from "../explain/linear-function";
import { num } from "../explain/linear-system";
import type { Lang } from "../explain/lang";
import { COLOURS, CoordGrid, type GridPoint } from "./coord-grid";
import { mountQuiz } from "./quiz";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Lineare Funktionen", subtitle: "y = m·x + b: Steigung, y-Achsenabschnitt, Geraden",
    second: "Zweite Gerade", probe: "Punktprobe:",
    twoTitle: "Gerade durch zwei Punkte", twoHint: "Tippe zwei Gitterpunkte an. Ein dritter Tipp fängt neu an.",
    bad: "Bitte Zahlen oder Brüche eingeben, z. B. 2, −1,5 oder 2/3.",
    zero: (x: string) => `Nullstelle: Die Gerade schneidet die x-Achse bei x = ${x}.`,
    noZero: "Keine Nullstelle: Die Gerade ist waagerecht und berührt die x-Achse nie.",
    examples: [["📈 y = 2x − 1", "2", "-1", null], ["🎯 Steigung 2/3", "2/3", "1", null], ["0️⃣ Proportional", "1/2", "0", null], ["⏸️ Parallel", "2", "1", ["2", "-3"]], ["🚕 Taxi", "1", "3", ["2", "0"]]] as Array<[string, string, string, [string, string] | null]>,
    taxi: "🚕 Taxi A: 3 € Grundgebühr + 1 € pro km. Taxi B: 2 € pro km. Bis 3 km ist B günstiger, danach A.",
    quizTitle: "Quiz", quizIntro: "10 Fragen: m und b ablesen, die passende Gerade, m aus zwei Punkten, Punktprobe, Nullstelle, Tarife.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`, score: (c: number) => `${c} von 10 richtig`,
    grid: "Koordinatensystem mit Gerade",
  },
  en: {
    title: "Linear functions", subtitle: "y = m·x + b: slope, intercept, lines",
    second: "Second line", probe: "Is the point on the line?",
    twoTitle: "A line through two points", twoHint: "Tap two grid points. A third tap starts again.",
    bad: "Please type numbers or fractions, e.g. 2, −1.5 or 2/3.",
    zero: (x: string) => `Zero: the line crosses the x-axis at x = ${x}.`,
    noZero: "No zero: the line is flat and never touches the x-axis.",
    examples: [["📈 y = 2x − 1", "2", "-1", null], ["🎯 Slope 2/3", "2/3", "1", null], ["0️⃣ Proportional", "1/2", "0", null], ["⏸️ Parallel", "2", "1", ["2", "-3"]], ["🚕 Taxi", "1", "3", ["2", "0"]]] as Array<[string, string, string, [string, string] | null]>,
    taxi: "🚕 Taxi A: 3 € fixed + 1 € per km. Taxi B: 2 € per km. Up to 3 km B is cheaper, after that A.",
    quizTitle: "Quiz", quizIntro: "10 questions: read m and b, the matching line, m from two points, is the point on it, the zero, tariffs.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`, score: (c: number) => `${c} out of 10 right`,
    grid: "Coordinate grid with a line",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

let lang: Lang = getLang();
let second = false;
let taxi = false;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const input = (id: string) => $<HTMLInputElement>(id);
const VIEW = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
const P = (q: { x: Rational; y: Rational }): GridPoint => ({ x: toNumber(q.x), y: toNumber(q.y) });
/** A Rational the way a child types it: 2,5 in German, 2.5 in English, 2/3 either way. */
const show = (q: Rational) => (q.d === 1 || ![2, 4, 5, 10].includes(q.d) ? num(q).replace("−", "-") : String(q.n / q.d).replace(".", lang === "de" ? "," : "."));

// ---------- the explorer ----------

const exploreGrid = new CoordGrid($("explore") as unknown as SVGSVGElement, VIEW);

function readLine(mId: string, bId: string): Line | null {
  const m = parseRational(input(mId).value), b = parseRational(input(bId).value);
  return m && b ? { m, b } : null;
}

/** The slope triangle from (0 | b): run to the right, then rise up (or down). */
function drawTriangle(g: CoordGrid, l: Line): void {
  const { run, rise } = slopeTriangle(l);
  if (rise === 0 || run > 6) return;
  const start = { x: 0, y: toNumber(l.b) };
  const corner = { x: run, y: start.y };
  const end = { x: run, y: start.y + rise };
  if ([corner.y, end.y].some((y) => y < VIEW.yMin || y > VIEW.yMax)) return;
  g.segment(start, corner, COLOURS.c, 2, "5 4").segment(corner, end, COLOURS.c, 2, "5 4");
  g.text({ x: run / 2, y: start.y }, String(run), COLOURS.c, 0, rise > 0 ? 15 : -7);
  g.text({ x: run, y: start.y + rise / 2 }, String(Math.abs(rise)), COLOURS.c, 8, 4, "start");
}

function renderExplore(): void {
  const l = readLine("m", "b");
  const l2 = second ? readLine("m2", "b2") : null;
  const err = $("error");
  err.hidden = !!l && (!second || !!l2);
  err.textContent = t().bad;
  const g = exploreGrid.begin();
  if (l) {
    $("equation").textContent = lineText(l);
    g.line(toNumber(l.m), toNumber(l.b), COLOURS.a);
    drawTriangle(g, l);
    g.dot({ x: 0, y: toNumber(l.b) }, COLOURS.b, "b");
    const z = zeroOf(l);
    if (z.kind === "point" && Math.abs(toNumber(z.x)) <= 6) g.dot({ x: toNumber(z.x), y: 0 }, COLOURS.c);
    const facts = [slopeText(l, lang), interceptText(l, lang), z.kind === "point" ? t().zero(num(z.x)) : z.kind === "none" ? t().noZero : zeroSteps(l, lang)[0]!];
    if (second && l2 && taxi) facts.push(t().taxi);
    $("facts").replaceChildren(...facts.map((f) => el("li", f)));
  } else {
    $("facts").replaceChildren();
  }
  if (second && l2) {
    g.line(toNumber(l2.m), toNumber(l2.b), COLOURS.d);
    if (l) {
      const r = meet(l, l2);
      if (r.kind === "point") g.dot(P(r.at), COLOURS.ink, "S");
      $("meet").replaceChildren(...meetSteps(l, l2, lang).map((s) => el("li", s)));
    }
  }
  $("meet").hidden = !(second && l && l2);
  // Punktprobe
  const px = parseRational(input("px").value), py = parseRational(input("py").value);
  const hasP = l && input("px").value.trim() !== "" && input("py").value.trim() !== "" && px && py;
  if (hasP) {
    const p = { x: px, y: py };
    g.dot(P(p), onLine(l, p) ? COLOURS.c : COLOURS.hit, "P", 7);
    $("probe-steps").replaceChildren(...probeSteps(l, p, lang).map((s) => el("li", s)));
  } else {
    $("probe-steps").replaceChildren();
  }
  g.end();
  $("second-knobs").hidden = !second;
  $("second-toggle").setAttribute("aria-pressed", String(second));
}

for (const id of ["m", "b", "m2", "b2", "px", "py"]) input(id).addEventListener("input", () => {
  if (id !== "px" && id !== "py") taxi = false;
  renderExplore();
});
document.querySelectorAll<HTMLButtonElement>("[data-knob]").forEach((btn) =>
  btn.addEventListener("click", () => {
    const [id, dir] = btn.dataset.knob!.split(",");
    const v = parseRational(input(id!).value) ?? rat(0);
    input(id!).value = show(add(v, rat(Number(dir), 2)));
    taxi = false;
    renderExplore();
  }),
);
$("second-toggle").addEventListener("click", () => {
  second = !second;
  if (second && input("m2").value === "") {
    input("m2").value = "-1";
    input("b2").value = "4";
  }
  renderExplore();
});

// ---------- two points ----------

const twoGrid = new CoordGrid($("two") as unknown as SVGSVGElement, VIEW);
let picked: GridPoint[] = [];
function renderTwo(): void {
  const g = twoGrid.begin();
  const [p, q] = picked.map((a) => ({ x: rat(a.x), y: rat(a.y) })) as [RPoint | undefined, RPoint | undefined];
  if (p && q) {
    const r = throughPoints(p, q);
    if (r.kind === "line") {
      g.line(toNumber(r.line.m), toNumber(r.line.b), COLOURS.a);
      const corner = { x: toNumber(q.x), y: toNumber(p.y) };
      g.segment(P(p), corner, COLOURS.c, 2, "5 4").segment(corner, P(q), COLOURS.c, 2, "5 4");
      g.text({ x: (toNumber(p.x) + corner.x) / 2, y: corner.y }, `Δx = ${num(add(q.x, { n: -p.x.n, d: p.x.d }))}`, COLOURS.c, 0, 16);
      g.text({ x: corner.x, y: (corner.y + toNumber(q.y)) / 2 }, `Δy = ${num(add(q.y, { n: -p.y.n, d: p.y.d }))}`, COLOURS.c, 8, 4, "start");
    } else if (r.kind === "vertical") {
      g.segment({ x: toNumber(r.x), y: VIEW.yMin }, { x: toNumber(r.x), y: VIEW.yMax }, COLOURS.hit, 3, "6 5");
    }
    $("two-steps").replaceChildren(...twoPointSteps(p, q, lang).map((s) => el("li", s)));
  } else {
    $("two-steps").replaceChildren(...(p ? [el("li", pointText(p, lang, "P"))] : []));
  }
  picked.forEach((a, i) => g.dot(a, COLOURS.b, i === 0 ? "P" : "Q"));
  g.end();
}
twoGrid.onTap((a) => {
  picked = picked.length >= 2 ? [a] : [...picked, a];
  renderTwo();
});

// ---------- quiz ----------

function quizPicture(q: FunctionQuestion, answered: boolean): Node | null {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "quiz-grid");
  const g = new CoordGrid(svg, VIEW, t().grid).begin();
  const draw = (l: Line, colour: string = COLOURS.a) => g.line(toNumber(l.m), toNumber(l.b), colour);
  switch (q.kind) {
    case "readM":
    case "readB":
      draw(q.line);
      if (answered) {
        if (q.kind === "readM") drawTriangle(g, q.line);
        g.dot({ x: 0, y: toNumber(q.line.b) }, COLOURS.b, "b");
      }
      break;
    case "pickGraph": {
      const colours = [COLOURS.a, COLOURS.b, COLOURS.c, COLOURS.d];
      // Each label goes on its own line at the first x where it fits on the grid and isn't
      // next to another label.
      const placed: GridPoint[] = [];
      q.options.forEach((l, i) => {
        draw(l, answered && i !== q.answer ? COLOURS.miss : colours[i]!);
        const m = toNumber(l.m), b = toNumber(l.b);
        const spots = [4.8, -4.8, 3.2, -3.2, 1.8, -1.8, 5.5, -5.5].map((x) => ({ x, y: m * x + b })).filter((p) => Math.abs(p.y) <= 5.4);
        const at = spots.find((p) => placed.every((q2) => Math.hypot(p.x - q2.x, p.y - q2.y) > 1.6)) ?? spots[0] ?? { x: 0, y: b };
        placed.push(at);
        g.text(at, ["①", "②", "③", "④"][i]!, colours[i]!, 0, -8, "middle", 17);
      });
      break;
    }
    case "twoPoints":
      if (answered) draw(q.line);
      g.dot(P(q.p), COLOURS.b, "P").dot(P(q.q), COLOURS.b, "Q");
      break;
    case "probe":
    case "zero":
      if (!answered) return null;
      draw(q.line);
      if (q.kind === "probe") g.dot(P(q.p), onLine(q.line, q.p) ? COLOURS.c : COLOURS.hit, "P");
      else {
        const z = zeroOf(q.line);
        if (z.kind === "point" && Math.abs(toNumber(z.x)) <= 6) g.dot({ x: toNumber(z.x), y: 0 }, COLOURS.c);
      }
      break;
    case "tariff":
      return null;
  }
  g.end();
  return svg;
}

const quiz = mountQuiz<FunctionQuestion>({
  host: $("quiz"),
  colour: "c-linfunc",
  makeRound: () => makeFunctionRound(Math.random),
  prompt: (q, l) => quizPrompt(q, l),
  choices: (q, l) => q.choices.map((c) => quizChoice(q, c, l)),
  answer: (q) => q.answer,
  steps: (q, l) => quizSteps(q, l),
  picture: (q, _l, answered) => quizPicture(q, answered),
  columns: (q) => (q.kind === "pickGraph" ? 4 : undefined),
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: UI[l].wrong, score: (c) => UI[l].score(c) }),
});

// ---------- wiring ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("sep").textContent = lang === "de" ? "|" : ",";
  $("examples").replaceChildren(...t().examples.map(([label, m, b, two]) => {
    const btn = el("button", label, "chip") as HTMLButtonElement;
    btn.type = "button";
    btn.addEventListener("click", () => {
      input("m").value = show(parseRational(m)!);
      input("b").value = show(parseRational(b)!);
      second = !!two;
      taxi = label.includes("🚕");
      if (two) {
        input("m2").value = two[0];
        input("b2").value = two[1];
      }
      renderExplore();
    });
    return btn;
  }));
  // Rewrite decimals in the boxes the language's way.
  for (const id of ["m", "b", "m2", "b2", "px", "py"]) {
    const v = parseRational(input(id).value);
    if (v && input(id).value.trim() !== "") input(id).value = show(v);
  }
  renderExplore();
  renderTwo();
  quiz.render(lang);
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

input("m").value = "2";
input("b").value = "-1";
render();
