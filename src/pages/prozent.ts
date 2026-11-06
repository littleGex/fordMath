import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/prozent.css";
import { PERCENT_FRACTIONS, makePercentRound, solve, type PercentProblem, type PercentQuestion } from "../lib/percent";
import { parseRational, type Rational } from "../lib/rational";
import { choiceText, dreisatz, formula, num, quizPrompt, quizSteps, quizUnit } from "../explain/percent";
import type { Lang } from "../explain/lang";
import { mountQuiz } from "./quiz";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Prozentrechnung", subtitle: "Grundwert, Prozentwert und Prozentsatz",
    hint: "Trag zwei der drei Werte ein, der dritte wird ausgerechnet.",
    gName: "Grundwert", wName: "Prozentwert", pName: "Prozentsatz",
    dreisatzTitle: "Mit dem Dreisatz", formulaTitle: "Mit der Formel", fractionsTitle: "Prozente als Brüche",
    tooMany: "Lass genau ein Feld leer: Das wird ausgerechnet.", bad: "Bitte Zahlen eingeben, z. B. 80 oder 12,5.", zero: "Mit 0 geht das nicht.",
    found: { G: "Grundwert", W: "Prozentwert", p: "Prozentsatz" } as Record<"G" | "W" | "p", string>,
    examples: [["🏷️ Rabatt", "80", "", "25"], ["🧾 Mehrwertsteuer", "50", "", "19"], ["📝 Klassenarbeit", "40", "34", ""], ["🏦 Zinsen", "1500", "", "2,5"]],
    quizTitle: "Quiz", quizIntro: "10 Fragen: Prozentwert, Grundwert, Prozentsatz, Rabatt, Steuer, Zinsen und Fallen.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`, score: (c: number) => `${c} von 10 richtig`,
    bar: "Prozentstreifen",
  },
  en: {
    title: "Percentages", subtitle: "Base, percentage value and percentage",
    hint: "Type two of the three values; the third is worked out.",
    gName: "Base", wName: "Part", pName: "Percent",
    dreisatzTitle: "With the rule of three", formulaTitle: "With the formula", fractionsTitle: "Percentages as fractions",
    tooMany: "Leave exactly one box empty: that one is worked out.", bad: "Please type numbers, e.g. 80 or 12.5.", zero: "That doesn't work with 0.",
    found: { G: "Base", W: "Part", p: "Percent" } as Record<"G" | "W" | "p", string>,
    examples: [["🏷️ Discount", "80", "", "25"], ["🧾 VAT", "50", "", "19"], ["📝 Test result", "40", "34", ""], ["🏦 Interest", "1500", "", "2.5"]],
    quizTitle: "Quiz", quizIntro: "10 questions: part, base, percentage, discounts, tax, interest and traps.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`, score: (c: number) => `${c} out of 10 right`,
    bar: "Percent bar",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

let lang: Lang = getLang();
let lastFound: "G" | "W" | "p" | null = null;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const field = (k: "G" | "W" | "p") => $<HTMLInputElement>(k);

/** What the child typed: the boxes they filled in themselves (a box we filled counts as empty). */
function readKnown(): { known: Partial<Record<"G" | "W" | "p", Rational>>; bad: boolean } {
  const known: Partial<Record<"G" | "W" | "p", Rational>> = {};
  let bad = false;
  for (const k of ["G", "W", "p"] as const) {
    if (k === lastFound) continue;
    const text = field(k).value.trim();
    if (text === "") continue;
    const v = parseRational(text);
    if (v === null || v.n < 0) bad = true;
    else known[k] = v;
  }
  return { known, bad };
}

// ---------- the percent bar ----------

function drawBar(p: PercentProblem | null): void {
  const svg = $("bar") as unknown as SVGSVGElement;
  const NS = "http://www.w3.org/2000/svg";
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    nodes.push(n);
  };
  const L = 14, R = 346, top = 30, h = 36;
  const pc = p ? p.p.n / p.p.d : 0;
  const end = Math.max(100, pc); // over 100 %, the bar grows
  const x = (v: number) => L + (v / end) * (R - L);
  add("rect", { x: L, y: top, width: x(100) - L, height: h, rx: 6, fill: "none", stroke: "#a9b8c9", "stroke-width": 2 });
  if (p) add("rect", { x: L, y: top, width: Math.max(0, x(pc) - L), height: h, rx: 6, fill: "#ff4da6", "fill-opacity": 0.45 });
  for (let v = 0; v <= 100; v += 10) {
    add("line", { x1: x(v), x2: x(v), y1: top + h, y2: top + h + (v % 50 === 0 ? 8 : 4), stroke: "#6f8296", "stroke-width": 1.5 });
  }
  add("text", { x: L, y: top - 8, "text-anchor": "start", fill: "#a9b8c9", "font-size": 12 }, "0 %");
  add("text", { x: x(100), y: top - 8, "text-anchor": "end", fill: "#a9b8c9", "font-size": 12 }, "100 %");
  if (p) {
    const labelX = Math.min(R - 30, Math.max(L + 30, x(pc)));
    if (Math.abs(pc - 100) > 12 && pc > 6) add("text", { x: labelX, y: top - 8, "text-anchor": "middle", fill: "#ff4da6", "font-size": 13, "font-weight": 700 }, `${num(p.p, lang)} %`);
    add("text", { x: x(100), y: top + h + 26, "text-anchor": "end", fill: "#eef3fb", "font-size": 13 }, `G = ${num(p.G, lang)}`);
    add("text", { x: Math.max(L + 40, Math.min(x(pc), x(100) - 90)), y: top + h / 2 + 5, "text-anchor": "middle", fill: "#eef3fb", "font-size": 13, "font-weight": 700 }, `W = ${num(p.W, lang)}`);
  }
  svg.setAttribute("viewBox", `0 0 360 ${top + h + 34}`);
  svg.setAttribute("aria-label", t().bar);
  svg.replaceChildren(...nodes);
}

// ---------- the calculator ----------

function renderCalc(): void {
  const { known, bad } = readKnown();
  const count = Object.keys(known).length;
  const err = $("error");
  let problem: PercentProblem | null = null;
  err.hidden = true;
  if (bad) {
    err.textContent = t().bad;
    err.hidden = false;
  } else if (count === 2) {
    try {
      problem = solve(known);
    } catch {
      err.textContent = t().zero;
      err.hidden = false;
    }
  } else if (count === 3) {
    err.textContent = t().tooMany;
    err.hidden = false;
  }
  for (const k of ["G", "W", "p"] as const) field(k).classList.toggle("found", problem?.find === k);
  if (problem) {
    lastFound = problem.find;
    field(problem.find).value = num(problem[problem.find], lang).replace("≈ ", "");
    $("answer").textContent = `${t().found[problem.find]}: ${num(problem[problem.find], lang)}${problem.find === "p" ? " %" : ""}`;
    $("dreisatz").replaceChildren(...dreisatz(problem, lang).flatMap((line, i, all) => [
      el("span", line.left, i === all.length - 1 ? "last" : ""), el("span", "≙", "eq"), el("span", line.right, i === all.length - 1 ? "last" : ""), el("span", line.op ? `↓ ${line.op}` : "", "op"),
    ]));
    $("formula").textContent = formula(problem, lang);
  } else {
    if (lastFound && count < 2) {
      field(lastFound).value = "";
      field(lastFound).classList.remove("found");
      lastFound = null;
    }
    $("answer").textContent = "";
  }
  $("ways").hidden = problem === null;
  drawBar(problem);
}

for (const k of ["G", "W", "p"] as const) {
  field(k).addEventListener("input", () => {
    // Typing into the box we filled in makes it the child's own again.
    if (k === lastFound) {
      lastFound = null;
      field(k).classList.remove("found");
    }
    renderCalc();
  });
}

// ---------- quiz ----------

const quiz = mountQuiz<PercentQuestion>({
  host: $("quiz"),
  colour: "c-percent",
  makeRound: () => makePercentRound(Math.random),
  prompt: (q, l) => quizPrompt(q, l),
  choices: (q, l) => q.choices.map((c) => `${choiceText(c, l)}${quizUnit(q)}`),
  answer: (q) => q.answer,
  steps: (q, l) => quizSteps(q, l),
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: UI[l].wrong, score: (c) => UI[l].score(c) }),
});

// ---------- wiring ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("examples").replaceChildren(...t().examples.map(([label, G, W, p]) => {
    const b = el("button", label, "chip") as HTMLButtonElement;
    b.type = "button";
    b.addEventListener("click", () => {
      lastFound = null;
      field("G").value = G!;
      field("W").value = W!;
      field("p").value = p!;
      renderCalc();
    });
    return b;
  }));
  $("fractions").replaceChildren(...PERCENT_FRACTIONS.map(([pc, a, b]) => el("span", `${lang === "de" ? String(pc).replace(".", ",") : pc} % = ${a}/${b}`)));
  renderCalc();
  quiz.render(lang);
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

field("G").value = "80";
field("p").value = "15";
render();
