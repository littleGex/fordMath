import "./sw-register";
import "../styles/zone.css";
import "../styles/quadratic.css";
import { evaluateQuadratic, solveQuadratic, type QuadraticSolution } from "../lib";
import { parseCoefficient, prettyNumber as n } from "../parse";
import { explainQuadratic, formatEquation, formatRoots } from "../explain/quadratic";
import { renderSections } from "./render";

const NAMES = ["a", "b", "c"] as const;
type Name = (typeof NAMES)[number]; // "a" | "b" | "c"

const inputs = Object.fromEntries(
  NAMES.map((k) => [k, document.querySelector<HTMLInputElement>(`#coef-${k}`)!]),
) as Record<Name, HTMLInputElement>;
const $ = (id: string) => document.getElementById(id)!;
const plot = document.querySelector<SVGSVGElement>("#plot")!;

// ---- plot ----
const NS = "http://www.w3.org/2000/svg";
function el(tag: string, attrs: Record<string, string | number>, text?: string): SVGElement {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  plot.appendChild(node);
  return node;
}

function drawPlot(s: QuadraticSolution): void {
  plot.replaceChildren();
  const { a, b, c, roots, parabola } = s;

  // Choose the x window: centred on the vertex, wide enough for the curve to rise
  // 1.5× the vertex's distance from the axis, which keeps any real roots on screen.
  let centre = 0;
  let halfWidth = 5;
  if (parabola) {
    centre = parabola.vertex.x;
    halfWidth = Math.sqrt((Math.max(Math.abs(parabola.vertex.y), 1) * 1.5) / Math.abs(a));
  } else if (roots.kind === "linear") {
    centre = roots.root;
    halfWidth = 5 + Math.abs(centre) * 0.5;
  }
  const x0 = centre - halfWidth;
  const x1 = centre + halfWidth;

  const N = 160;
  const xs = Array.from({ length: N + 1 }, (_, i) => x0 + (i / N) * (x1 - x0));
  const ys = xs.map((x) => evaluateQuadratic(a, b, c, x));
  let y0 = Math.min(0, ...ys);
  let y1 = Math.max(0, ...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.14;
  y0 -= pad;
  y1 += pad;

  const L = 20, R = 580, T = 20, B = 360;
  const X = (x: number) => L + ((x - x0) / (x1 - x0)) * (R - L);
  const Y = (y: number) => B - ((y - y0) / (y1 - y0)) * (B - T);
  const anchor = (px: number) => (px < 130 ? "start" : px > 470 ? "end" : "middle");

  // axes
  el("line", { x1: L, x2: R, y1: Y(0), y2: Y(0), stroke: "#3a4a6c", "stroke-width": 3 });
  el("text", { x: R, y: Y(0) - 10, "text-anchor": "end" }, "x");
  if (x0 < 0 && x1 > 0) {
    el("line", { x1: X(0), x2: X(0), y1: T, y2: B, stroke: "#3a4a6c", "stroke-width": 3 });
    el("text", { x: X(0) + 10, y: T + 18 }, "y");
  }

  // curve
  const d = xs.map((x, i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(ys[i]!).toFixed(1)}`).join("");
  el("path", { d, fill: "none", stroke: "#ffb347", "stroke-width": 4, "stroke-linejoin": "round" });

  // roots: two roots get labels pushed outwards, on the side of the axis the curve isn't on
  const opensUp = !parabola || parabola.opens === "up";
  const real =
    roots.kind === "two-real" ? roots.roots
    : roots.kind === "repeated" || roots.kind === "linear" ? [roots.root]
    : [];
  real.forEach((r, i) => {
    const px = X(r);
    el("circle", { cx: px, cy: Y(0), r: 8, fill: "#141c2e", stroke: "#eef3fb", "stroke-width": 3 });
    const label = `x = ${n(r)}`;
    if (real.length === 2) {
      const outward = i === 0 ? "end" : "start";
      const lx = px + (i === 0 ? -14 : 14);
      const fits = outward === "end" ? lx > 140 : lx < 460;
      el("text", {
        x: fits ? lx : px,
        y: opensUp ? Y(0) + 32 : Y(0) - 16,
        "text-anchor": fits ? outward : anchor(px),
        class: "lbl-root",
      }, label);
    } else {
      el("text", { x: px, y: opensUp ? Y(0) - 18 : Y(0) + 34, "text-anchor": anchor(px), class: "lbl-root" }, label);
    }
  });
  if (parabola && real.length === 0) {
    el("text", { x: 300, y: opensUp ? Y(0) - 16 : Y(0) + 32, "text-anchor": "middle" }, "never crosses the x-axis");
  }

  // vertex
  if (parabola) {
    const { x: h, y: k } = parabola.vertex;
    el("circle", { cx: X(h), cy: Y(k), r: 8, fill: "#b967ff" });
    el("text", { x: X(h), y: opensUp ? Y(k) + 32 : Y(k) - 18, "text-anchor": anchor(X(h)), class: "lbl-vertex" }, `(${n(h)}, ${n(k)})`);
  }
}

// ---- results ----
function describeD(s: QuadraticSolution): string {
  if (s.discriminant === null) return "not a quadratic";
  if (s.discriminant > 0) return "positive: two real roots";
  if (s.discriminant === 0) return "zero: one repeated root";
  return "negative: complex roots";
}

function update(): void {
  try {
    const [a, b, c] = NAMES.map((k) => parseCoefficient(inputs[k].value, k)) as [number, number, number];
    const s = solveQuadratic(a, b, c);

    $("equation").textContent = formatEquation(a, b, c);
    $("out-roots").textContent = formatRoots(s.roots);
    $("out-d").textContent = s.discriminant === null ? "–" : n(s.discriminant);
    $("out-d-note").textContent = describeD(s);
    $("out-vertex").textContent = s.parabola ? `(${n(s.parabola.vertex.x)}, ${n(s.parabola.vertex.y)})` : "–";
    $("out-vertex-note").textContent = s.parabola
      ? s.parabola.opens === "up" ? "lowest point, opens up ∪" : "highest point, opens down ∩"
      : "straight line, no vertex";

    drawPlot(s);
    renderSections($("explain"), explainQuadratic(a, b, c), "c-quadratic");
    $("error").hidden = true;
  } catch (e) {
    for (const id of ["out-roots", "out-d", "out-vertex"]) $(id).textContent = "–";
    for (const id of ["out-d-note", "out-vertex-note"]) $(id).textContent = "";
    plot.replaceChildren();
    $("explain").replaceChildren();
    $("error").textContent = e instanceof Error ? e.message : String(e);
    $("error").hidden = false;
  }
}

// ---- events ----
for (const k of NAMES) inputs[k].addEventListener("input", update);

document.querySelectorAll<HTMLButtonElement>("[data-flip]").forEach((btn) =>
  btn.addEventListener("click", () => {
    const input = inputs[btn.dataset.flip as Name];
    const v = input.value.trim();
    input.value = v.startsWith("-") || v.startsWith("−") ? v.slice(1) : `-${v}`;
    update();
  }),
);

document.querySelectorAll<HTMLButtonElement>("[data-abc]").forEach((btn) =>
  btn.addEventListener("click", () => {
    const values = (btn.dataset.abc ?? "").split(",");
    NAMES.forEach((k, i) => (inputs[k].value = values[i] ?? "0"));
    update();
  }),
);

update();
