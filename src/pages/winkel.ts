import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/winkel.css";
import {
  ANGLE_KINDS, closeEnough, makeAngleRound, norm, snapPose, type AngleKind, type AngleTask, type GeoPose,
} from "../lib/angles";
import { starsFor } from "../lib/times-tables";
import { KIND_NAMES, drawSteps, estimateSteps, kindSteps, measureSteps, prompt } from "../explain/angles";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Winkel", subtitle: "Winkelarten, schätzen, messen und zeichnen",
    check: "Prüfen", help: "Zeig mir, wie", next: "Weiter", finish: "Fertig", again: "Noch mal",
    geoHint: "Zieh das Geodreieck mit dem Finger. Am blauen Knopf drehst du es. Nah dran rastet es ein.",
    right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`,
    drawOk: (d: number) => `Super, ${d}°! ⭐`, drawNo: (d: number) => `Das sind ${d}°.`,
    score: (c: number, t: number) => `${c} von ${t} richtig`, kindsTitle: "Die Winkelarten",
    board: "Ein Winkel mit Scheitelpunkt S", bad: "Bitte eine Zahl eingeben.",
  },
  en: {
    title: "Angles", subtitle: "Kinds of angle, estimating, measuring and drawing",
    check: "Check", help: "Show me how", next: "Next", finish: "Done", again: "Again",
    geoHint: "Drag the protractor with your finger. Turn it with the blue button. It clicks into place when close.",
    right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`,
    drawOk: (d: number) => `Great, ${d}°! ⭐`, drawNo: (d: number) => `That's ${d}°.`,
    score: (c: number, t: number) => `${c} out of ${t} right`, kindsTitle: "The kinds of angle",
    board: "An angle with vertex S", bad: "Please type a number.",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const NS = "http://www.w3.org/2000/svg";
const S = { x: 180, y: 165 };
const ARM = 128;

let lang: Lang = getLang();
let round: AngleTask[] = makeAngleRound(Math.random);
let index = 0;
let right = 0;
let streak = 0;
let results: boolean[] = [];
let answered: null | { ok: boolean; steps: string[]; verdict: string } = null;
let geo: GeoPose = { x: 250, y: 295, rot: 0 };
let drawAngle = 30; // the angle the child has dragged to, in the draw task

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const svgEl = (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (text !== undefined) n.textContent = text;
  return n;
};
/** A point at `deg` (anticlockwise from the right) and distance r from (cx, cy), in screen coordinates (y down). */
const at = (cx: number, cy: number, deg: number, r: number): [number, number] => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];

/** The angle's arc, the two arms and the vertex. */
function angleNodes(cx: number, cy: number, start: number, size: number, arm: number, arcR: number, showSize: boolean): SVGElement[] {
  const [x1, y1] = at(cx, cy, start, arm);
  const [x2, y2] = at(cx, cy, start + size, arm);
  const [a1, b1] = at(cx, cy, start, arcR);
  const [a2, b2] = at(cx, cy, start + size, arcR);
  const large = size > 180 ? 1 : 0;
  const nodes: SVGElement[] = [];
  if (size >= 360) nodes.push(svgEl("circle", { cx, cy, r: arcR, class: "arc" }));
  else nodes.push(svgEl("path", { d: `M ${cx} ${cy} L ${a1} ${b1} A ${arcR} ${arcR} 0 ${large} 0 ${a2} ${b2} Z`, class: "arc" }));
  nodes.push(svgEl("line", { x1: cx, y1: cy, x2: x1, y2: y1, class: "arm" }), svgEl("line", { x1: cx, y1: cy, x2: x2, y2: y2, class: "arm" }));
  nodes.push(svgEl("circle", { cx, cy, r: 4, class: "vertex" }));
  if (showSize) {
    const [lx, ly] = at(cx, cy, start + size / 2, arcR + 18);
    nodes.push(svgEl("text", { x: lx, y: ly + 5, "text-anchor": "middle", class: "size" }, `${size}°`));
  }
  return nodes;
}

/** The Geodreieck: a right-angled triangle, long edge 340, with two scales from 0° to 180°. */
function geodreieck(pose: GeoPose): SVGGElement {
  const g = svgEl("g", { class: "geo", transform: `translate(${pose.x} ${pose.y}) rotate(${-pose.rot})` }) as SVGGElement;
  g.append(svgEl("path", { d: "M -170 0 L 170 0 L 0 -170 Z", class: "body" }));
  for (let d = 0; d <= 180; d++) {
    const len = d % 10 === 0 ? 11 : d % 5 === 0 ? 7 : 4;
    const [x1, y1] = at(0, 0, d, 118);
    const [x2, y2] = at(0, 0, d, 118 - len);
    g.append(svgEl("line", { x1, y1, x2, y2, class: "tick" }));
    if (d % 10 === 0) {
      // Numbers turned along the arc, the way they're printed on a real Geodreieck.
      const [ox, oy] = at(0, 0, d, 104);
      const [ix, iy] = at(0, 0, d, 89);
      g.append(
        svgEl("text", { x: ox, y: oy, class: "outer", transform: `rotate(${90 - d} ${ox} ${oy})` }, String(d)),
        svgEl("text", { x: ix, y: iy, class: "inner", transform: `rotate(${90 - d} ${ix} ${iy})` }, String(180 - d)),
      );
    }
  }
  g.append(svgEl("line", { x1: 0, y1: 0, x2: 0, y2: -12, class: "zero" }), svgEl("circle", { cx: 0, cy: 0, r: 3, class: "zero" }));
  g.append(svgEl("circle", { cx: 0, cy: -146, r: 14, class: "turn" }), svgEl("text", { x: 0, y: -146, class: "turn-icon" }, "↻"));
  return g;
}

function renderBoard(): void {
  const svg = $("board") as unknown as SVGSVGElement;
  svg.setAttribute("aria-label", t().board);
  const task = round[index]!;
  const nodes: SVGElement[] = [];
  const showSize = answered !== null;
  if (task.kind === "draw") {
    nodes.push(...angleNodes(S.x, S.y, task.start, drawAngle, ARM, 34, showSize));
    const [hx, hy] = at(S.x, S.y, task.start + drawAngle, ARM);
    nodes.push(svgEl("circle", { cx: hx, cy: hy, r: 13, class: "handle", id: "arm-handle" }));
  } else {
    nodes.push(...angleNodes(S.x, S.y, task.start, task.size, ARM, task.size > 180 ? 26 : 34, showSize));
  }
  const [lx, ly] = at(S.x, S.y, task.start + (task.kind === "draw" ? drawAngle : task.size) / 2 + 180, 18);
  nodes.push(svgEl("text", { x: lx, y: ly + 6, "text-anchor": "middle", class: "label" }, "S"));
  if (task.kind === "measure" || task.kind === "draw") nodes.push(geodreieck(geo));
  svg.replaceChildren(...nodes);
}

// ---------- dragging: the Geodreieck and the arm ----------

const board = $("board") as unknown as SVGSVGElement;
function toSvg(ev: PointerEvent): { x: number; y: number } {
  const p = board.createSVGPoint();
  p.x = ev.clientX;
  p.y = ev.clientY;
  const m = board.getScreenCTM();
  const q = m ? p.matrixTransform(m.inverse()) : p;
  return { x: q.x, y: q.y };
}
const armsOf = (task: AngleTask): number[] => [task.start, task.start + (task.kind === "draw" ? drawAngle : task.size)];

let drag: null | { what: "move"; dx: number; dy: number } | { what: "turn" } | { what: "arm" } = null;
board.addEventListener("pointerdown", (ev) => {
  const target = ev.target as Element;
  const task = round[index]!;
  if (answered && task.kind === "draw") return;
  const p = toSvg(ev);
  if (target.id === "arm-handle") drag = { what: "arm" };
  else if (target.classList.contains("turn")) drag = { what: "turn" };
  else if (target.closest(".geo")) drag = { what: "move", dx: geo.x - p.x, dy: geo.y - p.y };
  else return;
  board.setPointerCapture(ev.pointerId);
  ev.preventDefault();
});
board.addEventListener("pointermove", (ev) => {
  if (!drag) return;
  const task = round[index]!;
  const p = toSvg(ev);
  if (drag.what === "arm") {
    const deg = norm((Math.atan2(S.y - p.y, p.x - S.x) * 180) / Math.PI - task.start);
    drawAngle = Math.max(1, Math.min(179, Math.round(deg > 270 ? 1 : deg > 179 ? 179 : deg)));
  } else if (drag.what === "turn") {
    // The button sits straight "up" from the zero point (90° in the Geodreieck's own frame).
    geo = snapPose({ ...geo, rot: norm((Math.atan2(geo.y - p.y, p.x - geo.x) * 180) / Math.PI - 90) }, S, armsOf(task));
  } else {
    geo = snapPose({ ...geo, x: p.x + drag.dx, y: p.y + drag.dy }, S, armsOf(task));
  }
  renderBoard();
});
const endDrag = () => { drag = null; };
board.addEventListener("pointerup", endDrag);
board.addEventListener("pointercancel", endDrag);

// ---------- one task ----------

function finishTask(ok: boolean, verdict: string, steps: string[]): void {
  answered = { ok, verdict, steps };
  results.push(ok);
  right += ok ? 1 : 0;
  streak = ok ? streak + 1 : 0;
  render();
}

function renderTask(): void {
  const task = round[index]!;
  $("prompt").textContent = prompt(task, lang);
  $("geo-hint").hidden = !(task.kind === "measure" || task.kind === "draw") || answered !== null;
  $("geo-hint").textContent = t().geoHint;
  $("measure-row").hidden = task.kind !== "measure" || answered !== null;
  $("check").hidden = !(task.kind === "measure" || task.kind === "draw") || answered !== null;
  const choices = $("choices");
  choices.replaceChildren();
  if (task.kind === "kind" || task.kind === "estimate") {
    const labels = task.kind === "kind" ? task.choices.map((k) => KIND_NAMES[lang][k as AngleKind]) : task.choices.map((v) => `${v}°`);
    choices.append(...labels.map((label, i) => {
      const b = el("button", label) as HTMLButtonElement;
      b.type = "button";
      b.disabled = answered !== null;
      if (answered && i === task.answer) b.classList.add("right");
      b.addEventListener("click", () => {
        const ok = i === task.answer;
        if (!ok) b.classList.add("wrong");
        const steps = task.kind === "kind" ? kindSteps(task.size, lang) : estimateSteps(task.size, lang);
        finishTask(ok, ok ? t().right : t().wrong(labels[task.answer]!), steps);
      });
      return b;
    }));
  }
  $("feedback").hidden = answered === null;
  if (answered) {
    $("verdict").textContent = answered.verdict;
    $("verdict").className = `verdict ${answered.ok ? "ok" : "no"}`;
    $("steps").replaceChildren(...answered.steps.map((s) => el("li", s)));
    $("next-label").textContent = index + 1 >= round.length ? t().finish : t().next;
  }
}

$("check").addEventListener("click", () => {
  const task = round[index]!;
  if (task.kind === "measure") {
    const v = Number($<HTMLInputElement>("degrees").value.trim());
    if (!Number.isFinite(v) || $<HTMLInputElement>("degrees").value.trim() === "") {
      $("geo-hint").textContent = t().bad;
      return;
    }
    const ok = closeEnough(v, task.size, 1);
    finishTask(ok, ok ? t().right : t().wrong(`${task.size}°`), measureSteps(task.size, lang));
  } else if (task.kind === "draw") {
    const ok = closeEnough(drawAngle, task.size);
    finishTask(ok, ok ? t().drawOk(drawAngle) : t().drawNo(drawAngle), drawSteps(task.size, drawAngle, lang));
  }
});
$("help").addEventListener("click", () => {
  geo = { x: S.x, y: S.y, rot: round[index]!.start };
  renderBoard();
});
$("degrees").addEventListener("keydown", (e) => { if (e.key === "Enter") $("check").click(); });
$("next").addEventListener("click", () => {
  index++;
  answered = null;
  geo = { x: 250, y: 295, rot: 0 };
  drawAngle = 30;
  $<HTMLInputElement>("degrees").value = "";
  render();
});
$("again").addEventListener("click", () => {
  round = makeAngleRound(Math.random);
  index = 0;
  right = 0;
  streak = 0;
  results = [];
  answered = null;
  render();
});

// ---------- the reference card of angle kinds ----------

function renderKinds(): void {
  const sizes: Record<AngleKind, number> = { spitz: 45, recht: 90, stumpf: 130, gestreckt: 180, ueberstumpf: 250, voll: 360 };
  $("kinds").replaceChildren(...ANGLE_KINDS.map((k) => {
    const fig = el("figure");
    const svg = svgEl("svg", { viewBox: "0 0 120 90", role: "img", "aria-label": KIND_NAMES[lang][k] }) as SVGSVGElement;
    svg.classList.add("board");
    svg.append(...angleNodes(60, 60, 0, sizes[k], 48, k === "ueberstumpf" || k === "voll" ? 14 : 18, false));
    fig.append(svg, el("figcaption", `${KIND_NAMES[lang][k]}`));
    return fig;
  }));
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  const done = index >= round.length;
  $("play").hidden = done;
  $("done").hidden = !done;
  renderKinds();
  if (done) {
    const stars = starsFor(right, round.length);
    $("stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("score").textContent = t().score(right, round.length);
    return;
  }
  $("progress").replaceChildren(...round.map((_, i) => {
    const dot = document.createElement("i");
    if (i < results.length) dot.className = results[i] ? "ok" : "no";
    else if (i === index) dot.className = "now";
    return dot;
  }));
  $("streak").textContent = streak >= 3 ? `🔥 ${streak}` : "";
  renderBoard();
  renderTask();
}

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

render();
