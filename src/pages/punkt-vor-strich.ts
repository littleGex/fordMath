import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/punkt-vor-strich.css";
import {
  allowedPaths, collapse, evaluate, getAt, makeBracketTask, makeOrderTask, parse, schoolText, toTokens, whyNot,
  type BracketTask, type Expr, type OrderLevel, type Rule,
} from "../lib/expression";
import { starsFor } from "../lib/times-tables";
import { LEVEL_NAMES, RULES, bracketPrompt, bracketSteps, partText, ruleMessage } from "../explain/order";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const ROUND = 5;

const UI = {
  de: {
    title: "Punkt vor Strich", subtitle: "Welche Rechnung kommt zuerst?",
    modeSteps: "Schritt für Schritt", modeBrackets: "Klammern setzen",
    hint: "Tippe auf das Rechenzeichen, das zuerst dran ist.",
    target: "Ergebnis soll sein:", again: "Neue Runde", next: "Weiter", finish: "Fertig",
    count: (i: number) => `Aufgabe ${i} von ${ROUND}`,
    tryAgain: "Nicht ganz. Versuch es noch einmal!",
    shown: (q: string, v: number) => `Das ist ${q} = ${v}. Weiter geht's!`,
    solved: (v: number, clean: boolean) => (clean ? `Super! Das Ergebnis ist ${v}.` : `Geschafft! Das Ergebnis ist ${v}.`),
    right: "Richtig!", wrong: "Leider nicht.",
    score: (r: number) => `${r} von ${ROUND} ohne Fehler`,
    praise: ["Weiter üben!", "Gut gemacht!", "Sehr gut!", "Perfekt! 🎉"],
  },
  en: {
    title: "Order of operations", subtitle: "Which sum comes first?",
    modeSteps: "Step by step", modeBrackets: "Place the brackets",
    hint: "Tap the sign that comes first.",
    target: "It should make:", again: "New round", next: "Next", finish: "Done",
    count: (i: number) => `Sum ${i} of ${ROUND}`,
    tryAgain: "Not quite. Have another go!",
    shown: (q: string, v: number) => `That's ${q} = ${v}. Let's carry on!`,
    solved: (v: number, clean: boolean) => (clean ? `Great! The answer is ${v}.` : `Done! The answer is ${v}.`),
    right: "Right!", wrong: "Not this one.",
    score: (r: number) => `${r} of ${ROUND} without a mistake`,
    praise: ["Keep practising!", "Well done!", "Very good!", "Perfect! 🎉"],
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

type Mode = "steps" | "brackets";
/** Messages are kept as functions of the language, so switching DE/EN rewrites them too. */
type Message = { tone: "ok" | "no" | "info"; text: (lang: Lang) => string };

interface StepsTask {
  kind: "steps";
  now: Expr;
  lines: string[]; // the lines already worked out, above the current one
  chosen: string | null; // path of the operation being worked out
  typed: string;
  misses: number; // wrong values for the chosen operation
  wrongTap: string | null; // shake this operator
  hotRule: Rule | null;
}
interface BracketsTask { kind: "brackets"; task: BracketTask; picked: number | null }

interface State {
  mode: Mode;
  level: OrderLevel;
  index: number; // which task of the round
  results: boolean[]; // per finished task: done without a mistake?
  slip: boolean; // a mistake in the current task
  task: StepsTask | BracketsTask;
  message: Message | null;
  finished: boolean; // current task done, waiting for "next"
  over: boolean; // round over
}

let lang: Lang = getLang();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text: string, cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });

function newTask(mode: Mode, level: OrderLevel): State["task"] {
  if (mode === "brackets") return { kind: "brackets", task: makeBracketTask(Math.random), picked: null };
  return { kind: "steps", now: makeOrderTask(level, Math.random), lines: [], chosen: null, typed: "", misses: 0, wrongTap: null, hotRule: null };
}

let s: State = startState("steps", 1);

function startState(mode: Mode, level: OrderLevel): State {
  return { mode, level, index: 0, results: [], slip: false, task: newTask(mode, level), message: null, finished: false, over: false };
}

// ---------- Schritt für Schritt ----------

function tapOp(path: string): void {
  const task = s.task;
  if (task.kind !== "steps" || s.finished) return;
  const rule = whyNot(task.now, path);
  task.wrongTap = null;
  task.hotRule = rule;
  if (rule === null) {
    task.chosen = path;
    task.typed = "";
    task.misses = 0;
    s.message = null;
  } else {
    s.slip = true;
    task.wrongTap = path;
    const first = partText(task.now, allowedPaths(task.now)[0]!);
    s.message = { tone: "no", text: (l) => ruleMessage(rule, first, l) };
  }
  render();
}

function press(key: string): void {
  const task = s.task;
  if (task.kind !== "steps" || task.chosen === null || s.finished) return;
  if (key === "del") task.typed = task.typed.slice(0, -1);
  else if (key === "ok") return check(task);
  else if (task.typed.length < 4) task.typed = (task.typed + key).replace(/^0+(?=\d)/, "");
  render();
}

function check(task: StepsTask): void {
  if (task.typed === "" || task.chosen === null) return;
  const part = partText(task.now, task.chosen);
  const value = evaluate(getAt(task.now, task.chosen), 0);
  if (Number(task.typed) !== value) {
    s.slip = true;
    task.misses++;
    task.typed = "";
    if (task.misses < 2) {
      s.message = { tone: "no", text: (l) => UI[l].tryAgain };
      return render();
    }
    s.message = { tone: "info", text: (l) => UI[l].shown(part, value) };
  } else {
    s.message = null;
  }
  task.lines.push(schoolText(task.now));
  task.now = collapse(task.now, task.chosen);
  task.chosen = null;
  task.typed = "";
  task.hotRule = null;
  if (task.now.type === "num") {
    const result = task.now.value;
    const clean = !s.slip;
    s.finished = true;
    s.message = { tone: "ok", text: (l) => UI[l].solved(result, clean) };
  }
  render();
}

function renderSteps(task: StepsTask): void {
  const working = $("working");
  const old = task.lines.map((line, i) => {
    const row = el("div", "", "line old");
    if (i > 0) row.append(el("span", "=", "eq"));
    row.append(el("span", line));
    return row;
  });

  const current = el("div", "", `line${s.finished ? " final" : ""}`);
  if (task.lines.length > 0) current.append(el("span", "=", "eq"));
  const tokens = toTokens(task.now);
  const chosenAt = tokens.findIndex((tk) => tk.kind === "op" && tk.path === task.chosen);
  tokens.forEach((tk, i) => {
    const near = chosenAt >= 0 && Math.abs(i - chosenAt) === 1;
    if (tk.kind === "op") {
      const b = el("button", tk.text, "op") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("aria-pressed", String(tk.path === task.chosen));
      if (tk.path === task.wrongTap) b.classList.add("wrong");
      b.addEventListener("click", () => tapOp(tk.path));
      current.append(b);
    } else {
      current.append(el("span", tk.text, tk.kind === "paren" ? "paren" : near ? "hl" : ""));
    }
  });
  working.replaceChildren(...old, current);

  $("hint").hidden = s.finished;
  $("hint").textContent = t().hint;
  $("ask").hidden = task.chosen === null;
  if (task.chosen !== null) {
    $("ask-q").textContent = `${partText(task.now, task.chosen)} =`;
    $("ask-a").textContent = task.typed || "?";
  }
  $("keypad").hidden = task.chosen === null || s.finished;
  document.querySelectorAll<HTMLLIElement>("#rules li").forEach((li, i) => {
    const hot: Rule[] = ["brackets", "punkt-vor-strich", "left-to-right"];
    li.classList.toggle("hot", task.hotRule === hot[i]);
  });
}

// ---------- Klammern setzen ----------

function pick(i: number): void {
  const task = s.task;
  if (task.kind !== "brackets" || task.picked !== null) return;
  task.picked = i;
  s.slip = i !== task.task.answer;
  s.finished = true;
  s.message = s.slip ? { tone: "no", text: (l) => UI[l].wrong } : { tone: "ok", text: (l) => UI[l].right };
  render();
}

function renderBrackets(task: BracketsTask): void {
  const b = task.task;
  $("b-prompt").textContent = bracketPrompt(b, lang).split(": ").slice(1).join(": ");
  $("b-target").textContent = String(b.target);
  $("b-choices").replaceChildren(
    ...b.options.map((o, i) => {
      const btn = el("button", o) as HTMLButtonElement;
      btn.type = "button";
      btn.disabled = task.picked !== null;
      if (task.picked !== null && i === b.answer) btn.classList.add("right");
      if (task.picked === i && i !== b.answer) btn.classList.add("wrong");
      btn.addEventListener("click", () => pick(i));
      return btn;
    }),
  );
  const steps = $("b-steps");
  steps.hidden = task.picked === null;
  if (task.picked !== null) steps.replaceChildren(...bracketSteps(b, lang, parse).map((line) => el("li", line)));
  $("keypad").hidden = true;
  document.querySelectorAll("#rules li").forEach((li) => li.classList.remove("hot"));
}

// ---------- the round ----------

function next(): void {
  s.results.push(!s.slip);
  if (s.results.length >= ROUND) {
    s.over = true;
    return render();
  }
  s = { ...s, index: s.index + 1, slip: false, task: newTask(s.mode, s.level), message: null, finished: false };
  render();
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === s.mode)));

  const levels = $("levels");
  levels.hidden = s.mode !== "steps";
  levels.replaceChildren(
    ...([1, 2, 3, 4] as const).map((lv) => {
      const b = el("button", LEVEL_NAMES[lang][lv], "chip") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("aria-pressed", String(lv === s.level));
      b.addEventListener("click", () => {
        s = startState("steps", lv);
        render();
      });
      return b;
    }),
  );
  const hot = [...document.querySelectorAll("#rules li")].map((li) => li.classList.contains("hot"));
  $("rules").replaceChildren(...RULES[lang].map((r, i) => el("li", r, hot[i] ? "hot" : "")));

  $("play").hidden = s.over;
  $("done").hidden = !s.over;
  if (s.over) {
    const right = s.results.filter(Boolean).length;
    const stars = starsFor(right, ROUND);
    $("stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("praise").textContent = t().praise[stars]!;
    $("score").textContent = t().score(right);
    return;
  }

  $("dots").replaceChildren(
    ...Array.from({ length: ROUND }, (_, i) => {
      const dot = document.createElement("i");
      if (i < s.results.length) dot.className = s.results[i] ? "ok" : "no";
      else if (i === s.index) dot.className = "now";
      return dot;
    }),
  );
  $("count").textContent = t().count(s.index + 1);

  $("steps-play").hidden = s.task.kind !== "steps";
  $("brackets-play").hidden = s.task.kind !== "brackets";
  if (s.task.kind === "steps") renderSteps(s.task);
  else renderBrackets(s.task);

  const msg = $("message");
  msg.hidden = s.message === null;
  if (s.message) {
    msg.className = `message ${s.message.tone}`;
    msg.textContent = s.message.text(lang);
  }
  $("next").hidden = !s.finished;
  $("next-label").textContent = s.results.length + 1 >= ROUND ? t().finish : t().next;
}

// ---------- wiring ----------

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) =>
  b.addEventListener("click", () => {
    const mode: Mode = b.dataset.mode === "brackets" ? "brackets" : "steps";
    if (mode === s.mode) return;
    s = startState(mode, s.level);
    render();
  }),
);
document.querySelectorAll<HTMLButtonElement>("#keypad button").forEach((b) => b.addEventListener("click", () => press(b.dataset.key!)));
$("next").addEventListener("click", next);
$("again").addEventListener("click", () => {
  s = startState(s.mode, s.level);
  render();
});
document.addEventListener("keydown", (e) => {
  if (/^\d$/.test(e.key)) press(e.key);
  else if (e.key === "Backspace") press("del");
  else if (e.key === "Enter") {
    if (s.finished && !s.over) next();
    else press("ok");
  }
});

render();
