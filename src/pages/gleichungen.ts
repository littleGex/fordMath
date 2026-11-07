import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/gleichungen.css";
import {
  apply, choicesFor, hasBracket, LEVELS, makeRound, outcome, readEquation, type Choice, type Level, type LinearEquation,
} from "../lib/linear-equation";
import { equationText, opLabel, opSay, probeText, resultText, verdictText } from "../explain/linear-equation";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Gleichungen lösen", subtitle: "Lineare Gleichungen Schritt für Schritt, wie im Heft",
    levels: { 1: "⚖️ Waage", 2: "x auf beiden Seiten", 3: "Mit Minus", 4: "Klammern", 5: "Sonderfälle" } as Record<Level, string>,
    hint: "Was machst du als Nächstes? Tippe den Schritt an.",
    hintBalance: "Auf der Waage ist links so schwer wie rechts. Was du links wegnimmst, nimmst du auch rechts weg.",
    next: "Nächste Aufgabe", finish: "Fertig!", newTask: "Neue Runde", again: "Noch eine Runde",
    count: (i: number, n: number) => `${i} / ${n}`,
    praise: ["Super gemacht!", "Gut gemacht!", "Weiter üben!"],
    score: (p: number, n: number) => `${p} von ${n} Aufgaben ohne Fehler`,
    ownTitle: "Eigene Gleichung", ownHint: "Tipp eine Gleichung aus dem Heft ein, zum Beispiel 4(x − 1) = 2x + 6 oder x/2 + 3 = 7.", ownGo: "Lösen",
    ownErrors: {
      noEquals: "Eine Gleichung braucht genau ein =.",
      notLinear: "Das ist keine lineare Gleichung: x darf nur einfach vorkommen (kein x² und kein x · x).",
      twoBrackets: "Hier geht höchstens eine Klammer pro Seite.",
      noX: "Da kommt kein x vor.",
      syntax: "Das kann ich nicht lesen. Schreib zum Beispiel 3x + 2 = 11.",
    },
    balance: "Waage mit x-Kisten und Gewichten",
  },
  en: {
    title: "Solving equations", subtitle: "Linear equations step by step, like in the exercise book",
    levels: { 1: "⚖️ Balance", 2: "x on both sides", 3: "With negatives", 4: "Brackets", 5: "Special cases" } as Record<Level, string>,
    hint: "What do you do next? Tap the step.",
    hintBalance: "The balance weighs the same on both sides. Whatever you take off the left, take off the right too.",
    next: "Next equation", finish: "Done!", newTask: "New round", again: "Another round",
    count: (i: number, n: number) => `${i} / ${n}`,
    praise: ["Brilliant!", "Well done!", "Keep practising!"],
    score: (p: number, n: number) => `${p} of ${n} equations with no mistakes`,
    ownTitle: "Your own equation", ownHint: "Type an equation from your exercise book, for example 4(x − 1) = 2x + 6 or x/2 + 3 = 7.", ownGo: "Solve",
    ownErrors: {
      noEquals: "An equation needs exactly one =.",
      notLinear: "That isn't a linear equation: x may only appear on its own (no x² and no x · x).",
      twoBrackets: "At most one bracket per side, please.",
      noX: "There's no x in it.",
      syntax: "I can't read that. Write it like 3x + 2 = 11.",
    },
    balance: "Balance with x boxes and weights",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const LEVEL_KEY = "fm.gleichungen.level";
let lang: Lang = getLang();
let level: Level = readLevel();
let round: LinearEquation[] = [];
let index = 0;
let results: boolean[] = [];
let own = false; // solving the child's own equation, not a round
/** The lines so far: each equation, and the step taken from it. */
let lines: Array<{ eq: LinearEquation; choice?: Choice }> = [];
let choices: Choice[] = [];
let mistakes = 0;
let message: { text: string; ok: boolean } | null = null;
/** Wrong steps already tried on this line: shown red and switched off. */
const triedOps = new Set<Choice>();

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });

function readLevel(): Level {
  try {
    const v = Number(localStorage.getItem(LEVEL_KEY));
    return (LEVELS as readonly number[]).includes(v) ? (v as Level) : 1;
  } catch {
    return 1;
  }
}
function saveLevel(): void {
  try {
    localStorage.setItem(LEVEL_KEY, String(level));
  } catch {
    /* fine: the level just isn't remembered */
  }
}

const current = () => lines[lines.length - 1]!.eq;

function startTask(eq: LinearEquation): void {
  lines = [{ eq }];
  mistakes = 0;
  message = null;
  triedOps.clear();
  choices = choicesFor(eq, Math.random);
  renderPlay();
}

function startRound(): void {
  own = false;
  round = makeRound(level, Math.random);
  index = 0;
  results = [];
  $("play").hidden = false;
  $("done").hidden = true;
  startTask(round[0]!);
}

function pick(c: Choice): void {
  const before = current();
  if (c.verdict !== "best") {
    mistakes++;
    message = { text: verdictText(c.verdict, c.op, before, lang), ok: false };
    triedOps.add(c);
    renderPlay();
    return;
  }
  lines[lines.length - 1]!.choice = c;
  const after = apply(before, c.op);
  lines.push({ eq: after });
  message = null;
  triedOps.clear();
  choices = outcome(after) ? [] : choicesFor(after, Math.random);
  if (outcome(after) && !own) results[index] = mistakes === 0;
  renderPlay();
}
function nextTask(): void {
  if (own) return startRound();
  index++;
  if (index < round.length) return startTask(round[index]!);
  showDone();
}

function showDone(): void {
  $("play").hidden = true;
  $("done").hidden = false;
  const perfect = results.filter(Boolean).length;
  const stars = perfect >= 5 ? 3 : perfect >= 3 ? 2 : 1;
  $("stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  $("praise").textContent = t().praise[3 - stars]!;
  $("score").textContent = t().score(perfect, round.length);
}

// ---------- drawing ----------

function renderPlay(): void {
  const eq = current();
  const done = outcome(eq);
  // progress
  $("dots").replaceChildren(...(own ? [] : round.map((_, i) => el("i", "", i < index ? (results[i] ? "ok" : "no") : i === index ? (done ? (results[i] ? "ok" : "no") : "now") : ""))));
  $("count").textContent = own ? "" : t().count(Math.min(index + 1, round.length), round.length);
  // the exercise book
  const book: HTMLElement[] = [];
  lines.forEach((line, i) => {
    const last = i === lines.length - 1;
    book.push(el("span", equationText(line.eq), `math${last ? (done ? " final" : "") : " old"}`));
    book.push(el("span", line.choice ? opLabel(line.choice.op, lang, true) : "", `op${last ? "" : " old"}`));
    if (line.choice && i === lines.length - 2) book.push(el("p", opSay(line.choice.op, line.eq, lang), "say"));
  });
  $("book").replaceChildren(...book);
  // choices
  $("choices").replaceChildren(...choices.map((c) => {
    const b = el("button", opLabel(c.op, lang)) as HTMLButtonElement;
    b.type = "button";
    if (triedOps.has(c)) {
      b.classList.add("wrong");
      b.disabled = true;
    }
    b.addEventListener("click", () => pick(c));
    return b;
  }));
  $("choices").hidden = !!done;
  const m = $("message");
  m.hidden = !message;
  m.textContent = message?.text ?? "";
  m.classList.toggle("ok", !!message?.ok);
  // the end
  $("end").hidden = !done;
  if (done) {
    $("result").textContent = resultText(eq, done, lang);
    $("probe").textContent = probeText(lines[0]!.eq, done, lang) ?? "";
  }
  $("next").hidden = !done;
  $("next-label").textContent = own ? t().newTask : index === round.length - 1 ? t().finish : t().next;
  const onBalance = drawBalance(eq);
  $("hint").textContent = done ? "" : onBalance ? t().hintBalance : t().hint;
}

/** The balance (Waage), when every number on it is a whole number we can draw. */
function drawBalance(eq: LinearEquation): boolean {
  const fig = $("balance-fig");
  const sides = [eq.left, eq.right];
  const fits = (e: LinearEquation) => [e.left, e.right].every((s) => !hasBracket(s) && [s.x, s.c].every((v) => v.d === 1 && v.n >= 0));
  const ok = fits(lines[0]!.eq) && sides.every((s) => !hasBracket(s) && [s.x, s.c].every((v) => v.d === 1 && v.n >= 0)) &&
    sides.every((s) => s.x.n <= 8 && s.c.n <= 24) && (own || level <= 2);
  fig.hidden = !ok;
  if (!ok) return false;
  const svg = $("balance") as unknown as SVGSVGElement;
  const NS = "http://www.w3.org/2000/svg";
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    nodes.push(n);
  };
  const W = 360, panY = 168, beamY = 54;
  add("polygon", { points: `${W / 2 - 22},196 ${W / 2 + 22},196 ${W / 2},${beamY}`, fill: "#2c3a58" });
  add("line", { x1: 26, x2: W - 26, y1: beamY, y2: beamY, stroke: "#a9b8c9", "stroke-width": 5, "stroke-linecap": "round" });
  add("circle", { cx: W / 2, cy: beamY, r: 6, fill: "#eef3fb" });
  [[18, 168], [192, 342]].forEach(([x0, x1], i) => {
    const mid = (x0! + x1!) / 2;
    add("line", { x1: mid, x2: x0! + 8, y1: beamY, y2: panY, stroke: "#6f8296", "stroke-width": 1.5 });
    add("line", { x1: mid, x2: x1! - 8, y1: beamY, y2: panY, stroke: "#6f8296", "stroke-width": 1.5 });
    add("rect", { x: x0!, y: panY, width: x1! - x0!, height: 8, rx: 4, fill: "#7c8cff" });
    const s = sides[i]!;
    const items: Array<"x" | "w"> = [...Array<"x">(s.x.n).fill("x"), ...Array<"w">(s.c.n).fill("w")];
    const perRow = 8, step = 18;
    items.forEach((kind, k) => {
      const row = Math.floor(k / perRow), col = k % perRow;
      const inRow = Math.min(perRow, items.length - row * perRow);
      const cx = mid - ((inRow - 1) * step) / 2 + col * step;
      const cy = panY - 11 - row * step;
      if (kind === "x") {
        add("rect", { x: cx - 8, y: cy - 8, width: 16, height: 16, rx: 3, fill: "#34d399" });
        add("text", { x: cx, y: cy + 4.5, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "#0c1220" }, "x");
      } else {
        add("circle", { cx, cy, r: 7, fill: "#ffd84d" });
      }
    });
  });
  svg.setAttribute("viewBox", `0 0 ${W} 200`);
  svg.setAttribute("aria-label", t().balance);
  svg.replaceChildren(...nodes);
  return true;
}

// ---------- wiring ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("levels").replaceChildren(...LEVELS.map((lv) => {
    const b = el("button", t().levels[lv], "chip") as HTMLButtonElement;
    b.type = "button";
    b.setAttribute("aria-pressed", String(lv === level && !own));
    b.addEventListener("click", () => {
      level = lv;
      saveLevel();
      startRound();
      render();
    });
    return b;
  }));
  if (message && !message.ok) {
    // Re-say the last explanation in the new language.
    const tried = [...triedOps].at(-1);
    if (tried) message = { text: verdictText(tried.verdict, tried.op, current(), lang), ok: false };
  }
  if (!$("done").hidden) showDone();
  renderPlay();
}

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
$("next").addEventListener("click", nextTask);
$("again").addEventListener("click", startRound);

function solveOwn(): void {
  const r = readEquation($<HTMLInputElement>("own").value);
  const err = $("own-error");
  if (!r.ok) {
    err.textContent = t().ownErrors[r.why];
    err.hidden = false;
    return;
  }
  err.hidden = true;
  own = true;
  $("play").hidden = false;
  $("done").hidden = true;
  startTask(r.equation);
  render();
  $("play").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("own-go").addEventListener("click", solveOwn);
$("own").addEventListener("keydown", (e) => {
  if (e.key === "Enter") solveOwn();
});

startRound();
render();
