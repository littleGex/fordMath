import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import { mountQuiz } from "./quiz";
import "../styles/umfang-flaeche.css";
import {
  AREA_UNITS, area, cellKey, makeAreaRound, outline, parseCell, perimeter, randomShape, rectangle, shapeOf,
  type AreaQuestion, type AreaUnit, type CellKey, type Shape,
} from "../lib/area";
import { mul, parseRational, rat } from "../lib/rational";
import { choiceText, explainRange, explainShape, inUnit, quizPrompt, quizSteps } from "../explain/area";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Umfang und Fläche", subtitle: "Auf Kästchenpapier: 1 Kästchen = 1 cm²",
    drawHint: "Tippe Kästchen an oder wische darüber, um eine Figur zu malen. Noch mal tippen macht es wieder weg.",
    areaName: "Flächeninhalt", perName: "Umfang", perSym: "U",
    count: "▶ Kanten zählen", rect: "Rechteck 4 × 3", lshape: "L-Form", random: "🎲 Zufallsfigur", clear: "Löschen",
    howTitle: "So rechnest du", sameTitle: "Gleicher Flächeninhalt, anderer Umfang",
    sameEmpty: "Male mindestens 2 Kästchen, die zusammenhängen. Probier mal 12 Kästchen: Wie klein und wie groß kann der Umfang werden?",
    empty: "Noch keine Kästchen.",
    unitsTitle: "Flächeneinheiten", unitsNote: "Von einer Einheit zur nächsten ist es immer 100: 1 cm² = 100 mm², weil 10 · 10 kleine Quadrate hineinpassen.",
    unitBad: "Bitte eine Zahl wie 3 oder 2,5 eingeben. Ganz kleine Reste unter 1 mm² gehen nicht.",
    quizTitle: "Quiz", quizIntro: "10 Fragen: Kästchen zählen, Rechtecke berechnen, Einheiten umwandeln.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`,
    score: (c: number) => `${c} von 10 richtig`, grid: (a: number, u: number) => `Figur mit ${a} Kästchen und Umfang ${u} cm`,
  },
  en: {
    title: "Perimeter and area", subtitle: "On squared paper: 1 square = 1 cm²",
    drawHint: "Tap squares or swipe across them to draw a shape. Tap again to take one away.",
    areaName: "Area", perName: "Perimeter", perSym: "P",
    count: "▶ Count the sides", rect: "Rectangle 4 × 3", lshape: "L-shape", random: "🎲 Random shape", clear: "Clear",
    howTitle: "How it's worked out", sameTitle: "Same area, different perimeter",
    sameEmpty: "Draw at least 2 joined squares. Try 12 squares: how small and how big can the perimeter get?",
    empty: "No squares yet.",
    unitsTitle: "Area units", unitsNote: "From one unit to the next is always 100: 1 cm² = 100 mm², because 10 · 10 small squares fit inside.",
    unitBad: "Please type a number like 3 or 2.5. Tiny bits under 1 mm² don't work.",
    quizTitle: "Quiz", quizIntro: "10 questions: count squares, work out rectangles, convert units.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`,
    score: (c: number) => `${c} out of 10 right`, grid: (a: number, u: number) => `Shape with ${a} squares and perimeter ${u} cm`,
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const COLS = 10;
const ROWS = 8;
const CELL = 36;
const NS = "http://www.w3.org/2000/svg";

let lang: Lang = getLang();
let shape = new Set<CellKey>(rectangle(4, 3, 2, 3));
let unit: AreaUnit = "cm²";
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const svgEl = (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (text !== undefined) n.textContent = text;
  return n;
};

// ---------- drawing a shape on the grid ----------

/** Squares, grid lines and the outline; `counted` edges get a number next to them. */
function drawShape(svg: SVGSVGElement, s: Shape, cols: number, rows: number, size: number, counted = 0): void {
  svg.setAttribute("viewBox", `-6 -6 ${cols * size + 12} ${rows * size + 12}`);
  const nodes: SVGElement[] = [svgEl("rect", { x: 0, y: 0, width: cols * size, height: rows * size, class: "paper" })];
  for (const key of s) {
    const [r, c] = parseCell(key);
    nodes.push(svgEl("rect", { x: c * size, y: r * size, width: size, height: size, class: "cell" }));
  }
  for (let c = 0; c <= cols; c++) nodes.push(svgEl("line", { x1: c * size, x2: c * size, y1: 0, y2: rows * size, class: "line" }));
  for (let r = 0; r <= rows; r++) nodes.push(svgEl("line", { x1: 0, x2: cols * size, y1: r * size, y2: r * size, class: "line" }));
  let n = 0;
  for (const walk of outline(s)) {
    for (const e of walk) {
      n++;
      const lit = n <= counted;
      nodes.push(svgEl("line", { x1: e.x1 * size, y1: e.y1 * size, x2: e.x2 * size, y2: e.y2 * size, class: `edge${lit ? " lit" : ""}` }));
      if (lit) {
        // The number sits just outside the shape: to the left of the direction of travel.
        const [dx, dy] = [e.x2 - e.x1, e.y2 - e.y1];
        nodes.push(svgEl("text", { x: ((e.x1 + e.x2) / 2 + dy * 0.28) * size, y: ((e.y1 + e.y2) / 2 - dx * 0.28) * size, class: "edge-n" }, String(n)));
      }
    }
  }
  svg.replaceChildren(...nodes);
}

const gridSvg = $("grid") as unknown as SVGSVGElement;
let counting = 0;
let countTimer: number | undefined;

function stopCounting(): void {
  window.clearTimeout(countTimer);
  counting = 0;
}

function renderShape(): void {
  drawShape(gridSvg, shape, COLS, ROWS, CELL, counting);
  const A = area(shape);
  const U = perimeter(shape);
  gridSvg.setAttribute("aria-label", t().grid(A, U));
  $("area-value").textContent = `${A} cm²`;
  $("per-value").textContent = `${U} cm`;
  $("per-sym").textContent = t().perSym;
  const steps = explainShape(shape, lang);
  $("shape-steps").replaceChildren(...(steps.length ? steps : [t().empty]).map((s) => el("li", s)));
  const range = explainRange(shape, lang);
  $("range").replaceChildren(...range.map((s) => el("li", s)));
  $("range").hidden = range.length === 0;
  $("range-empty").hidden = range.length > 0;
}

function cellAt(ev: PointerEvent): CellKey | null {
  const box = gridSvg.getBoundingClientRect();
  const scale = (COLS * CELL + 12) / box.width;
  const x = (ev.clientX - box.left) * scale - 6;
  const y = (ev.clientY - box.top) * scale - 6;
  const [c, r] = [Math.floor(x / CELL), Math.floor(y / CELL)];
  return c >= 0 && r >= 0 && c < COLS && r < ROWS ? cellKey(r, c) : null;
}

let paint: "add" | "remove" | null = null;
gridSvg.addEventListener("pointerdown", (ev) => {
  const k = cellAt(ev);
  if (!k) return;
  stopCounting();
  paint = shape.has(k) ? "remove" : "add";
  gridSvg.setPointerCapture(ev.pointerId);
  apply(k);
});
gridSvg.addEventListener("pointermove", (ev) => {
  if (!paint) return;
  const k = cellAt(ev);
  if (k) apply(k);
});
const endPaint = () => (paint = null);
gridSvg.addEventListener("pointerup", endPaint);
gridSvg.addEventListener("pointercancel", endPaint);

function apply(k: CellKey): void {
  if (paint === "add" && !shape.has(k)) shape.add(k);
  else if (paint === "remove" && shape.has(k)) shape.delete(k);
  else return;
  renderShape();
}

function setShape(s: Shape): void {
  stopCounting();
  shape = new Set(s);
  renderShape();
}

$("rect").addEventListener("click", () => setShape(rectangle(4, 3, 2, 3)));
$("lshape").addEventListener("click", () => setShape(shapeOf([[1, 3], [2, 3], [3, 3], [4, 3], [4, 4], [4, 5]])));
$("random").addEventListener("click", () => {
  const s = randomShape(4 + Math.floor(Math.random() * 9), Math.random, 6);
  // Move it into the middle of the paper.
  setShape(new Set([...s].map((k) => { const [r, c] = parseCell(k); return cellKey(r + 1, c + 2); })));
});
$("clear").addEventListener("click", () => setShape(new Set()));
$("count").addEventListener("click", () => {
  stopCounting();
  const total = perimeter(shape);
  if (total === 0) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tick = () => {
    counting++;
    renderShape();
    if (counting < total) countTimer = window.setTimeout(tick, 260);
  };
  if (reduce) {
    counting = total;
    renderShape();
  } else tick();
});

// ---------- area units ----------

function renderUnits(): void {
  $("unit-chips").replaceChildren(
    ...AREA_UNITS.map((u) => {
      const b = el("button", u.symbol, "chip") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("aria-pressed", String(u.symbol === unit));
      b.addEventListener("click", () => {
        unit = u.symbol;
        renderUnits();
      });
      return b;
    }),
  );
  const v = parseRational($<HTMLInputElement>("amount").value);
  const factor = AREA_UNITS.find((u) => u.symbol === unit)!.factor;
  const mm2 = v ? mul(v, rat(factor)) : null;
  const ok = mm2 !== null && mm2.d === 1 && mm2.n >= 0;
  $("unit-error").hidden = ok;
  $("unit-error").textContent = t().unitBad;
  $("unit-table").replaceChildren(
    ...AREA_UNITS.map((u) => {
      const cell = el("div", "", `unit-cell${u.symbol === unit ? " from" : ""}`);
      cell.append(el("b", u.symbol), el("span", ok ? inUnit(mm2.n, u.symbol, lang) : "–"));
      return cell;
    }),
  );
}
$("amount").addEventListener("input", renderUnits);

// ---------- quiz ----------

const quiz = mountQuiz<AreaQuestion>({
  host: $("quiz"),
  colour: "c-area",
  makeRound: () => makeAreaRound(Math.random),
  prompt: (q, l) => quizPrompt(q, l),
  choices: (q, l) => q.choices.map((c) => choiceText(q, c, l)),
  answer: (q) => q.answer,
  steps: (q, l) => quizSteps(q, l),
  picture: (q) => {
    if (q.kind !== "countArea" && q.kind !== "countPerimeter") return null;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "quiz-shape");
    svg.setAttribute("role", "img");
    drawShape(svg, q.shape, 6, 6, 30);
    return svg;
  },
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: (r) => UI[l].wrong(r), score: (c) => UI[l].score(c) }),
});

// ---------- language ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  renderShape();
  renderUnits();
  quiz.render(lang);
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

render();
