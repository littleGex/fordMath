import "./sw-register";
import "../styles/zone.css";
import "../styles/stellenwerte.css";
import "../styles/quiz.css";
import { mountQuiz } from "./quiz";
import {
  MAX_PLACE_NUMBER, digitAt, makePlaceRound, roundTo, setDigit, type PlaceLevel, type PlaceQuestion, type Rounding,
} from "../lib/place-value";
import { randomInt } from "../lib/random";
import { PLACE_LONG, PLACE_SHORT, questionSteps, questionText, roundSteps, show, splitText, words } from "../explain/place-value";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Stellenwerte", subtitle: "Stellenwerttafel, Zahlwörter und Runden",
    random: "🎲 Neue Zahl", tableTitle: "Stellenwerttafel", inWords: "In Worten:",
    roundTitle: "Runden", quizTitle: "Üben", quizIntro: "10 Aufgaben: runden, Stellenwerte, Zahlwörter und Zahlenstrahl. Die Größe kommt von deiner Auswahl oben.",
    quizGo: "Los geht's!", next: "Weiter", again: "Nochmal üben",
    right: "Richtig! ⭐", wrong: "Nicht ganz. So geht's:", score: (c: number, t: number) => `${c} von ${t} richtig`,
    error: "Bitte eine ganze Zahl ohne Komma, höchstens 999 999 999 999.",
    roundTo: (p: string) => `auf ${p}`, up: "Ziffer höher", down: "Ziffer niedriger",
    levels: { 1000: "bis 1 000", 1000000: "bis 1 Million", 1000000000: "bis 1 Milliarde" },
  },
  en: {
    title: "Place value", subtitle: "Place-value table, numbers in words, and rounding",
    random: "🎲 New number", tableTitle: "Place-value table", inWords: "In words:",
    roundTitle: "Rounding", quizTitle: "Practise", quizIntro: "10 questions: rounding, place value, numbers in words and number lines. The size comes from your choice above.",
    quizGo: "Let's go!", next: "Next", again: "Practise again",
    right: "Right! ⭐", wrong: "Not quite. Here's how:", score: (c: number, t: number) => `${c} out of ${t} right`,
    error: "Please type a whole number, at most 999,999,999,999.",
    roundTo: (p: string) => `to ${p}`, up: "digit up", down: "digit down",
    levels: { 1000: "up to 1,000", 1000000: "up to 1 million", 1000000000: "up to 1 billion" },
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

// ---------- state ----------
interface Settings {
  level: PlaceLevel;
}
const KEY = "fm.stellenwerte.v1";
function loadSettings(): Settings {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Settings> | null;
    if (r && (r.level === 1_000 || r.level === 1_000_000 || r.level === 1_000_000_000)) return { level: r.level };
  } catch { /* defaults */ }
  return { level: 1_000 };
}
const settings = loadSettings();
const saveSettings = () => {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* not remembered */ }
};

let lang: Lang = getLang();
let n = 0;
let roundPlace = 1;


const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const input = $<HTMLInputElement>("number");
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });

// ---------- Stellenwerttafel ----------
function renderTable(): void {
  const columns = Math.max(String(settings.level - 1).length, String(n).length);
  const cols: HTMLElement[] = [];
  for (let place = columns - 1; place >= 0; place--) {
    const col = el("div", "", `pv-col g${Math.floor(place / 3) % 4}`);
    const digit = digitAt(n, place);
    const lead = place >= String(n).length;
    const up = el("button", "▲", "pv-step") as HTMLButtonElement;
    const down = el("button", "▼", "pv-step") as HTMLButtonElement;
    up.type = down.type = "button";
    up.setAttribute("aria-label", `${PLACE_LONG[lang][place]}: ${t().up}`);
    down.setAttribute("aria-label", `${PLACE_LONG[lang][place]}: ${t().down}`);
    up.addEventListener("click", () => changeDigit(place, (digit + 1) % 10));
    down.addEventListener("click", () => changeDigit(place, (digit + 9) % 10));
    const head = el("span", PLACE_SHORT[lang][place]!, "pv-head");
    head.title = PLACE_LONG[lang][place]!;
    col.append(head, up, el("span", lead ? "0" : String(digit), `pv-digit ${lead ? "lead" : ""}`), down);
    cols.push(col);
  }
  const table = $("pv-table");
  table.style.gridTemplateColumns = `repeat(${columns}, auto)`;
  table.replaceChildren(...cols);
  const [places, values] = splitText(n, lang);
  $("split-places").textContent = places;
  $("split-values").textContent = values;
  $("words").textContent = words(n, lang);
}

function changeDigit(place: number, digit: number): void {
  n = setDigit(n, place, digit);
  input.value = show(n, lang);
  renderNumber();
}

// ---------- rounding on a number line ----------
const NS = "http://www.w3.org/2000/svg";
function svg(parent: SVGSVGElement, tag: string, attrs: Record<string, string | number>, text?: string): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
  return e;
}

function drawRoundLine(r: Rounding): void {
  const line = $("round-line") as unknown as SVGSVGElement;
  line.replaceChildren();
  const L = 40, R = 560, Y = 78;
  const X = (v: number) => L + ((v - r.lower) / (r.upper - r.lower)) * (R - L);
  svg(line, "line", { x1: L, x2: R, y1: Y, y2: Y, stroke: "#9fb0c8", "stroke-width": 3 });
  for (let i = 0; i <= 10; i++) {
    const x = L + (i / 10) * (R - L);
    const tall = i === 0 || i === 5 || i === 10;
    svg(line, "line", { x1: x, x2: x, y1: Y - (tall ? 14 : 7), y2: Y + (tall ? 14 : 7), stroke: i === 5 ? "#ffb347" : "#9fb0c8", "stroke-width": tall ? 3 : 2 });
  }
  // End labels grow inwards from the ends, so long numbers like 247 000 000 aren't cut off.
  svg(line, "text", { x: L - 8, y: Y + 40, "text-anchor": "start", class: r.result === r.lower ? "r-label" : "" }, show(r.lower, lang));
  svg(line, "text", { x: R + 8, y: Y + 40, "text-anchor": "end", class: r.result === r.upper ? "r-label" : "" }, show(r.upper, lang));
  // the number, and an arrow to the round number it goes to
  const x = X(r.n);
  const target = X(r.result);
  svg(line, "path", {
    d: `M${x} ${Y - 18} Q${(x + target) / 2} ${Y - 52} ${target} ${Y - 18}`,
    fill: "none", stroke: "#ffd84d", "stroke-width": 3, "stroke-dasharray": "6 5",
  });
  svg(line, "circle", { cx: target, cy: Y - 18, r: 5, fill: "#ffd84d" });
  svg(line, "circle", { cx: x, cy: Y, r: 9, fill: "#eef3fb" });
  const anchor = x < 120 ? "start" : x > 480 ? "end" : "middle";
  svg(line, "text", { x, y: 22, "text-anchor": anchor, class: "n-label" }, show(r.n, lang));
  line.setAttribute("aria-label", `${show(r.n, lang)} ≈ ${show(r.result, lang)}`);
}

function renderRounding(): void {
  const maxPlace = Math.max(1, String(n).length - 1);
  if (roundPlace > maxPlace) roundPlace = maxPlace;
  $("round-places").replaceChildren(
    ...Array.from({ length: maxPlace }, (_, i) => {
      const place = i + 1;
      const b = el("button", t().roundTo(PLACE_LONG[lang][place]!), "chip") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("aria-pressed", String(place === roundPlace));
      b.addEventListener("click", () => {
        roundPlace = place;
        renderRounding();
      });
      return b;
    }),
  );
  const r = roundTo(n, roundPlace);
  drawRoundLine(r);
  $("round-steps").replaceChildren(...roundSteps(r, lang).map((s) => el("li", s)));
}

// ---------- quiz ----------
/** The number line for "which number is the arrow pointing at?". */
function quizLine(q: Extract<PlaceQuestion, { kind: "number-line" }>): Node {
  const fig = Object.assign(document.createElement("figure"), { className: "nl" });
  const line = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  line.setAttribute("viewBox", "0 0 600 110");
  line.setAttribute("role", "img");
  const L = 40, R = 560, Y = 66;
  svg(line, "line", { x1: L, x2: R, y1: Y, y2: Y, stroke: "#9fb0c8", "stroke-width": 3 });
  for (let i = 0; i <= 10; i++) {
    const x = L + (i / 10) * (R - L);
    svg(line, "line", { x1: x, x2: x, y1: Y - 10, y2: Y + 10, stroke: "#9fb0c8", "stroke-width": i % 5 === 0 ? 3 : 2 });
  }
  svg(line, "text", { x: L - 8, y: Y + 36, "text-anchor": "start" }, show(q.lower, lang));
  svg(line, "text", { x: R + 8, y: Y + 36, "text-anchor": "end" }, show(q.lower + 10 * q.step, lang));
  const x = L + ((q.n - q.lower) / (10 * q.step)) * (R - L);
  svg(line, "path", { d: `M${x} ${Y - 14} l-11 -20 h22 z`, fill: "#ffd84d" });
  line.setAttribute("aria-label", `${show(q.lower, lang)} – ${show(q.lower + 10 * q.step, lang)}`);
  fig.append(line);
  return fig;
}

const quiz = mountQuiz<PlaceQuestion>({
  host: $("quiz"),
  colour: "c-place",
  makeRound: () => makePlaceRound(settings.level, Math.random),
  prompt: (q, l) => questionText(q, l),
  choices: (q, l) => q.choices.map((c) => show(c, l)),
  answer: (q) => q.answer,
  steps: (q, l) => questionSteps(q, l),
  picture: (q) => (q.kind === "number-line" ? quizLine(q) : null),
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: () => UI[l].wrong, score: UI[l].score }),
});

// ---------- page ----------
function renderNumber(): void {
  renderTable();
  renderRounding();
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) => {
    const level = Number(b.dataset.level) as PlaceLevel;
    b.textContent = t().levels[level];
    b.setAttribute("aria-pressed", String(level === settings.level));
  });
  renderNumber();
  quiz.render(lang);
}

function readInput(): void {
  const raw = input.value.replace(/[\s., ]/g, "");
  const ok = /^\d+$/.test(raw) && Number(raw) <= MAX_PLACE_NUMBER;
  $("error").textContent = ok ? "" : t().error;
  $("error").hidden = ok;
  $("content").hidden = !ok;
  if (!ok) return;
  n = Number(raw);
  renderNumber();
}

function randomNumber(): void {
  n = randomInt(Math.random, settings.level / 10, settings.level - 1);
  input.value = show(n, lang);
  $("error").hidden = true;
  $("content").hidden = false;
  roundPlace = Math.max(1, String(n).length - 2);
  renderNumber();
}

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    input.value = show(n, lang);
    render();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) =>
  b.addEventListener("click", () => {
    settings.level = Number(b.dataset.level) as PlaceLevel;
    saveSettings();
    quiz.reset();
    randomNumber();
    render();
  }),
);
input.addEventListener("input", readInput);
$("random").addEventListener("click", randomNumber);

n = settings.level === 1_000 ? 572 : settings.level === 1_000_000 ? 304_572 : 3_405_210;
input.value = show(n, lang);
roundPlace = Math.max(1, String(n).length - 2);
render();
