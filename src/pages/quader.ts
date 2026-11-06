import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import { mountQuiz } from "./quiz";
import "../styles/quader.css";
import { cellKey, parseCell, shapeOf, type CellKey, type Shape } from "../lib/area";
import { cubeNets, fold, makeCuboidRound, surface, volume, type CuboidQuestion } from "../lib/cuboid";
import { choiceText, quizPrompt, quizSteps, surfaceSteps, volumeSteps } from "../explain/cuboid";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Quader und Würfelnetze", subtitle: "Volumen, Oberfläche und Netze",
    volume: "Volumen", surface: "Oberfläche", sides: ["Länge a", "Breite b", "Höhe c"],
    unitsTitle: "Volumeneinheiten", netTitle: "Würfelnetze",
    netHint: "Tippe 6 Kästchen an. Ist es ein Würfelnetz? Gleiche Farben liegen beim Falten einander gegenüber.",
    netCross: "Beispiel", clear: "Löschen", netAll: "Alle 11 Netze",
    count: (n: number) => `${n} von 6 Kästchen.`, isNet: "Das ist ein Würfelnetz! ✓ Gleiche Farben liegen gegenüber.",
    notNet: "Kein Würfelnetz: Beim Falten würden zwei Kästchen aufeinander liegen.", notJoined: "Die Kästchen müssen zusammenhängen.",
    quizTitle: "Quiz", quizIntro: "10 Fragen: Würfel zählen, Volumen, Oberfläche, Einheiten und Netze.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`,
    netWrong: "Leider nicht. Das grün markierte Netz lässt sich falten.",
    score: (c: number) => `${c} von 10 richtig`, cuboid: (a: number, b: number, c: number) => `Quader aus ${a} · ${b} · ${c} Würfeln`,
  },
  en: {
    title: "Cuboids and cube nets", subtitle: "Volume, surface area and nets",
    volume: "Volume", surface: "Surface area", sides: ["Length a", "Width b", "Height c"],
    unitsTitle: "Volume units", netTitle: "Cube nets",
    netHint: "Tap 6 squares. Is it a cube net? Squares of the same colour end up opposite each other.",
    netCross: "Example", clear: "Clear", netAll: "All 11 nets",
    count: (n: number) => `${n} of 6 squares.`, isNet: "That's a cube net! ✓ Same colours end up opposite.",
    notNet: "Not a cube net: two squares would land on top of each other.", notJoined: "The squares have to be joined.",
    quizTitle: "Quiz", quizIntro: "10 questions: counting cubes, volume, surface area, units and nets.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`,
    netWrong: "Not quite. The net marked green is the one that folds.",
    score: (c: number) => `${c} out of 10 right`, cuboid: (a: number, b: number, c: number) => `Cuboid of ${a} · ${b} · ${c} cubes`,
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const NS = "http://www.w3.org/2000/svg";
let lang: Lang = getLang();
let dims: [number, number, number] = [4, 3, 2];
let net = new Set<CellKey>();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const svgEl = (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (text !== undefined) n.textContent = text;
  return n;
};

// ---------- the cuboid, drawn in 3D (isometric) with its unit cubes ----------

function drawCuboid(svg: SVGSVGElement, a: number, b: number, c: number, labels: boolean): void {
  const W = 320, H = 240;
  const s = Math.min((W - 40) / ((a + b) * 0.866), (H - 40) / ((a + b) * 0.5 + c));
  const ox = W / 2 + ((b - a) * 0.866 * s) / 2;
  const oy = (H - ((a + b) * 0.5 + c) * s) / 2 + c * s;
  // x runs along a (down to the right), y along b (down to the left), z up.
  const P = (x: number, y: number, z: number) => `${ox + (x - y) * 0.866 * s},${oy + (x + y) * 0.5 * s - z * s}`;
  const poly = (pts: string[], cls: string) => svgEl("polygon", { points: pts.join(" "), class: cls });
  const nodes: SVGElement[] = [
    poly([P(0, 0, c), P(a, 0, c), P(a, b, c), P(0, b, c)], "top"),
    poly([P(0, b, 0), P(a, b, 0), P(a, b, c), P(0, b, c)], "left"),
    poly([P(a, 0, 0), P(a, b, 0), P(a, b, c), P(a, 0, c)], "right"),
  ];
  const line = (p: string, q: string) => {
    const [x1, y1] = p.split(",").map(Number);
    const [x2, y2] = q.split(",").map(Number);
    nodes.push(svgEl("line", { x1: x1!, y1: y1!, x2: x2!, y2: y2!, class: "grid" }));
  };
  for (let i = 1; i < a; i++) { line(P(i, 0, c), P(i, b, c)); line(P(i, b, 0), P(i, b, c)); }
  for (let j = 1; j < b; j++) { line(P(0, j, c), P(a, j, c)); line(P(a, j, 0), P(a, j, c)); }
  for (let k = 1; k < c; k++) { line(P(0, b, k), P(a, b, k)); line(P(a, 0, k), P(a, b, k)); }
  nodes.push(svgEl("polygon", { points: [P(0, 0, c), P(a, 0, c), P(a, 0, 0), P(a, b, 0), P(0, b, 0), P(0, b, c)].join(" "), class: "edge" }));
  if (labels) {
    const mid = (p: string, q: string, dx: number, dy: number): [number, number] => {
      const [x1, y1] = p.split(",").map(Number);
      const [x2, y2] = q.split(",").map(Number);
      return [(x1! + x2!) / 2 + dx, (y1! + y2!) / 2 + dy];
    };
    const [ax, ay] = mid(P(0, b, 0), P(a, b, 0), -8, 18);
    const [bx, by] = mid(P(a, b, 0), P(a, 0, 0), 10, 18);
    const [cx, cy] = mid(P(a, 0, 0), P(a, 0, c), 16, 4);
    nodes.push(svgEl("text", { x: ax, y: ay, class: "dim" }, `a = ${a}`), svgEl("text", { x: bx, y: by, class: "dim" }, `b = ${b}`), svgEl("text", { x: cx, y: cy, class: "dim", "text-anchor": "start" }, `c = ${c}`));
  }
  svg.setAttribute("aria-label", t().cuboid(a, b, c));
  svg.replaceChildren(...nodes);
}

function renderCuboid(): void {
  $("steppers").replaceChildren(...dims.map((v, i) => {
    const box = el("div", "", "stepper");
    const minus = el("button", "−") as HTMLButtonElement;
    const plus = el("button", "+") as HTMLButtonElement;
    for (const [b, d] of [[minus, -1], [plus, 1]] as const) {
      b.type = "button";
      b.disabled = v + d < 1 || v + d > 8;
      b.addEventListener("click", () => {
        dims[i] = v + d;
        renderCuboid();
      });
    }
    const label = el("span", String(v));
    label.append(el("small", t().sides[i]!));
    box.append(minus, label, plus);
    return box;
  }));
  const [a, b, c] = dims;
  drawCuboid($("cuboid") as unknown as SVGSVGElement, a, b, c, true);
  $("v").textContent = `${volume(a, b, c)} cm³`;
  $("o").textContent = `${surface(a, b, c)} cm²`;
  $("v-steps").replaceChildren(...volumeSteps(a, b, c, lang).map((s) => el("li", s)));
  $("o-steps").replaceChildren(...surfaceSteps(a, b, c, lang).map((s) => el("li", s)));
}

function renderUnits(): void {
  const rows = ["1 cm³ = 1 000 mm³", "1 dm³ = 1 000 cm³", "1 m³ = 1 000 dm³", "1 l = 1 dm³", "1 ml = 1 cm³", "1 l = 1 000 ml"];
  $("units").replaceChildren(...rows.map((r) => el("span", lang === "de" ? r.replace(/(\d) (\d{3})/g, "$1.$2") : r.replace(/(\d) (\d{3})/g, "$1,$2"))));
}

// ---------- drawing a net ----------

const NET_SIZE = 6;
const NET_CELL = 50;

/** A grid of squares; `labels` writes a letter or mark in some; `classes` colours them. */
function drawSquares(svg: SVGSVGElement, cols: number, rows: number, size: number, shape: Shape, cls: (k: CellKey) => string, labels: Map<CellKey, string> = new Map(), paper = true): void {
  svg.setAttribute("viewBox", `-3 -3 ${cols * size + 6} ${rows * size + 6}`);
  const nodes: SVGElement[] = [];
  if (paper) {
    nodes.push(svgEl("rect", { x: 0, y: 0, width: cols * size, height: rows * size, class: "paper" }));
    for (let c = 0; c <= cols; c++) nodes.push(svgEl("line", { x1: c * size, x2: c * size, y1: 0, y2: rows * size, class: "line" }));
    for (let r = 0; r <= rows; r++) nodes.push(svgEl("line", { x1: 0, x2: cols * size, y1: r * size, y2: r * size, class: "line" }));
  }
  for (const k of shape) {
    const [r, c] = parseCell(k);
    nodes.push(svgEl("rect", { x: c * size + 1, y: r * size + 1, width: size - 2, height: size - 2, rx: 4, class: `sq ${cls(k)}` }));
    const label = labels.get(k);
    if (label) nodes.push(svgEl("text", { x: c * size + size / 2, y: r * size + size / 2 }, label));
  }
  svg.replaceChildren(...nodes);
}

function renderNet(): void {
  const svg = $("net") as unknown as SVGSVGElement;
  const faces = net.size === 6 ? fold(net) : null;
  const pairOf = (k: CellKey) => (faces ? `p${Math.floor(faces.get(k)! / 2)}` : net.size === 6 ? "bad" : "");
  const labels = new Map<CellKey, string>();
  if (faces) for (const [k, f] of faces) labels.set(k, "ABCDEF"[[0, 2, 4, 1, 3, 5].indexOf(f)]!);
  drawSquares(svg, NET_SIZE, NET_SIZE, NET_CELL, net, pairOf, labels);
  const status = $("net-status");
  if (net.size !== 6) {
    status.textContent = t().count(net.size);
    status.className = "net-status";
  } else if (faces) {
    status.textContent = t().isNet;
    status.className = "net-status ok";
  } else {
    status.textContent = netJoined() ? t().notNet : t().notJoined;
    status.className = "net-status no";
  }
}
const netJoined = () => {
  const first = [...net][0];
  if (!first) return true;
  const seen = new Set([first]);
  const stack = [first];
  while (stack.length) {
    const [r, c] = parseCell(stack.pop()!);
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const k = cellKey(r + dr, c + dc);
      if (net.has(k) && !seen.has(k)) { seen.add(k); stack.push(k); }
    }
  }
  return seen.size === net.size;
};

const netSvg = $("net") as unknown as SVGSVGElement;
netSvg.addEventListener("pointerdown", (ev) => {
  const box = netSvg.getBoundingClientRect();
  const scale = (NET_SIZE * NET_CELL + 6) / box.width;
  const [x, y] = [(ev.clientX - box.left) * scale - 3, (ev.clientY - box.top) * scale - 3];
  const [c, r] = [Math.floor(x / NET_CELL), Math.floor(y / NET_CELL)];
  if (c < 0 || r < 0 || c >= NET_SIZE || r >= NET_SIZE) return;
  const k = cellKey(r, c);
  if (net.has(k)) net.delete(k);
  else if (net.size < 6) net.add(k);
  renderNet();
});
$("net-cross").addEventListener("click", () => { net = new Set(shapeOf([[1, 2], [2, 1], [2, 2], [2, 3], [3, 2], [4, 2]])); renderNet(); });
$("net-clear").addEventListener("click", () => { net = new Set(); renderNet(); });
$("net-all").addEventListener("click", () => {
  const g = $("gallery");
  g.hidden = !g.hidden;
  if (!g.hidden) g.replaceChildren(...cubeNets().map((s) => {
    const svg = svgEl("svg", { role: "img" }) as SVGSVGElement;
    const faces = fold(s)!;
    drawSquares(svg, 4, 4, 20, s, (k) => `p${Math.floor(faces.get(k)! / 2)}`, new Map(), false);
    svg.classList.add("net");
    return svg;
  }));
});

// ---------- quiz ----------

/** A net drawn small, for a choice or the question picture. */
function shapeSvg(s: Shape, cls: (k: CellKey) => string = () => "", labels: Map<CellKey, string> = new Map(), extraClass = "net"): SVGSVGElement {
  const svg = svgEl("svg", { role: "img" }) as SVGSVGElement;
  svg.setAttribute("class", extraClass);
  const cells = [...s].map(parseCell);
  const rows = Math.max(...cells.map(([r]) => r)) + 1;
  const cols = Math.max(...cells.map(([, c]) => c)) + 1;
  const n = Math.max(rows, cols, 4);
  drawSquares(svg, n, n, 30, s, cls, labels, false);
  return svg;
}

const quiz = mountQuiz<CuboidQuestion>({
  host: $("quiz"),
  colour: "c-cuboid",
  makeRound: () => makeCuboidRound(Math.random),
  prompt: (q, l) => quizPrompt(q, l),
  choices: (q, l) => (q.kind === "net" ? q.shapes.map((s) => shapeSvg(s)) : q.choices.map((c) => choiceText(q, c, l))),
  answer: (q) => q.answer,
  steps: (q, l) => quizSteps(q, l),
  picture: (q, _l, answered) => {
    if (q.kind === "count") {
      const svg = svgEl("svg", { viewBox: "0 0 320 240", role: "img" }) as SVGSVGElement;
      svg.setAttribute("class", "quiz-pic");
      drawCuboid(svg, q.a, q.b, q.c, false);
      return svg;
    }
    if (q.kind === "opposite") {
      const labels = new Map<CellKey, string>([[q.marked, "●"]]);
      q.options.forEach((k, i) => labels.set(k, "ABCDE"[i]!));
      const right = q.options[q.answer]!;
      return shapeSvg(q.net, (k) => (answered && (k === right || k === q.marked) ? "p0" : ""), labels, "quiz-pic");
    }
    return null;
  },
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: (r) => (r ? UI[l].wrong(r) : UI[l].netWrong), score: (c) => UI[l].score(c) }),
});

// ---------- wiring ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  renderCuboid();
  renderUnits();
  renderNet();
  quiz.render(lang);
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
net = new Set(shapeOf([[1, 2], [2, 1], [2, 2], [2, 3], [3, 2], [4, 2]]));
render();
