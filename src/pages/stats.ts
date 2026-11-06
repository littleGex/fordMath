import "./sw-register";
import "../styles/zone.css";
import "../styles/stats.css";
import { methods } from "../registry";
import { formatFor, listSep, parseValues } from "../parse";
import { boxPlot, getStats, quartilePositions, type QuartileMethod, type Stats } from "../lib";
import { METHOD_NOTE, explainOutliers, explainQuartiles } from "../explain/quartiles";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Statistik", subtitle: "Zahlen eintippen, alles rechnet sofort mit",
    numbers: "Zahlen", inputNote: "Trenne mit Semikolon oder Leerzeichen, dann gilt das Komma als Dezimalkomma (2,5; 3; 4). Mit Kommas getrennt: Dezimalpunkt (2.5, 3, 4).",
    plotLabel: "Die Zahlen auf einem Zahlenstrahl, mit Mittelwert, Median und einer Standardabweichung um den Mittelwert",
    kMean: "Mittelwert", kMedian: "Median", kBand: "Mittelwert ± σ", kMode: "volle Punkte sind der Modalwert",
    quartilesTitle: "Quartile und Boxplot", mHalves: "Schule: Median der Hälften", mLinear: "Linear (NumPy, Excel)",
    stripNote: "Sortiert, mit Q1, dem Median (M) und Q3",
    boxLabel: "Boxplot: Die Box geht von Q1 bis Q3 mit einem Strich beim Median, die Antennen reichen bis zu den äußersten Werten, die keine Ausreißer sind, und Ausreißer sind eigene Punkte",
    kBox: "mittlere Hälfte (Q1 bis Q3)", kOut: "Ausreißer", howTitle: "So wird gerechnet",
    none: "keiner", empty: "Gib mindestens eine Zahl ein.",
    meta: (n: number, lo: string, hi: string) => `${n} ${n === 1 ? "Wert" : "Werte"}, von ${lo} bis ${hi}`,
    plotMean: "Mittelwert", plotMedian: "Median",
    qTiles: [["Unteres Quartil", "Ein Viertel der Werte liegt darunter."], ["Oberes Quartil", "Drei Viertel liegen darunter."], ["Quartilsabstand", "Q3 − Q1: so breit ist die mittlere Hälfte."], ["Ausreißer", "Außerhalb der 1,5 · IQR-Grenzen."]],
    qSections: ["Quartile (Q1, Q3, IQR)", "Ausreißer und Antennen (1,5 · IQR)"],
    examples: [["Schulbuch", "2; 4; 4; 4; 5; 5; 7; 9"], ["Zwei Modalwerte", "3; 1,5; 4; 1,5; 2; 4"], ["Ungerade Anzahl", "7; 2; 9; 4; 4"], ["Kein Modalwert", "0,25; 1,75; 3,5; −2"], ["Ausreißer", "2; 3; 3; 4; 5; 40"], ["Boxplot", "6; 7; 15; 36; 39; 40; 41; 42; 43; 47; 49"]],
  },
  en: {
    title: "Statistics", subtitle: "Type numbers and everything updates as you go",
    numbers: "Numbers", inputNote: "Separate with commas, spaces or semicolons. Use a dot for decimals (2.5, not 2,5).",
    plotLabel: "The numbers on a number line, with the mean, median and one standard deviation either side of the mean marked",
    kMean: "mean", kMedian: "median", kBand: "mean ± σ", kMode: "filled dots are the mode",
    quartilesTitle: "Quartiles and box plot", mHalves: "School: median of halves", mLinear: "Linear (NumPy, Excel)",
    stripNote: "Sorted, with where Q1, the median (M) and Q3 sit",
    boxLabel: "Box plot: the box runs from Q1 to Q3 with a line at the median, whiskers reach the furthest values that aren't outliers, and outliers are separate dots",
    kBox: "middle half (Q1 to Q3)", kOut: "outlier", howTitle: "How it's worked out",
    none: "none", empty: "Type at least one number.",
    meta: (n: number, lo: string, hi: string) => `${n} value${n === 1 ? "" : "s"}, from ${lo} to ${hi}`,
    plotMean: "mean", plotMedian: "median",
    qTiles: [["Lower quartile", "A quarter of the values are below it."], ["Upper quartile", "Three quarters are below it."], ["Interquartile range", "Q3 − Q1: how wide the middle half is."], ["Outliers", "Outside the 1.5 × IQR fences."]],
    qSections: ["Quartiles (Q1, Q3, IQR)", "Outliers and whiskers (1.5 × IQR)"],
    examples: [["Textbook", "2, 4, 4, 4, 5, 5, 7, 9"], ["Two modes", "3, 1.5, 4, 1.5, 2, 4"], ["Odd count", "7, 2, 9, 4, 4"], ["No mode", "0.25, 1.75, 3.5, -2"], ["Outlier", "2, 3, 3, 4, 5, 40"], ["Box plot", "6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49"]],
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];
let lang: Lang = getLang();
const t = () => UI[lang];
/** Numbers in the page's language: 2,5 or 2.5. */
let f = formatFor(lang);

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
/** Text that changes with the language: [element, words in each language]. */
const wordEls: Array<[HTMLElement, { de: string; en: string }]> = [];

for (const m of methods) {
  const tile = document.createElement("div");
  tile.className = `tile result ${m.colour}`;
  tile.innerHTML = `<span class="sym"></span><h3></h3><span class="value">–</span><p class="desc"></p>`;
  tile.querySelector(".sym")!.textContent = m.symbol;
  wordEls.push([tile.querySelector("h3")!, m.label], [tile.querySelector(".desc")!, m.description]);
  valueEls.set(m.id, tile.querySelector(".value")!);
  results.appendChild(tile);

  if (m.explain) {
    const d = document.createElement("details");
    d.className = m.colour;
    d.id = `explain-${m.id}`;
    const s = document.createElement("summary");
    wordEls.push([s, m.explainTitle ?? m.label]);
    const ol = document.createElement("ol");
    d.append(s, ol);
    explainBox.appendChild(d);
    stepLists.set(m.id, ol);
  }
}
explainBox.querySelector("details")?.setAttribute("open", "");

const show = (r: number | number[]): string =>
  Array.isArray(r) ? (r.length ? r.map(f).join(listSep(lang)) : t().none) : f(r);

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
  el("text", { x: x(s.mean), y: 22, "text-anchor": anchor(x(s.mean)), class: "lbl-mean" }, `${t().plotMean} ${f(s.mean)}`);
  el("text", { x: x(s.median), y: 50, "text-anchor": anchor(x(s.median)), class: "lbl-median" }, `${t().plotMedian} ${f(s.median)}`);

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
  ["q1", "Q1"],
  ["q3", "Q3"],
  ["iqr", "IQR"],
  ["out", "⚬"],
] as const).map(([id, sym], i) => {
  const tile = document.createElement("div");
  tile.className = "tile result c-quartiles";
  tile.innerHTML = `<span class="sym"></span><h3></h3><span class="value">–</span><p class="desc"></p>`;
  tile.querySelector(".sym")!.textContent = sym;
  wordEls.push(
    [tile.querySelector("h3")!, { de: UI.de.qTiles[i]![0]!, en: UI.en.qTiles[i]![0]! }],
    [tile.querySelector(".desc")!, { de: UI.de.qTiles[i]![1]!, en: UI.en.qTiles[i]![1]! }],
  );
  qResults.appendChild(tile);
  return [id, tile.querySelector<HTMLElement>(".value")!] as const;
});
const qValue = new Map(qTiles);

const quartileSections = [0, 1].map((i) => {
  const d = document.createElement("details");
  d.className = "c-quartiles";
  const sum = document.createElement("summary");
  wordEls.push([sum, { de: UI.de.qSections[i]!, en: UI.en.qSections[i]! }]);
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
  qValue.get("out")!.textContent = b.outliers.length ? b.outliers.map(f).join(listSep(lang)) : t().none;
  document.getElementById("method-note")!.textContent = METHOD_NOTE[lang][quartileMethod];
  document.querySelectorAll<HTMLButtonElement>("[data-method]").forEach((btn) =>
    btn.setAttribute("aria-pressed", String(btn.dataset.method === quartileMethod)),
  );
  drawStrip([...values].sort((a, c) => a - c), new Set(b.outliers));
  drawBoxPlot(values, s);
  const fill = (ol: HTMLOListElement, steps: string[]) =>
    ol.replaceChildren(...steps.map((t) => Object.assign(document.createElement("li"), { textContent: t })));
  fill(quartileSections[0]!, explainQuartiles(values, quartileMethod, lang));
  fill(quartileSections[1]!, explainOutliers(values, quartileMethod, lang));
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
    const values = parseValues(input.value, lang);
    if (values.length === 0) throw new Error(t().empty);
    const s = getStats(values); // validates once; also feeds the plot
    for (const m of methods) {
      const out = valueEls.get(m.id)!;
      const r = m.compute(values);
      out.textContent = r === null ? (m.whenNull?.[lang] ?? "–") : show(r);
      out.classList.toggle("dim", r === null);
    }
    for (const m of methods) {
      const ol = stepLists.get(m.id);
      if (!ol || !m.explain) continue;
      ol.replaceChildren(...m.explain(values, lang).map((t) => Object.assign(document.createElement("li"), { textContent: t })));
    }
    meta.textContent = t().meta(values.length, f(Math.min(...values)), f(Math.max(...values)));
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
document.querySelectorAll<HTMLButtonElement>("[data-method]").forEach((b) =>
  b.addEventListener("click", () => {
    quartileMethod = b.dataset.method === "linear" ? "linear" : "halves";
    // ---- language ----
function render(): void {
  f = formatFor(lang);
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<Element>("[data-t-label]").forEach((e) => e.setAttribute("aria-label", t()[e.getAttribute("data-t-label") as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  for (const [e, w] of wordEls) e.textContent = w[lang];
  document.getElementById("examples")!.replaceChildren(...t().examples.map(([label, values]) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "chip", textContent: label });
    b.addEventListener("click", () => {
      input.value = values!;
      update();
    });
    return b;
  }));
  update();
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    const before = lang;
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    // Rewrite what's in the box in the new style when it was a list we can read: 2,5; 3 ⇄ 2.5, 3.
    try {
      const values = parseValues(input.value, before);
      if (before !== lang && values.length) input.value = values.map(formatFor(lang)).join(listSep(lang));
    } catch {
      /* leave a half-typed box alone */
    }
    render();
  }),
);

input.value = UI[lang].examples[0]![1]!;
render();
  }),
);
// ---- language ----
function render(): void {
  f = formatFor(lang);
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<Element>("[data-t-label]").forEach((e) => e.setAttribute("aria-label", t()[e.getAttribute("data-t-label") as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  for (const [e, w] of wordEls) e.textContent = w[lang];
  document.getElementById("examples")!.replaceChildren(...t().examples.map(([label, values]) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "chip", textContent: label });
    b.addEventListener("click", () => {
      input.value = values!;
      update();
    });
    return b;
  }));
  update();
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    const before = lang;
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    // Rewrite what's in the box in the new style when it was a list we can read: 2,5; 3 ⇄ 2.5, 3.
    try {
      const values = parseValues(input.value, before);
      if (before !== lang && values.length) input.value = values.map(formatFor(lang)).join(listSep(lang));
    } catch {
      /* leave a half-typed box alone */
    }
    render();
  }),
);

input.value = UI[lang].examples[0]![1]!;
render();
