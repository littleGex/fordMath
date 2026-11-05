import "../styles/zone.css";
import "../styles/function.css";
import { ExpressionError, FUNCTIONS, evaluate, formatExpr, parse, type Expr } from "../lib/expression";
import { parseCoefficient, prettyNumber as n } from "../parse";
import { explainExpression } from "../explain/expression";
import { renderSections } from "./render";

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
    el("text", { x: 300, y: 190, "text-anchor": "middle" }, "no real values in this range");
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
    el("text", { x: px, y: py < 60 ? py + 32 : py - 16, "text-anchor": anchor, class: "lbl-point" }, `(${n(x)}, ${n(fx)})`);
  }
}

// ---- error with a caret under the problem ----
function showError(text: string, e: unknown): void {
  const box = $("caret-box");
  $("error").textContent = e instanceof Error ? e.message : String(e);
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
  $("read").textContent = `Read as: ${formatExpr(tree)}`;

  try {
    const x = parseCoefficient(xAt.value, "x");
    let x0 = parseCoefficient(xFrom.value, "the start of the graph");
    let x1 = parseCoefficient(xTo.value, "the end of the graph");
    if (x0 === x1) throw new Error("The graph needs two different x values to go from and to.");
    if (x0 > x1) [x0, x1] = [x1, x0];

    const fx = evaluate(tree, x);
    $("fx-label").textContent = `f(${n(x)})`;
    $("fx-value").textContent = Number.isFinite(fx) ? n(fx) : Number.isNaN(fx) ? "undefined" : "∞";
    drawPlot(tree, x0, x1, x, fx);
    renderSections($("explain"), explainExpression(text, x), "c-func");
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

update();
