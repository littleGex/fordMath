import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/game.css";
import "../styles/kopfrechnen.css";
import {
  MENTAL_LEVELS, answerOf, makeRound, planOf, recordAnswer, type MentalLevel, type MentalQuestion, type Retry,
} from "../lib/mental";
import { starsFor } from "../lib/times-tables";
import { LEVEL_EXAMPLES, LEVEL_NAMES, explainMental, questionText, solvedText } from "../explain/mental";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Kopfrechnen", subtitle: "Plus und Minus bis 1 000",
    levelTitle: "Was möchtest du üben?", timer: "⏱️ Zeit stoppen", start: "Los geht's!",
    tricky: (n: number) => (n ? `Fehler üben (${n})` : "Keine Fehler zum Üben"),
    right: ["Richtig! ⭐", "Super! ⭐", "Klasse! ⭐", "Genau! ⭐"],
    wrong: (q: string) => `Fast! ${q}`,
    next: "Weiter", stop: "Runde beenden",
    score: (c: number, t: number) => `${c} von ${t} richtig`,
    best: (n: number) => `Beste Serie: ${n} 🔥`, time: (t: string) => `Zeit: ${t}`,
    praise: ["Nicht aufgeben, das wird!", "Gut, weiter üben!", "Toll gemacht!", "Super, alles richtig!"],
    mistakes: "Die kommen bald noch mal:", you: (n: string) => `du: ${n}`,
    again: "Noch mal", change: "Anderes üben", del: "Löschen",
    jumps: "Die Sprünge auf dem Zahlenstrahl",
  },
  en: {
    title: "Mental maths", subtitle: "Adding and subtracting up to 1 000",
    levelTitle: "What do you want to practise?", timer: "⏱️ Time me", start: "Let's go!",
    tricky: (n: number) => (n ? `Practise mistakes (${n})` : "No mistakes to practise"),
    right: ["Right! ⭐", "Super! ⭐", "Brilliant! ⭐", "Yes! ⭐"],
    wrong: (q: string) => `Nearly! ${q}`,
    next: "Next", stop: "Stop this round",
    score: (c: number, t: number) => `${c} out of ${t} right`,
    best: (n: number) => `Best streak: ${n} 🔥`, time: (t: string) => `Time: ${t}`,
    praise: ["Don't give up, you'll get there!", "Good, keep practising!", "Well done!", "Amazing, all right!"],
    mistakes: "These will come back soon:", you: (n: string) => `you: ${n}`,
    again: "Again", change: "Practise something else", del: "Delete",
    jumps: "The jumps on the number line",
  },
};
type UiKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];
type Choice = MentalLevel | "mixed";

// ---------- saved on this device ----------
interface Saved {
  level: Choice;
  timer: boolean;
  retries: Retry[];
}
const STORE_KEY = "fm.kopfrechnen.v1";

const isQuestion = (q: unknown): q is MentalQuestion => {
  if (typeof q !== "object" || q === null) return false;
  const x = q as Record<string, unknown>;
  return [x.a, x.b, x.c].every((v) => Number.isInteger(v)) && (x.op === "+" || x.op === "-")
    && (x.missing === "a" || x.missing === "b" || x.missing === "c") && MENTAL_LEVELS.includes(x.level as MentalLevel);
};

/** Reads saved settings without trusting them: anything odd falls back to the default. */
function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as Partial<Saved> | null;
    const level = raw?.level;
    return {
      level: level === "mixed" || MENTAL_LEVELS.includes(level as MentalLevel) ? (level as Choice) : 1,
      timer: raw?.timer === true,
      retries: Array.isArray(raw?.retries) ? raw.retries.filter((r) => isQuestion(r?.q) && Number.isInteger(r.box)) : [],
    };
  } catch {
    return { level: 1, timer: false, retries: [] };
  }
}
let saved = load();
let lang: Lang = getLang();
function save(): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* storage blocked: progress lasts until the tab closes */ }
}

// ---------- game state ----------
type Mistake = { q: MentalQuestion; given: string };
type State =
  | { screen: "setup" }
  | {
      screen: "play"; round: MentalQuestion[]; index: number; typed: string; correct: number;
      streak: number; bestStreak: number; mistakes: Mistake[]; startedAt: number; feedback: null | "ok" | "no";
    }
  | { screen: "result"; correct: number; total: number; bestStreak: number; seconds: number | null; mistakes: Mistake[] };
let state: State = { screen: "setup" };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });

// ---------- rendering ----------
function renderText(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as UiKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelector('[data-key="del"]')!.setAttribute("aria-label", t().del);
}

function renderSetup(): void {
  const choices: Choice[] = [...MENTAL_LEVELS, "mixed"];
  $("levels").replaceChildren(
    ...choices.map((c) => {
      const b = el("button", "", "level-pick") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("aria-pressed", String(saved.level === c));
      b.append(el("b", LEVEL_NAMES[lang][c]), el("span", LEVEL_EXAMPLES[c]));
      b.addEventListener("click", () => {
        saved.level = c;
        save();
        renderSetup();
      });
      return b;
    }),
  );
  $("timer").setAttribute("aria-pressed", String(saved.timer));
  const n = saved.retries.length;
  $<HTMLButtonElement>("tricky").disabled = n === 0;
  $("tricky-label").textContent = t().tricky(n);
}

/** The question with the typed answer where the "?" is. */
function renderQuestion(q: MentalQuestion, shown: string): void {
  const parts = questionText(q).split("?");
  const answer = el("span", shown, "answer");
  $("question-card").replaceChildren(document.createTextNode(parts[0]!), answer, document.createTextNode(parts[1] ?? ""));
}

function renderPlay(): void {
  if (state.screen !== "play") return;
  const s = state;
  const q = s.round[s.index]!;
  $("progress").replaceChildren(
    ...s.round.map((_, i) => {
      const dot = document.createElement("i");
      if (i < s.index || (i === s.index && s.feedback)) dot.className = s.mistakes.some((m) => m.q === s.round[i]) ? "no" : "ok";
      else if (i === s.index) dot.className = "now";
      return dot;
    }),
  );
  $("streak").textContent = s.streak >= 3 ? `🔥 ${s.streak}` : "";
  renderQuestion(q, s.feedback === "no" ? String(answerOf(q)) : s.typed || "?");
  $("question-card").classList.toggle("ok", s.feedback === "ok");
  $("question-card").classList.toggle("no", s.feedback === "no");

  $("feedback").hidden = s.feedback === null;
  document.querySelectorAll<HTMLButtonElement>("#keypad button").forEach((b) => (b.disabled = s.feedback !== null));
  $("keypad").hidden = s.feedback === "no";
  const verdict = $("verdict");
  if (s.feedback === "ok") {
    verdict.textContent = t().right[s.correct % 4]!;
    verdict.className = "verdict ok";
    $("jumps-fig").hidden = true;
    $("working").hidden = true;
    $("next").hidden = true;
  } else if (s.feedback === "no") {
    verdict.textContent = t().wrong(solvedText(q));
    verdict.className = "verdict no";
    drawJumps(q);
    $("working").replaceChildren(...explainMental(q, lang).map((line) => el("li", line)));
    $("working").hidden = false;
    $("next").hidden = false;
    $("next").focus();
  }
}

function renderResult(): void {
  if (state.screen !== "result") return;
  const s = state;
  const stars = starsFor(s.correct, s.total);
  $("stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  $("praise").textContent = t().praise[stars]!;
  $("score").textContent = t().score(s.correct, s.total);
  const extra = [t().best(s.bestStreak)];
  if (s.seconds !== null) extra.push(t().time(`${Math.floor(s.seconds / 60)}:${String(s.seconds % 60).padStart(2, "0")}`));
  $("result-extra").textContent = extra.join(" · ");
  $("mistakes-box").hidden = s.mistakes.length === 0;
  $("mistakes").replaceChildren(
    ...s.mistakes.map(({ q, given }) => {
      const li = el("li", solvedText(q));
      li.append(el("span", t().you(given)));
      return li;
    }),
  );
}

function render(): void {
  renderText();
  $("setup").hidden = state.screen !== "setup";
  $("play").hidden = state.screen !== "play";
  $("result").hidden = state.screen !== "result";
  if (state.screen === "setup") renderSetup();
  if (state.screen === "play") renderPlay();
  if (state.screen === "result") renderResult();
}

// ---------- the jumps on a number line ----------
const NS = "http://www.w3.org/2000/svg";
function drawJumps(q: MentalQuestion): void {
  const svg = $("jumps") as unknown as SVGSVGElement;
  const p = planOf(q);
  const stops = p.jumps.reduce<number[]>((acc, j) => [...acc, acc.at(-1)! + j], [p.start]);
  const lo = Math.min(...stops);
  const hi = Math.max(...stops);
  const W = 360, L = 30, R = W - 30, axisY = 96;
  // Wide jumps get more room than small ones, but a small jump never shrinks to nothing.
  const widths = p.jumps.map((j) => Math.max(Math.abs(j), (hi - lo) * 0.25));
  const total = widths.reduce((x, w) => x + w, 0);
  const xs = [L];
  const leftToRight = p.jumps[0]! > 0;
  widths.forEach((w) => xs.push(xs.at(-1)! + (w / total) * (R - L)));
  // Jumps to the left start at the right-hand end, so smaller numbers are always on the left.
  const xOf = (i: number) => (leftToRight ? xs[i]! : L + R - xs[i]!);
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    nodes.push(n);
  };
  add("line", { x1: 10, x2: W - 10, y1: axisY, y2: axisY, stroke: "#2c3a58", "stroke-width": 3, "stroke-linecap": "round" });
  const colours = ["#ff9ad5", "#4fc3f7", "#ffd84d"];
  p.jumps.forEach((j, i) => {
    const x1 = xOf(i), x2 = xOf(i + 1), mid = (x1 + x2) / 2;
    const h = Math.min(60, Math.abs(x2 - x1) * 0.55 + 18);
    add("path", { d: `M ${x1} ${axisY} Q ${mid} ${axisY - h * 1.6} ${x2} ${axisY}`, fill: "none", stroke: colours[i % 3]!, "stroke-width": 3 });
    add("text", { x: mid, y: axisY - h * 0.8 - 6, "text-anchor": "middle", fill: colours[i % 3]!, "font-size": 18, "font-weight": 700 }, `${j > 0 ? "+" : "−"}${Math.abs(j)}`);
  });
  stops.forEach((v, i) => {
    const x = xOf(i);
    add("line", { x1: x, x2: x, y1: axisY - 8, y2: axisY + 8, stroke: "#eef3fb", "stroke-width": 2.5 });
    const last = i === stops.length - 1;
    add("text", { x, y: axisY + 30, "text-anchor": "middle", fill: last ? "#7cfc00" : "#a9b8c9", "font-size": last ? 19 : 16, "font-weight": last ? 700 : 500 }, String(v));
  });
  svg.setAttribute("viewBox", `0 0 ${W} 136`);
  svg.setAttribute("aria-label", t().jumps);
  svg.replaceChildren(...nodes);
  $("jumps-fig").hidden = false;
}

// ---------- actions ----------
function startRound(retriesOnly: boolean): void {
  const level = saved.level;
  let round: MentalQuestion[];
  if (retriesOnly) {
    round = saved.retries.map((r) => r.q).slice(0, 10);
    if (round.length === 0) return;
  } else round = makeRound(level, Math.random, saved.retries);
  state = { screen: "play", round, index: 0, typed: "", correct: 0, streak: 0, bestStreak: 0, mistakes: [], startedAt: Date.now(), feedback: null };
  render();
}

let advanceTimer: number | undefined;

function press(key: string): void {
  if (state.screen !== "play") return;
  const s = state;
  if (s.feedback === "no" && key === "ok") return next();
  if (s.feedback !== null) return;
  if (/^\d$/.test(key) && s.typed.length < 4) s.typed = (s.typed + key).replace(/^0+(?=\d)/, "");
  else if (key === "del") s.typed = s.typed.slice(0, -1);
  else if (key === "ok" && s.typed !== "") return check();
  renderPlay();
}

function check(): void {
  if (state.screen !== "play") return;
  const s = state;
  const q = s.round[s.index]!;
  const ok = Number(s.typed) === answerOf(q);
  saved.retries = recordAnswer(saved.retries, q, ok);
  save();
  if (ok) {
    s.correct++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.feedback = "ok";
    renderPlay();
    advanceTimer = window.setTimeout(next, 750);
  } else {
    s.streak = 0;
    s.mistakes.push({ q, given: s.typed });
    s.feedback = "no";
    renderPlay();
  }
}

function next(): void {
  window.clearTimeout(advanceTimer);
  if (state.screen !== "play") return;
  const s = state;
  if (s.index + 1 >= s.round.length) return finish();
  s.index++;
  s.typed = "";
  s.feedback = null;
  renderPlay();
}

function finish(): void {
  if (state.screen !== "play") return;
  const s = state;
  state = {
    screen: "result", correct: s.correct, total: s.index + (s.feedback ? 1 : 0), bestStreak: s.bestStreak, mistakes: s.mistakes,
    seconds: saved.timer ? Math.round((Date.now() - s.startedAt) / 1000) : null,
  };
  render();
  window.scrollTo({ top: 0 });
}

// ---------- events ----------
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
$("timer").addEventListener("click", () => {
  saved.timer = !saved.timer;
  save();
  renderSetup();
});
$("start").addEventListener("click", () => startRound(false));
$("tricky").addEventListener("click", () => startRound(true));
$("again").addEventListener("click", () => startRound(false));
$("change").addEventListener("click", () => { state = { screen: "setup" }; render(); });
$("stop").addEventListener("click", finish);
$("next").addEventListener("click", next);
document.querySelectorAll<HTMLButtonElement>("#keypad button").forEach((b) => b.addEventListener("click", () => press(b.dataset.key!)));
document.addEventListener("keydown", (e) => {
  if (state.screen !== "play") return;
  if (/^\d$/.test(e.key)) press(e.key);
  else if (e.key === "Backspace") press("del");
  else if (e.key === "Enter") { e.preventDefault(); press("ok"); }
});

render();
