import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/koordinaten.css";
import {
  allSunk, BOUNDS, classify, makeCoordRound, makeFleet, pt, same, shoot, type CoordQuestion, type Point, type Range, type Ship,
} from "../lib/coordinates";
import { pointText, quizChoice, quizPrompt, quizSteps, RULE, shapeName, shotText, walk } from "../explain/coordinates";
import type { Lang } from "../explain/lang";
import { COLOURS, CoordGrid } from "./coord-grid";
import { mountQuiz } from "./quiz";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Koordinaten", subtitle: "Punkte ablesen, eintragen und Schiffe versenken",
    rangeFirst: "1. Quadrant (Klasse 5)", rangeAll: "Alle vier Quadranten",
    drawTitle: "Punkte eintragen", join: "Verbinden", undo: "Zurück", clear: "Löschen",
    tapHint: "Tippe auf einen Gitterpunkt, um einen Punkt zu setzen.",
    shape: (name: string) => `Die Punkte bilden ein ${name}.`,
    seaTitle: "Schiffe versenken", seaHint: "Drei Schiffe sind versteckt: eins mit 3 Punkten, zwei mit 2. Stell x und y ein (oder tippe ins Gitter) und schieß!",
    fire: (p: string) => `Feuer auf ${p}!`, newGame: "Neues Spiel",
    fleet: (left: number, shots: number) => `Noch ${left} ${left === 1 ? "Schiff" : "Schiffe"} · ${shots} ${shots === 1 ? "Schuss" : "Schüsse"}`,
    won: (shots: number) => `Alle versenkt mit ${shots} Schüssen! 🎉`,
    quizTitle: "Quiz", quizIntro: "10 Fragen: Punkte ablesen und finden, Formen erkennen, die vierte Ecke.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`, score: (c: number) => `${c} von 10 richtig`,
    grid: "Koordinatensystem",
  },
  en: {
    title: "Coordinates", subtitle: "Read points, plot them and play battleships",
    rangeFirst: "First quadrant (Year 6)", rangeAll: "All four quadrants",
    drawTitle: "Plot points", join: "Join up", undo: "Undo", clear: "Clear",
    tapHint: "Tap a grid point to plot a point.",
    shape: (name: string) => `The points make a ${name}.`,
    seaTitle: "Battleships", seaHint: "Three ships are hidden: one 3 points long, two 2 long. Set x and y (or tap the grid) and fire!",
    fire: (p: string) => `Fire at ${p}!`, newGame: "New game",
    fleet: (left: number, shots: number) => `${left} ${left === 1 ? "ship" : "ships"} left · ${shots} ${shots === 1 ? "shot" : "shots"}`,
    won: (shots: number) => `All sunk in ${shots} shots! 🎉`,
    quizTitle: "Quiz", quizIntro: "10 questions: read and find points, spot shapes, the fourth corner.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`, score: (c: number) => `${c} out of 10 right`,
    grid: "Coordinate grid",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const RANGE_KEY = "fm.koordinaten.range";
const NAMES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let lang: Lang = getLang();
let range: Range = readRange();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const view = () => ({ xMin: BOUNDS[range].min, xMax: BOUNDS[range].max, yMin: BOUNDS[range].min, yMax: BOUNDS[range].max });

function readRange(): Range {
  try {
    return localStorage.getItem(RANGE_KEY) === "all" ? "all" : "first";
  } catch {
    return "first";
  }
}

// ---------- plotting points ----------

let points: Point[] = [];
let joined = false;
const drawGrid = new CoordGrid($("draw") as unknown as SVGSVGElement, view());

function renderDraw(): void {
  drawGrid.view = view();
  const g = drawGrid.begin();
  if (joined && points.length >= 2) g.polygon(points, COLOURS.c, points.length >= 3);
  points.forEach((p, i) => g.dot(p, COLOURS.a, NAMES[i % 26]!));
  g.end();
  $("rule").textContent = RULE[lang];
  const last = points[points.length - 1];
  const shape = joined ? classify(points) : "other";
  $("walk").textContent = last ? walk(last, lang) + (shape !== "other" ? ` ${t().shape(shapeName(shape, lang))}` : "") : t().tapHint;
  $("points").replaceChildren(...points.map((p, i) => el("span", pointText(p, lang, NAMES[i % 26]!))));
  $("join").setAttribute("aria-pressed", String(joined));
}
drawGrid.onTap((p) => {
  const at = points.findIndex((q) => same(q, p));
  if (at >= 0) points.splice(at, 1); // tapping a point again takes it away
  else if (points.length < 26) points.push(pt(p.x, p.y));
  renderDraw();
});
$("join").addEventListener("click", () => {
  joined = !joined;
  renderDraw();
});
$("undo").addEventListener("click", () => {
  points.pop();
  renderDraw();
});
$("clear").addEventListener("click", () => {
  points = [];
  renderDraw();
});

// ---------- Schiffe versenken ----------

let fleet: Ship[] = [];
let shots: Point[] = [];
let aim = pt(0, 0);
let lastShot = "";
const seaGrid = new CoordGrid($("sea") as unknown as SVGSVGElement, view());

function newGame(): void {
  fleet = makeFleet(range, Math.random);
  shots = [];
  aim = pt(Math.round((BOUNDS[range].min + BOUNDS[range].max) / 2), Math.round((BOUNDS[range].min + BOUNDS[range].max) / 2));
  lastShot = "";
  renderSea();
}

function renderSea(): void {
  seaGrid.view = view();
  const g = seaGrid.begin();
  const won = allSunk(fleet, shots);
  for (const ship of fleet) {
    const sunk = ship.every((q) => shots.some((s) => same(s, q)));
    if (sunk || won) g.polygon(ship, sunk ? COLOURS.hit : COLOURS.d, false, 0);
  }
  for (const s of shots) {
    if (fleet.some((ship) => ship.some((q) => same(q, s)))) g.dot(s, COLOURS.hit, "", 7);
    else g.cross(s);
  }
  if (!won) g.text(aim, "◎", COLOURS.a, 0, 7, "middle", 22);
  g.end();
  $("aim-x").textContent = minus(aim.x);
  $("aim-y").textContent = minus(aim.y);
  $("fire-label").textContent = t().fire(pointText(aim, lang));
  $("fire").hidden = won;
  $("shot").textContent = won ? t().won(shots.length) : lastShot;
  const left = fleet.filter((ship) => !ship.every((q) => shots.some((s) => same(s, q)))).length;
  $("fleet").textContent = won ? "" : t().fleet(left, shots.length);
}
const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));

seaGrid.onTap((p) => {
  aim = pt(p.x, p.y);
  renderSea();
});
document.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) =>
  b.addEventListener("click", () => {
    const [axis, d] = b.dataset.step!.split(",");
    const { min, max } = BOUNDS[range];
    const clamp = (v: number) => Math.max(min, Math.min(max, v));
    aim = axis === "x" ? pt(clamp(aim.x + Number(d)), aim.y) : pt(aim.x, clamp(aim.y + Number(d)));
    renderSea();
  }),
);
$("fire").addEventListener("click", () => {
  const r = shoot(fleet, shots, aim, range);
  lastShot = shotText(r, aim, lang);
  if (r !== "again" && r !== "outside") shots.push(aim);
  renderSea();
});
$("new-game").addEventListener("click", newGame);

// ---------- quiz ----------

function quizPicture(q: CoordQuestion, answered: boolean): Node | null {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "quiz-grid");
  const g = new CoordGrid(svg, view(), t().grid).begin();
  switch (q.kind) {
    case "read":
      g.dot(q.point, COLOURS.a, "P");
      if (answered) g.segment(pt(0, 0), pt(q.point.x, 0), COLOURS.c, 2, "5 4").segment(pt(q.point.x, 0), q.point, COLOURS.b, 2, "5 4");
      break;
    case "find":
      q.marked.forEach((p, i) => g.dot(p, answered && i === q.answer ? COLOURS.c : COLOURS.a, "ABCD"[i]!));
      break;
    case "quadrant":
      if (!answered) return null;
      g.dot(q.point, COLOURS.a, "P");
      break;
    case "shape":
      if (!answered) return null;
      g.polygon(q.points, COLOURS.c);
      q.points.forEach((p, i) => g.dot(p, COLOURS.a, "ABCD"[i]!));
      break;
    case "fourth":
      if (answered) g.polygon([q.a, q.b, q.c, q.d], COLOURS.c).dot(q.d, COLOURS.c, "D");
      [q.a, q.b, q.c].forEach((p, i) => g.dot(p, COLOURS.a, "ABC"[i]!));
      break;
  }
  g.end();
  return svg;
}

const quiz = mountQuiz<CoordQuestion>({
  host: $("quiz"),
  colour: "c-coords",
  makeRound: () => makeCoordRound(range, Math.random),
  prompt: (q, l) => quizPrompt(q, l),
  choices: (q, l) => q.choices.map((c) => quizChoice(q, c, l)),
  answer: (q) => q.answer,
  steps: (q, l) => quizSteps(q, l),
  picture: (q, _l, answered) => quizPicture(q, answered),
  columns: (q) => (q.kind === "find" ? 4 : undefined),
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: UI[l].wrong, score: (c) => UI[l].score(c) }),
});

// ---------- wiring ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll<HTMLButtonElement>("[data-range]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.range === range)));
  renderDraw();
  renderSea();
  quiz.render(lang);
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    lastShot = "";
    render();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-range]").forEach((b) =>
  b.addEventListener("click", () => {
    range = b.dataset.range === "all" ? "all" : "first";
    try {
      localStorage.setItem(RANGE_KEY, range);
    } catch {
      /* not remembered */
    }
    points = points.filter((p) => p.x >= BOUNDS[range].min && p.y >= BOUNDS[range].min);
    newGame();
    quiz.reset();
    render();
  }),
);

newGame();
render();
