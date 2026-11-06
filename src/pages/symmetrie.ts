import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import { mountQuiz } from "./quiz";
import "../styles/symmetrie.css";
import { cellKey, parseCell, type CellKey, type Shape } from "../lib/area";
import {
  axesOf, checkMirror, makeAxesRound, makeMirrorTask, mirrorCell, type AxesQuestion, type Axis, type MirrorTask, type SymmetryLevel,
} from "../lib/symmetry";
import { axesPrompt, axesSteps, mirrorSteps } from "../explain/symmetry";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Symmetrie", subtitle: "Spiegeln auf Kästchenpapier",
    modeMirror: "Spiegeln", modeMagic: "Zaubertafel", modeAxes: "Achsen finden", gs: "Grundschule", sek1: "Klasse 5",
    mirrorHint: "Die rote Linie ist der Spiegel. Male das Spiegelbild der blauen Figur: Tippe die Kästchen an.",
    magicHint: "Male auf einer Seite: Das Spiegelbild malt sich von selbst.", clear: "Löschen",
    check: "Prüfen", newTask: "Neue Figur", next: "Weiter", again: "Noch mal",
    solved: (n: number) => (n ? `✓ ${n}` : ""), right: "Richtig! ⭐", wrong: (n: number) => `Leider nicht. Richtig ist: ${n}`,
    score: (c: number, t: number) => `${c} von ${t} richtig`,
    magicAxes: { vertical: "│ senkrecht", horizontal: "─ waagerecht", both: "┼ beide", diagonal: "╲ schräg" },
    grid: "Kästchenpapier mit Spiegelachse",
  },
  en: {
    title: "Symmetry", subtitle: "Mirroring on squared paper",
    modeMirror: "Mirror it", modeMagic: "Magic board", modeAxes: "Find the lines", gs: "Primary", sek1: "Year 5",
    mirrorHint: "The red line is the mirror. Draw the mirror image of the blue shape: tap the squares.",
    magicHint: "Draw on one side: the mirror image draws itself.", clear: "Clear",
    check: "Check", newTask: "New shape", next: "Next", again: "Again",
    solved: (n: number) => (n ? `✓ ${n}` : ""), right: "Right! ⭐", wrong: (n: number) => `Not quite. The answer is ${n}`,
    score: (c: number, t: number) => `${c} out of ${t} right`,
    magicAxes: { vertical: "│ vertical", horizontal: "─ horizontal", both: "┼ both", diagonal: "╲ diagonal" },
    grid: "Squared paper with a mirror line",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];
type Mode = "mirror" | "magic" | "axes";
type MagicAxes = "vertical" | "horizontal" | "both" | "diagonal";

const SIZE = 10;
const CELL = 34;
const NS = "http://www.w3.org/2000/svg";

let lang: Lang = getLang();
let mode: Mode = "mirror";
let level: SymmetryLevel = "grundschule";
let task: MirrorTask = makeMirrorTask(level, Math.random);
let drawn = new Set<CellKey>();
let checked = false;
let solved = 0;
let magicAxes: MagicAxes = "vertical";
let magic = new Set<CellKey>();

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
};

/** The two ends of an axis inside a size × size grid, in grid units. */
function axisEnds(axis: Axis, size: number): [number, number, number, number] {
  switch (axis.kind) {
    case "vertical": return [axis.at, 0, axis.at, size];
    case "horizontal": return [0, axis.at, size, axis.at];
    case "diagonal": {
      const x0 = Math.max(0, -axis.d);
      const x1 = Math.min(size, size - axis.d);
      return [x0, x0 + axis.d, x1, x1 + axis.d];
    }
    case "antidiagonal": {
      const x0 = Math.max(0, axis.s - size);
      const x1 = Math.min(size, axis.s);
      return [x0, axis.s - x0, x1, axis.s - x1];
    }
  }
}

/** Squared paper with coloured squares (each class its own set) and mirror lines. */
function drawGrid(svg: SVGSVGElement, cols: number, rows: number, size: number, layers: Array<[string, Iterable<CellKey>]>, axes: Axis[]): void {
  svg.setAttribute("viewBox", `-4 -4 ${cols * size + 8} ${rows * size + 8}`);
  const nodes: SVGElement[] = [svgEl("rect", { x: 0, y: 0, width: cols * size, height: rows * size, class: "paper" })];
  for (const [cls, cells] of layers) {
    for (const k of cells) {
      const [r, c] = parseCell(k);
      const inset = cls === "missing" ? 3 : 0;
      nodes.push(svgEl("rect", { x: c * size + inset, y: r * size + inset, width: size - 2 * inset, height: size - 2 * inset, rx: inset, class: cls }));
    }
  }
  for (let c = 0; c <= cols; c++) nodes.push(svgEl("line", { x1: c * size, x2: c * size, y1: 0, y2: rows * size, class: "line" }));
  for (let r = 0; r <= rows; r++) nodes.push(svgEl("line", { x1: 0, x2: cols * size, y1: r * size, y2: r * size, class: "line" }));
  for (const a of axes) {
    const [x1, y1, x2, y2] = axisEnds(a, Math.max(cols, rows));
    nodes.push(svgEl("line", { x1: x1 * size, y1: y1 * size, x2: x2 * size, y2: y2 * size, class: "axis" }));
  }
  svg.replaceChildren(...nodes);
}

/** Tap or drag across squares; `onCell` decides what a square does. */
function paintable(svg: SVGSVGElement, onCell: (k: CellKey, start: boolean) => void): void {
  const cellAt = (ev: PointerEvent): CellKey | null => {
    const box = svg.getBoundingClientRect();
    const scale = (SIZE * CELL + 8) / box.width;
    const [x, y] = [(ev.clientX - box.left) * scale - 4, (ev.clientY - box.top) * scale - 4];
    const [c, r] = [Math.floor(x / CELL), Math.floor(y / CELL)];
    return c >= 0 && r >= 0 && c < SIZE && r < SIZE ? cellKey(r, c) : null;
  };
  let down = false;
  let last: CellKey | null = null;
  svg.addEventListener("pointerdown", (ev) => {
    const k = cellAt(ev);
    if (!k) return;
    down = true;
    last = k;
    svg.setPointerCapture(ev.pointerId);
    onCell(k, true);
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!down) return;
    const k = cellAt(ev);
    if (k && k !== last) {
      last = k;
      onCell(k, false);
    }
  });
  const up = () => { down = false; };
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);
}

// ---------- Spiegeln ----------

let paintMode: "add" | "remove" = "add";
function renderMirror(): void {
  const svg = $("mirror-grid") as unknown as SVGSVGElement;
  svg.setAttribute("aria-label", t().grid);
  if (checked) {
    const r = checkMirror(task, drawn);
    drawGrid(svg, SIZE, SIZE, CELL, [["given", task.given], ["right", [...drawn].filter((k) => task.answer.has(k))], ["wrong", r.wrong], ["missing", r.missing]], [task.axis]);
    $("mirror-steps").replaceChildren(...mirrorSteps(task, drawn, lang).map((s) => el("li", s)));
  } else {
    drawGrid(svg, SIZE, SIZE, CELL, [["given", task.given], ["drawn", drawn]], [task.axis]);
  }
  $("mirror-steps").hidden = !checked;
  $("solved").textContent = t().solved(solved);
  document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === level)));
}

paintable($("mirror-grid") as unknown as SVGSVGElement, (k, start) => {
  if (task.given.has(k)) return;
  if (start) {
    paintMode = drawn.has(k) ? "remove" : "add";
    checked = false;
  }
  if (paintMode === "add") drawn.add(k);
  else drawn.delete(k);
  renderMirror();
});

function newMirrorTask(): void {
  task = makeMirrorTask(level, Math.random);
  drawn = new Set();
  checked = false;
  renderMirror();
}

$("mirror-check").addEventListener("click", () => {
  if (checkMirror(task, drawn).ok && !checked) solved++;
  checked = true;
  renderMirror();
});
$("mirror-new").addEventListener("click", newMirrorTask);
document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) =>
  b.addEventListener("click", () => {
    level = b.dataset.level === "sek1" ? "sek1" : "grundschule";
    newMirrorTask();
  }),
);

// ---------- Zaubertafel ----------

const MAGIC_AXES: Record<MagicAxes, Axis[]> = {
  vertical: [{ kind: "vertical", at: SIZE / 2 }],
  horizontal: [{ kind: "horizontal", at: SIZE / 2 }],
  both: [{ kind: "vertical", at: SIZE / 2 }, { kind: "horizontal", at: SIZE / 2 }],
  diagonal: [{ kind: "diagonal", d: 0 }],
};

/** A square and all its mirror images (with two axes, the corner one too). */
function orbit(k: CellKey): CellKey[] {
  const out = new Set<CellKey>([k]);
  for (let round = 0; round < 2; round++) {
    for (const cell of [...out]) {
      for (const a of MAGIC_AXES[magicAxes]) out.add(cellKey(...mirrorCell(...parseCell(cell), a)));
    }
  }
  return [...out];
}

let magicPaint: "add" | "remove" = "add";
function renderMagic(): void {
  $("magic-axes").replaceChildren(...(Object.keys(MAGIC_AXES) as MagicAxes[]).map((m) => {
    const b = el("button", t().magicAxes[m], "chip") as HTMLButtonElement;
    b.type = "button";
    b.setAttribute("aria-pressed", String(m === magicAxes));
    b.addEventListener("click", () => {
      magicAxes = m;
      magic = new Set();
      renderMagic();
    });
    return b;
  }));
  const svg = $("magic-grid") as unknown as SVGSVGElement;
  svg.setAttribute("aria-label", t().grid);
  drawGrid(svg, SIZE, SIZE, CELL, [["drawn", magic]], MAGIC_AXES[magicAxes]);
}
paintable($("magic-grid") as unknown as SVGSVGElement, (k, start) => {
  if (start) magicPaint = magic.has(k) ? "remove" : "add";
  for (const c of orbit(k)) {
    if (magicPaint === "add") magic.add(c);
    else magic.delete(c);
  }
  renderMagic();
});
$("magic-clear").addEventListener("click", () => { magic = new Set(); renderMagic(); });

// ---------- Achsen finden ----------

/** The picture on squared paper, centred in a square so diagonal lines run corner to corner. */
function picture(shape: Shape, showAxes: boolean, label: string): SVGSVGElement {
  const cells = [...shape].map(parseCell);
  const rows = Math.max(...cells.map(([r]) => r)) + 1;
  const cols = Math.max(...cells.map(([, c]) => c)) + 1;
  const n = Math.max(rows, cols);
  const [dr, dc] = [Math.floor((n - rows) / 2), Math.floor((n - cols) / 2)];
  const moved = new Set([...shape].map((k) => { const [r, c] = parseCell(k); return cellKey(r + dr + 1, c + dc + 1); }));
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "pic");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  drawGrid(svg, n + 2, n + 2, 30, [["given", moved]], showAxes ? axesOf(moved) : []);
  return svg;
}

const quiz = mountQuiz<AxesQuestion>({
  host: $("axes-mode"),
  colour: "c-symmetry",
  skipStart: true,
  makeRound: () => makeAxesRound(Math.random),
  prompt: (q, l) => axesPrompt(q, l),
  choices: (q) => q.choices.map(String),
  answer: (q) => q.answer,
  steps: (q, l) => axesSteps(q, l),
  picture: (q, l, answered) => picture(q.shape, answered, axesPrompt(q, l)),
  words: (l) => ({ intro: "", go: "", next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: (r) => UI[l].wrong(Number(r)), score: UI[l].score }),
});

// ---------- wiring ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  $("mirror-mode").hidden = mode !== "mirror";
  $("magic-mode").hidden = mode !== "magic";
  $("axes-mode").hidden = mode !== "axes";
  renderMirror();
  renderMagic();
  quiz.render(lang);
}
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) =>
  b.addEventListener("click", () => {
    mode = (b.dataset.mode as Mode) ?? "mirror";
    render();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

render();
