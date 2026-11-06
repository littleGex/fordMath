import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/negative-zahlen.css";
import {
  compareInts, distanceFromZero, makeIntRound, makeStory, move, opposite, storyMove, type IntQuestion, type Move, type Op, type Story,
} from "../lib/integers";
import { starsFor } from "../lib/times-tables";
import { STORY_UNIT, choiceText, compareSteps, explainMove, int, moveText, quizPrompt, quizSteps, storyText } from "../explain/integers";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Negative Zahlen", subtitle: "Unter null: Thermometer, Konto, Aufzug",
    bad: "Bitte ganze Zahlen von −1000 bis 1000 eingeben, z. B. −4.",
    rulesTitle: "Die Regeln", compareTitle: "Vergleichen",
    rules: [
      ["+ 5", "5 nach oben"], ["− 5", "5 nach unten"],
      ["+ (−5)", "Plus eine negative Zahl ist wie minus: 5 nach unten"], ["− (−5)", "Minus eine negative Zahl ist wie plus: 5 nach oben"],
    ] as Array<[string, string]>,
    stories: { temperature: "🌡️ Temperatur", account: "🏦 Konto", lift: "🛗 Aufzug" } satisfies Record<Story["kind"], string>,
    opp: (n: string, o: string, d: number) => `Gegenzahl von ${n}: ${o}. Betrag: |${n}| = ${d} (so weit ist es von der 0 weg).`,
    quizTitle: "Quiz", quizIntro: "10 Fragen: vergleichen, Gegenzahl, Betrag, rechnen und Geschichten.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`,
    score: (c: number) => `${c} von 10 richtig`, thermo: (s: string, e: string) => `Von ${s} nach ${e} auf dem Zahlenstrahl`,
  },
  en: {
    title: "Negative numbers", subtitle: "Below zero: thermometer, bank account, lift",
    bad: "Please type whole numbers from −1000 to 1000, e.g. −4.",
    rulesTitle: "The rules", compareTitle: "Comparing",
    rules: [
      ["+ 5", "5 up"], ["− 5", "5 down"],
      ["+ (−5)", "Adding a negative is like subtracting: 5 down"], ["− (−5)", "Subtracting a negative is like adding: 5 up"],
    ] as Array<[string, string]>,
    stories: { temperature: "🌡️ Temperature", account: "🏦 Bank account", lift: "🛗 Lift" } satisfies Record<Story["kind"], string>,
    opp: (n: string, o: string, d: number) => `Opposite of ${n}: ${o}. Absolute value: |${n}| = ${d} (that far from 0).`,
    quizTitle: "Quiz", quizIntro: "10 questions: compare, opposites, absolute value, calculating and stories.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`,
    score: (c: number) => `${c} out of 10 right`, thermo: (s: string, e: string) => `From ${s} to ${e} on the number line`,
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

let lang: Lang = getLang();
let op: Op = "+";
let story: Story | null = null;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });

/** "−4", "-4", "+3", "12" → a whole number from −1000 to 1000; anything else → null. */
function readInt(id: string): number | null {
  const input = $<HTMLInputElement>(id);
  const m = /^([+\-−–]?)\s*(\d{1,4})$/.exec(input.value.trim());
  const n = m ? (m[1] && m[1] !== "+" ? -1 : 1) * Number(m[2]) + 0 : NaN;
  const ok = Number.isInteger(n) && Math.abs(n) <= 1000;
  input.classList.toggle("bad", !ok);
  return ok ? n : null;
}

// ---------- the thermometer: a vertical number line with the move as an arrow ----------

const NS = "http://www.w3.org/2000/svg";
function niceStep(range: number): number {
  for (const s of [1, 2, 5, 10, 20, 50, 100, 200, 500]) if (range / s <= 22) return s;
  return 1000;
}

function drawThermo(m: Move, unit: string): void {
  const svg = $("thermo") as unknown as SVGSVGElement;
  const step = niceStep(Math.max(20, Math.abs(m.start) + Math.abs(m.end), Math.abs(m.start - m.end)));
  const lo = Math.min(-5 * step, Math.floor((Math.min(m.start, m.end, 0) - step) / step) * step);
  const hi = Math.max(5 * step, Math.ceil((Math.max(m.start, m.end, 0) + step) / step) * step);
  const W = 180, top = 16, bottom = 360;
  const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    nodes.push(n);
  };
  const tubeX = 58, tubeW = 16;
  // The tube and the "mercury" up to the end value: blue below zero, red above.
  add("rect", { x: tubeX, y: top - 6, width: tubeW, height: bottom - top + 12, rx: 8, fill: "#0f1626", stroke: "#2c3a58", "stroke-width": 2 });
  add("circle", { cx: tubeX + tubeW / 2, cy: bottom + 14, r: 14, fill: m.end > 0 ? "#ff5566" : "#4fc3f7" });
  add("rect", { x: tubeX + 4, y: y(m.end), width: tubeW - 8, height: bottom + 6 - y(m.end), rx: 4, fill: m.end > 0 ? "#ff5566" : "#4fc3f7" });
  for (let v = lo; v <= hi; v += step) {
    const zero = v === 0;
    add("line", { x1: tubeX - (zero ? 18 : 9), x2: tubeX, y1: y(v), y2: y(v), stroke: zero ? "#eef3fb" : "#6f8296", "stroke-width": zero ? 3 : 1.5 });
    if ((v / step) % 2 === 0 || zero) add("text", { x: tubeX - 22, y: y(v) + 4, "text-anchor": "end", fill: zero ? "#eef3fb" : "#a9b8c9", "font-size": zero ? 14 : 12, "font-weight": zero ? 700 : 500 }, int(v));
  }
  // The move: a dot at the start, an arrow to the end, and the jump written next to it.
  const ax = tubeX + tubeW + 22;
  const colour = m.step > 0 ? "#ff9f43" : "#4fc3f7";
  add("circle", { cx: ax, cy: y(m.start), r: 6, fill: "#eef3fb" });
  if (m.step !== 0) {
    const dir = m.step > 0 ? -1 : 1;
    add("line", { x1: ax, x2: ax, y1: y(m.start), y2: y(m.end) - dir * 10, stroke: colour, "stroke-width": 4, "stroke-linecap": "round" });
    add("path", { d: `M ${ax - 9} ${y(m.end) - dir * 12} L ${ax} ${y(m.end)} L ${ax + 9} ${y(m.end) - dir * 12} Z`, fill: colour });
    add("text", { x: ax + 12, y: (y(m.start) + y(m.end)) / 2 + 5, fill: colour, "font-size": 17, "font-weight": 700 }, `${m.step > 0 ? "+" : "−"}${Math.abs(m.step)}`);
  }
  add("text", { x: ax + 12, y: y(m.start) + 5, fill: "#eef3fb", "font-size": 13 }, int(m.start) + unit);
  add("text", { x: ax + 12, y: y(m.end) + (m.step > 0 ? -6 : 16), fill: "#7cfc00", "font-size": 15, "font-weight": 700 }, int(m.end) + unit);
  svg.setAttribute("viewBox", `0 0 ${W} ${bottom + 32}`);
  svg.setAttribute("aria-label", t().thermo(int(m.start), int(m.end)));
  svg.replaceChildren(...nodes);
}

// ---------- rendering ----------

function renderCalc(): void {
  const a = readInt("a");
  const b = readInt("b");
  document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.op === op)));
  $("calc-error").hidden = a !== null && b !== null;
  $("calc-error").textContent = t().bad;
  $("story").hidden = story === null;
  if (story) $("story").textContent = storyText(story, lang);
  if (a === null || b === null) return;
  const m = move(a, op, b);
  const unit = story ? STORY_UNIT[story.kind] : "";
  drawThermo(m, unit);
  $("calc-result").textContent = `${moveText(m)} = ${int(m.end)}`;
  $("calc-steps").replaceChildren(...explainMove(m, lang).slice(0, -1).map((s) => el("li", s)));
}

function setCalc(m: Move): void {
  $<HTMLInputElement>("a").value = int(m.start);
  $<HTMLInputElement>("b").value = int(m.b);
  op = m.op;
  renderCalc();
}

function renderCompare(): void {
  const a = readInt("cmp-a");
  const b = readInt("cmp-b");
  if (a === null || b === null) {
    $("cmp-sign").textContent = "?";
    $("cmp-steps").replaceChildren();
    $("opp").textContent = "";
    return;
  }
  const c = compareInts(a, b);
  $("cmp-sign").textContent = c < 0 ? "<" : c > 0 ? ">" : "=";
  $("cmp-steps").replaceChildren(...compareSteps(a, b, lang).slice(0, 1).concat(compareSteps(a, b, lang).slice(2)).map((s) => el("li", s)));
  $("opp").textContent = t().opp(int(a), int(opposite(a)), distanceFromZero(a));
}

// ---------- quiz ----------

type Quiz = { round: IntQuestion[]; index: number; picked: number | null; right: number; streak: number; results: boolean[] };
let quiz: Quiz | null = null;

function renderQuiz(): void {
  $("quiz-start").hidden = quiz !== null;
  $("quiz-play").hidden = quiz === null || quiz.index >= 10;
  $("quiz-done").hidden = quiz === null || quiz.index < 10;
  if (!quiz) return;
  if (quiz.index >= 10) {
    const stars = starsFor(quiz.right, 10);
    $("quiz-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("quiz-score").textContent = t().score(quiz.right);
    return;
  }
  const qz = quiz;
  const q = qz.round[qz.index]!;
  $("quiz-progress").replaceChildren(
    ...qz.round.map((_, i) => {
      const dot = document.createElement("i");
      if (i < qz.results.length) dot.className = qz.results[i] ? "ok" : "no";
      else if (i === qz.index) dot.className = "now";
      return dot;
    }),
  );
  $("quiz-streak").textContent = qz.streak >= 3 ? `🔥 ${qz.streak}` : "";
  $("quiz-q").textContent = quizPrompt(q, lang);
  $("quiz-choices").replaceChildren(
    ...q.choices.map((c, i) => {
      const b = el("button", choiceText(q, c)) as HTMLButtonElement;
      b.type = "button";
      b.disabled = qz.picked !== null;
      if (qz.picked !== null && i === q.answer) b.classList.add("right");
      if (qz.picked === i && i !== q.answer) b.classList.add("wrong");
      b.addEventListener("click", () => {
        if (qz.picked !== null) return;
        qz.picked = i;
        const ok = i === q.answer;
        qz.results.push(ok);
        qz.right += ok ? 1 : 0;
        qz.streak = ok ? qz.streak + 1 : 0;
        renderQuiz();
      });
      return b;
    }),
  );
  $("quiz-feedback").hidden = qz.picked === null;
  if (qz.picked !== null) {
    const ok = qz.picked === q.answer;
    $("quiz-verdict").textContent = ok ? t().right : t().wrong(choiceText(q, q.choices[q.answer]!));
    $("quiz-verdict").className = `verdict ${ok ? "ok" : "no"}`;
    $("quiz-steps").replaceChildren(...quizSteps(q, lang).map((s) => el("li", s)));
  }
}

const startQuiz = () => {
  quiz = { round: makeIntRound(Math.random), index: 0, picked: null, right: 0, streak: 0, results: [] };
  renderQuiz();
};
$("quiz-go").addEventListener("click", startQuiz);
$("quiz-again").addEventListener("click", startQuiz);
$("quiz-next").addEventListener("click", () => {
  if (!quiz) return;
  quiz.index++;
  quiz.picked = null;
  renderQuiz();
});

// ---------- wiring ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("stories").replaceChildren(
    ...(["temperature", "account", "lift"] as const).map((kind) => {
      const b = el("button", t().stories[kind], "chip") as HTMLButtonElement;
      b.type = "button";
      b.addEventListener("click", () => {
        let s = makeStory(Math.random);
        while (s.kind !== kind) s = makeStory(Math.random);
        story = s;
        setCalc(storyMove(s));
      });
      return b;
    }),
  );
  $("rules").replaceChildren(
    ...t().rules.map(([sum, words]) => {
      const li = el("li");
      li.append(el("b", sum), document.createTextNode(`: ${words}`));
      return li;
    }),
  );
  renderCalc();
  renderCompare();
  renderQuiz();
}

for (const id of ["a", "b"]) $(id).addEventListener("input", () => { story = null; renderCalc(); });
for (const id of ["cmp-a", "cmp-b"]) $(id).addEventListener("input", renderCompare);
document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((b) =>
  b.addEventListener("click", () => {
    op = b.dataset.op === "-" ? "-" : "+";
    story = null;
    renderCalc();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

story = { kind: "temperature", start: -4, change: 7 };
render();
