import "./sw-register";
import "../styles/zone.css";
import "../styles/function.css";
import { ExpressionError, FUNCTIONS, evaluate, formatExpr, parse, type Expr } from "../lib/expression";
import { parseCoefficient, prettyFor } from "../parse";
import { explainExpression, problemText } from "../explain/expression";
import type { Lang } from "../explain/lang";
import { renderSections } from "./render";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Funktionen", subtitle: "Tipp ein beliebiges f(x) ein, sieh den Graphen und berechne Werte",
    flip: "Vorzeichen umdrehen", from: "Graph von", to: "bis", value: "Wert", plotLabel: "Graph von f(x)", kPoint: "der Punkt (x | f(x))",
    howTitle: "So wird gerechnet", helpTitle: "Was kann ich eintippen?",
    hNumbers: "Zahlen", hNumbersText: "3, 2.5, .5, 1e3 (Dezimalpunkt, weil das Komma hier nicht geht)", hVar: "Die Variable",
    hOps: "Rechenzeichen", hOpsText: "+ − × ÷ ^ (auch * / und **) und Klammern", hConst: "Konstanten", hConstText: "pi (oder π) und e",
    hFns: "Funktionen", hShort: "Abkürzungen", hShortText: "2x heißt 2 · x, 3(x + 1) und 2sin(x) gehen auch, und x² heißt x^2",
    readAs: "Gelesen als", undefinedValue: "nicht definiert", noValues: "keine reellen Werte in diesem Bereich",
    xName: "x", fromName: "den Anfang des Graphen", toName: "das Ende des Graphen", same: "Der Graph braucht zwei verschiedene x-Werte für von und bis.",
    point: (x: string, y: string) => `(${x} | ${y})`,
  },
  en: {
    title: "Functions", subtitle: "Type any f(x), see its graph and work out its value",
    flip: "Flip the sign", from: "graph from", to: "to", value: "Value", plotLabel: "Graph of f(x)", kPoint: "the point (x, f(x))",
    howTitle: "How it's worked out", helpTitle: "What can I type?",
    hNumbers: "Numbers", hNumbersText: "3, 2.5, .5, 1e3", hVar: "The variable",
    hOps: "Operators", hOpsText: "+ − × ÷ ^ (also * / and **), and brackets", hConst: "Constants", hConstText: "pi (or π) and e",
    hFns: "Functions", hShort: "Shortcuts", hShortText: "2x means 2 × x, 3(x + 1) and 2sin(x) work too, and x² means x^2",
    readAs: "Read as", undefinedValue: "undefined", noValues: "no real values in this range",
    xName: "x", fromName: "the start of the graph", toName: "the end of the graph", same: "The graph needs two different x values to go from and to.",
    point: (x: string, y: string) => `(${x}, ${y})`,
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];
let lang: Lang = getLang();
const t = () => UI[lang];
let n = prettyFor(lang);

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const exprInput = $<HTMLInputElement>("expr");
const xAt = $<HTMLInputElement>("x-at");
const xFrom = $<HTMLInputElement>("x-from");
const xTo = $<HTMLInputElement>("x-to");
const plot = document.querySelector<SVGSVGElement>("#plot")!;

$("fn-list").textContent = Object.keys(FUNCTIONS).join(", ");

// ---- plot ----
const NS = "http://www.w3.org/2000/svg";
function el(tag: string, attrs: Record<string, string | number>, text?: string): SVGElement {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  plot.appendChild(node);
  return node;
}

/** Value at the given fraction through a sorted list, e.g. 0.05 → near the smallest 5%. */
const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;

function drawPlot(tree: Expr, x0: number, x1: number, x: number, fx: number): void {
  plot.replaceChildren();
  const N = 400;
  const xs = Array.from({ length: N + 1 }, (_, i) => x0 + (i / N) * (x1 - x0));
  const ys = xs.map((v) => evaluate(tree, v));
  const finite = ys.filter(Number.isFinite).sort((a, b) => a - b);

  const L = 20, R = 580, T = 20, B = 360;
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (R - L);

  if (finite.length === 0) {
    el("text", { x: 300, y: 190, "text-anchor": "middle" }, t().noValues);
    return;
  }
  // Ignore the most extreme 3% at each end so tan(x) and 1/x don't flatten everything else.
  let y0 = Math.min(0, quantile(finite, 0.03));
  let y1 = Math.max(0, quantile(finite, 0.97));
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.12;
  y0 -= pad;
  y1 += pad;
  const Y = (v: number) => B - ((v - y0) / (y1 - y0)) * (B - T);
  const span = y1 - y0;

  // axes
  if (y0 < 0 && y1 > 0) el("line", { x1: L, x2: R, y1: Y(0), y2: Y(0), stroke: "#3a4a6c", "stroke-width": 3 });
  if (x0 < 0 && x1 > 0) el("line", { x1: X(0), x2: X(0), y1: T, y2: B, stroke: "#3a4a6c", "stroke-width": 3 });
  el("text", { x: L, y: B + 0, "text-anchor": "start", dy: -6 }, n(x0));
  el("text", { x: R, y: B + 0, "text-anchor": "end", dy: -6 }, n(x1));

  // curve, broken where f is undefined or jumps off the chart (asymptotes)
  const clip = el("clipPath", { id: "chart" });
  const clipRect = document.createElementNS(NS, "rect");
  for (const [k, v] of Object.entries({ x: L, y: T - 10, width: R - L, height: B - T + 20 })) clipRect.setAttribute(k, String(v));
  clip.appendChild(clipRect);

  let d = "";
  let penDown = false; // false = the next point starts a new piece of line ("M"), true = continue it ("L")
  for (let i = 0; i <= N; i++) {
    const y = ys[i]!;
    const onChart = Number.isFinite(y) && y > y0 - span && y < y1 + span;
    if (!onChart) {
      penDown = false;
      continue;
    }
    if (penDown && Math.abs(y - ys[i - 1]!) > span) penDown = false; // a jump, like tan(x) at π/2
    d += `${penDown ? "L" : "M"}${X(xs[i]!).toFixed(1)} ${Y(y).toFixed(1)}`;
    penDown = true;
  }
  el("path", { d, fill: "none", stroke: "#ffd84d", "stroke-width": 4, "stroke-linejoin": "round", "clip-path": "url(#chart)" });

  // the chosen point
  if (Number.isFinite(fx) && x >= x0 && x <= x1 && fx >= y0 && fx <= y1) {
    const px = X(x), py = Y(fx);
    el("circle", { cx: px, cy: py, r: 8, fill: "#eef3fb" });
    const anchor = px < 130 ? "start" : px > 470 ? "end" : "middle";
    el("text", { x: px, y: py < 60 ? py + 32 : py - 16, "text-anchor": anchor, class: "lbl-point" }, t().point(n(x), n(fx)));
  }
}

// ---- error with a caret under the problem ----
function showError(text: string, e: unknown): void {
  const box = $("caret-box");
  $("error").textContent = e instanceof ExpressionError ? problemText(e.problem, lang, e.message) : e instanceof Error ? e.message : String(e);
  if (e instanceof ExpressionError && text.trim() !== "") {
    const pre = $("caret");
    pre.replaceChildren(document.createTextNode(text + "\n" + " ".repeat(e.index)), Object.assign(document.createElement("b"), { textContent: "^" }));
    pre.hidden = false;
  } else {
    $("caret").hidden = true;
  }
  box.hidden = false;
}

// ---- update ----
function update(): void {
  const text = exprInput.value;
  let tree: Expr;
  try {
    tree = parse(text);
  } catch (e) {
    showError(text, e);
    $("read").textContent = "";
    $("fx-value").textContent = "–";
    plot.replaceChildren();
    $("explain").replaceChildren();
    return;
  }
  $("caret-box").hidden = true;
  $("read").textContent = `${t().readAs}: ${formatExpr(tree)}`;

  try {
    const x = parseCoefficient(xAt.value, t().xName, lang);
    let x0 = parseCoefficient(xFrom.value, t().fromName, lang);
    let x1 = parseCoefficient(xTo.value, t().toName, lang);
    if (x0 === x1) throw new Error(t().same);
    if (x0 > x1) [x0, x1] = [x1, x0];

    const fx = evaluate(tree, x);
    $("fx-label").textContent = `f(${n(x)})`;
    $("fx-value").textContent = Number.isFinite(fx) ? n(fx) : Number.isNaN(fx) ? t().undefinedValue : "∞";
    drawPlot(tree, x0, x1, x, fx);
    renderSections($("explain"), explainExpression(text, x, lang), "c-func");
  } catch (e) {
    showError("", e);
  }
}

// ---- events ----
for (const input of [exprInput, xAt, xFrom, xTo]) input.addEventListener("input", update);

document.querySelectorAll<HTMLButtonElement>("[data-expr]").forEach((b) =>
  b.addEventListener("click", () => {
    exprInput.value = b.dataset.expr ?? "";
    update();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-flip]").forEach((b) =>
  b.addEventListener("click", () => {
    const input = $<HTMLInputElement>(b.dataset.flip!);
    const v = input.value.trim();
    input.value = v.startsWith("-") || v.startsWith("−") ? v.slice(1) : `-${v}`;
    update();
  }),
);

// ---- language ----
function render(): void {
  n = prettyFor(lang);
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<Element>("[data-t-label]").forEach((e) => e.setAttribute("aria-label", t()[e.getAttribute("data-t-label") as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  update();
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

render();
