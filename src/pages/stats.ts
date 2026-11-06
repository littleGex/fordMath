import "./sw-register";
import "../styles/zone.css";
import "../styles/stats.css";
import { methods } from "../registry";
import { formatNumber as f, parseValues } from "../parse";
import { boxPlot, getStats, quartilePositions, type QuartileMethod, type Stats } from "../lib";
import { METHOD_NOTE, explainOutliers, explainQuartiles } from "../explain/quartiles";

const input = document.querySelector<HTMLTextAreaElement>("#values")!;
const errorBox = document.getElementById("error")!;
const results = document.getElementById("results")!;
const meta = document.getElementById("meta")!;
const plot = document.querySelector<SVGSVGElement>("#plot")!;
const explainBox = document.getElementById("explain")!;
const boxSvg = document.querySelector<SVGSVGElement>("#boxplot")!;
const qResults = document.getElementById("q-results")!;
const strip = document.getElementById("strip")!;
let quartileMethod: QuartileMethod = "halves";

// ---- build one result tile and (optionally) one explanation per registered method ----
const valueEls = new Map<string, HTMLElement>();
const stepLists = new Map<string, HTMLOListElement>();

for (const m of methods) {
  const tile = document.createElement("div");
  tile.className = `tile result ${m.colour}`;
  tile.innerHTML = `<span class="sym"></span><h3></h3><span class="value">–</span><p class="desc"></p>`;
  tile.querySelector(".sym")!.textContent = m.symbol;
  tile.querySelector("h3")!.textContent = m.label;
  tile.querySelector(".desc")!.textContent = m.description;
  valueEls.set(m.id, tile.querySelector(".value")!);
  results.appendChild(tile);

  if (m.explain) {
    const d = document.createElement("details");
    d.className = m.colour;
    d.id = `explain-${m.id}`;
    const s = document.createElement("summary");
    s.textContent = m.explainTitle ?? m.label;
    const ol = document.createElement("ol");
    d.append(s, ol);
    explainBox.appendChild(d);
    stepLists.set(m.id, ol);
  }
}
explainBox.querySelector("details")?.setAttribute("open", "");

const show = (r: number | number[]): string =>
  Array.isArray(r) ? (r.length ? r.map(f).join(", ") : "none") : f(r);

// ---- number line ----
const NS = "http://www.w3.org/2000/svg";
const L = 30, R = 570;
/** One scale for the number line and the box plot, so they line up. */
function scaleFor(values: readonly number[], s: Stats): (v: number) => number {
  let lo = Math.min(...values, s.mean - s.stdDev), hi = Math.max(...values, s.mean + s.stdDev);
  if (lo === hi) { lo -= 1; hi += 1; }
  return (v: number) => L + ((v - lo) / (hi - lo)) * (R - L);
}
const svgMaker = (svg: SVGSVGElement) => (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (text !== undefined) n.textContent = text;
  svg.appendChild(n);
  return n;
};

function drawPlot(values: readonly number[], s: Stats): void {
  plot.replaceChildren();
  const axisY = 152;
  const minV = Math.min(...values), maxV = Math.max(...values);
  const x = scaleFor(values, s);
  const el = svgMaker(plot);
  // mean ± σ band
  el("rect", {
    x: x(s.mean - s.stdDev), y: 68, width: Math.max(0, x(s.mean + s.stdDev) - x(s.mean - s.stdDev)), height: axisY - 68,
    rx: 6, fill: "#b967ff", "fill-opacity": 0.22,
  });
  el("line", { x1: L, x2: R, y1: axisY, y2: axisY, stroke: "#2c3a58", "stroke-width": 3, "stroke-linecap": "round" });
  el("text", { x: x(minV), y: axisY + 34, "text-anchor": "middle" }, f(minV));
  if (maxV !== minV) el("text", { x: x(maxV), y: axisY + 34, "text-anchor": "middle" }, f(maxV));

  el("line", { x1: x(s.mean), x2: x(s.mean), y1: 30, y2: axisY + 6, stroke: "#00d4ff", "stroke-width": 2.5, "stroke-dasharray": "5 4" });
  el("line", { x1: x(s.median), x2: x(s.median), y1: 58, y2: axisY + 6, stroke: "#ffb347", "stroke-width": 2.5 });
  const anchor = (px: number) => (px < 150 ? "start" : px > 450 ? "end" : "middle");
  el("text", { x: x(s.mean), y: 22, "text-anchor": anchor(x(s.mean)), class: "lbl-mean" }, `mean ${f(s.mean)}`);
  el("text", { x: x(s.median), y: 50, "text-anchor": anchor(x(s.median)), class: "lbl-median" }, `median ${f(s.median)}`);

  const stacked = new Map<number, number>();
  const modes = new Set(s.mode);
  for (const v of values) {
    const k = stacked.get(v) ?? 0;
    stacked.set(v, k + 1);
    el("circle", {
      cx: x(v), cy: axisY - 13 - k * 20, r: 9,
      fill: modes.has(v) ? "#eef3fb" : "#141c2e", stroke: "#eef3fb", "stroke-width": 2.5,
    });
  }
}

// ---- quartiles: tiles, the marked sorted list, the box plot ----
const qTiles = ([
  ["q1", "Q1", "Lower quartile", "A quarter of the values are below it."],
  ["q3", "Q3", "Upper quartile", "Three quarters are below it."],
  ["iqr", "IQR", "Interquartile range", "Q3 − Q1: how wide the middle half is."],
  ["out", "⚬", "Outliers", "Outside the 1.5 × IQR fences."],
] as const).map(([id, sym, label, desc]) => {
  const tile = document.createElement("div");
  tile.className = "tile result c-quartiles";
  tile.innerHTML = `<span class="sym"></span><h3></h3><span class="value">–</span><p class="desc"></p>`;
  tile.querySelector(".sym")!.textContent = sym;
  tile.querySelector("h3")!.textContent = label;
  tile.querySelector(".desc")!.textContent = desc;
  qResults.appendChild(tile);
  return [id, tile.querySelector<HTMLElement>(".value")!] as const;
});
const qValue = new Map(qTiles);

const quartileSections = (["Quartiles (Q1, Q3, IQR)", "Outliers and whiskers (1.5 × IQR)"] as const).map((title) => {
  const d = document.createElement("details");
  d.className = "c-quartiles";
  const sum = document.createElement("summary");
  sum.textContent = title;
  const ol = document.createElement("ol");
  d.append(sum, ol);
  explainBox.appendChild(d);
  return ol;
});

function drawStrip(sorted: readonly number[], outliers: ReadonlySet<number>): void {
  const pos = quartilePositions(sorted.length, quartileMethod);
  const marks: Array<[number, string, string]> = [[pos.q1, "Q1", "#ff7043"], [pos.q2, "M", "#ffb347"], [pos.q3, "Q3", "#ff7043"]];
  const tagsAt = (test: (p: number) => boolean) => marks.filter(([p]) => test(p));
  const tagEl = (tags: Array<[number, string, string]>) =>
    Object.assign(document.createElement("span"), { className: "tag", textContent: tags.map(([, t]) => t).join(" ") });
  const items: HTMLElement[] = [];
  sorted.forEach((v, i) => {
    const here = tagsAt((p) => p === i);
    const cell = document.createElement("span");
    cell.className = `cell${here.length ? " on" : ""}${outliers.has(v) ? " out" : ""}`;
    if (here.length) cell.style.setProperty("--mark", here[0]![2]);
    cell.append(Object.assign(document.createElement("b"), { textContent: f(v) }), tagEl(here));
    items.push(cell);
    const between = tagsAt((p) => p > i && p < i + 1);
    if (between.length) {
      const gap = document.createElement("span");
      gap.className = "gap";
      gap.style.setProperty("--mark", between[0]![2]);
      gap.append(document.createElement("i"), tagEl(between));
      items.push(gap);
    }
  });
  strip.replaceChildren(...items);
}

function drawBoxPlot(values: readonly number[], s: Stats): void {
  boxSvg.replaceChildren();
  const b = boxPlot(values, quartileMethod);
  const x = scaleFor(values, s);
  const el = svgMaker(boxSvg);
  const mid = 52, h = 46;
  const line = (x1: number, x2: number, y1: number, y2: number, colour = "#eef3fb", width = 2.5) =>
    el("line", { x1, x2, y1, y2, stroke: colour, "stroke-width": width, "stroke-linecap": "round" });
  line(x(b.whiskerLow), x(b.q1), mid, mid);
  line(x(b.q3), x(b.whiskerHigh), mid, mid);
  line(x(b.whiskerLow), x(b.whiskerLow), mid - 14, mid + 14);
  line(x(b.whiskerHigh), x(b.whiskerHigh), mid - 14, mid + 14);
  el("rect", {
    x: x(b.q1), y: mid - h / 2, width: Math.max(2, x(b.q3) - x(b.q1)), height: h, rx: 6,
    fill: "#ff7043", "fill-opacity": 0.28, stroke: "#ff7043", "stroke-width": 2.5,
  });
  line(x(b.q2), x(b.q2), mid - h / 2, mid + h / 2, "#ffb347", 4);
  for (const o of b.outliers) el("circle", { cx: x(o), cy: mid, r: 8, fill: "#ff5566", "fill-opacity": 0.35, stroke: "#ff5566", "stroke-width": 2.5 });

  // Labels under the plot; one is left out where it would sit on top of its neighbour.
  const labels: Array<[number, string, string]> = [
    [b.q2, f(b.q2), "lbl-median"], [b.q1, f(b.q1), "lbl-q"], [b.q3, f(b.q3), "lbl-q"],
    [b.whiskerLow, f(b.whiskerLow), ""], [b.whiskerHigh, f(b.whiskerHigh), ""],
  ];
  const placed: number[] = [];
  for (const [v, text, cls] of labels) {
    const px = x(v);
    if (placed.some((p) => Math.abs(p - px) < 12 + 6 * Math.max(text.length, 3))) continue;
    placed.push(px);
    el("text", { x: px, y: mid + h / 2 + 34, "text-anchor": px < 60 ? "start" : px > 540 ? "end" : "middle", class: cls }, text);
  }
}

function updateQuartiles(values: readonly number[], s: Stats): void {
  const b = boxPlot(values, quartileMethod);
  qValue.get("q1")!.textContent = f(b.q1);
  qValue.get("q3")!.textContent = f(b.q3);
  qValue.get("iqr")!.textContent = f(b.iqr);
  qValue.get("out")!.textContent = b.outliers.length ? b.outliers.map(f).join(", ") : "none";
  document.getElementById("method-note")!.textContent = METHOD_NOTE[quartileMethod];
  document.querySelectorAll<HTMLButtonElement>("[data-method]").forEach((btn) =>
    btn.setAttribute("aria-pressed", String(btn.dataset.method === quartileMethod)),
  );
  drawStrip([...values].sort((a, c) => a - c), new Set(b.outliers));
  drawBoxPlot(values, s);
  const fill = (ol: HTMLOListElement, steps: string[]) =>
    ol.replaceChildren(...steps.map((t) => Object.assign(document.createElement("li"), { textContent: t })));
  fill(quartileSections[0]!, explainQuartiles(values, quartileMethod));
  fill(quartileSections[1]!, explainOutliers(values, quartileMethod));
}

function clearQuartiles(): void {
  for (const v of qValue.values()) v.textContent = "–";
  strip.replaceChildren();
  boxSvg.replaceChildren();
  for (const ol of quartileSections) ol.replaceChildren();
}

// ---- update everything from the text box ----
function update(): void {
  try {
    const values = parseValues(input.value);
    if (values.length === 0) throw new Error("Type at least one number.");
    const s = getStats(values); // validates once; also feeds the plot
    for (const m of methods) {
      const out = valueEls.get(m.id)!;
      const r = m.compute(values);
      out.textContent = r === null ? (m.whenNull ?? "–") : show(r);
      out.classList.toggle("dim", r === null);
    }
    for (const m of methods) {
      const ol = stepLists.get(m.id);
      if (!ol || !m.explain) continue;
      ol.replaceChildren(...m.explain(values).map((t) => Object.assign(document.createElement("li"), { textContent: t })));
    }
    meta.textContent = `${values.length} value${values.length === 1 ? "" : "s"}, from ${f(Math.min(...values))} to ${f(Math.max(...values))}`;
    drawPlot(values, s);
    updateQuartiles(values, s);
    errorBox.hidden = true;
  } catch (e) {
    for (const el of valueEls.values()) { el.textContent = "–"; el.classList.remove("dim"); }
    for (const ol of stepLists.values()) ol.replaceChildren();
    meta.textContent = "";
    plot.replaceChildren();
    clearQuartiles();
    errorBox.textContent = e instanceof Error ? e.message : String(e);
    errorBox.hidden = false;
  }
}

input.addEventListener("input", update);
document.querySelectorAll<HTMLButtonElement>("[data-example]").forEach((b) =>
  b.addEventListener("click", () => {
    input.value = b.dataset.example ?? "";
    update();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-method]").forEach((b) =>
  b.addEventListener("click", () => {
    quartileMethod = b.dataset.method === "linear" ? "linear" : "halves";
    update();
  }),
);
update();
