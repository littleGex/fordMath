import "../styles/zone.css";
import "../styles/stats.css";
import { methods } from "../registry";
import { formatNumber as f, parseValues } from "../parse";
import { getStats, type Stats } from "../lib";

const input = document.querySelector<HTMLTextAreaElement>("#values")!;
const errorBox = document.getElementById("error")!;
const results = document.getElementById("results")!;
const meta = document.getElementById("meta")!;
const plot = document.querySelector<SVGSVGElement>("#plot")!;
const explainBox = document.getElementById("explain")!;

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
function drawPlot(values: readonly number[], s: Stats): void {
  plot.replaceChildren();
  const L = 30, R = 570, axisY = 152;
  const minV = Math.min(...values), maxV = Math.max(...values);
  let lo = Math.min(minV, s.mean - s.stdDev), hi = Math.max(maxV, s.mean + s.stdDev);
  if (lo === hi) { lo -= 1; hi += 1; }
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (R - L);
  const el = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    plot.appendChild(n);
    return n;
  };
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
    errorBox.hidden = true;
  } catch (e) {
    for (const el of valueEls.values()) { el.textContent = "–"; el.classList.remove("dim"); }
    for (const ol of stepLists.values()) ol.replaceChildren();
    meta.textContent = "";
    plot.replaceChildren();
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
update();
