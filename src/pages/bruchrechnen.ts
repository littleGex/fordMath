import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/bruchrechnen.css";
import { makeCalcRound, readFrac, resultOf, toMixed, value, work, type CalcQuestion, type Frac, type Op } from "../lib/fraction-calc";
import { mixedText, quizPrompt, quizSteps, steps, trap } from "../explain/fraction-calc";
import type { Lang } from "../explain/lang";
import { mountQuiz } from "./quiz";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Bruchrechnen", subtitle: "Plus, minus, mal und geteilt mit Brüchen",
    hint: "Tipp zwei Brüche ein (3/4, gemischt 2 1/3 oder eine ganze Zahl) und wähle die Rechenart.",
    bad: "Bitte Brüche wie 3/4, 2 1/3 oder 5 eingeben.", zero: "Durch 0 kann man nicht teilen.",
    barNote: "Beide Brüche mit demselben Nenner: Jetzt kann man die Stücke zählen.",
    areaNote: (a: string, b: string, r: string) => `${a} von ${b}: Die doppelt gefärbten Kästchen sind ${r} des Ganzen.`,
    examples: [["3/4 + 1/6", "3/4", "+", "1/6"], ["2 1/3 − 1 1/2", "2 1/3", "-", "1 1/2"], ["2/3 · 3/4", "2/3", "*", "3/4"], ["3/4 : 2/5", "3/4", ":", "2/5"], ["5 · 2/3", "5", "*", "2/3"]],
    quizTitle: "Quiz", quizIntro: "10 Aufgaben: plus, minus, mal, geteilt und gemischte Zahlen, mit den typischen Fallen.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`, score: (c: number) => `${c} von 10 richtig`,
    pic: "Bild zur Rechnung",
  },
  en: {
    title: "Fraction arithmetic", subtitle: "Adding, subtracting, multiplying and dividing fractions",
    hint: "Type two fractions (3/4, mixed 2 1/3 or a whole number) and choose the operation.",
    bad: "Please type fractions like 3/4, 2 1/3 or 5.", zero: "You can't divide by 0.",
    barNote: "Both fractions with the same denominator: now you can count the pieces.",
    areaNote: (a: string, b: string, r: string) => `${a} of ${b}: the squares coloured twice are ${r} of the whole.`,
    examples: [["3/4 + 1/6", "3/4", "+", "1/6"], ["2 1/3 − 1 1/2", "2 1/3", "-", "1 1/2"], ["2/3 · 3/4", "2/3", "*", "3/4"], ["3/4 ÷ 2/5", "3/4", ":", "2/5"], ["5 · 2/3", "5", "*", "2/3"]],
    quizTitle: "Quiz", quizIntro: "10 questions: add, subtract, multiply, divide and mixed numbers, with the usual traps.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`, score: (c: number) => `${c} out of 10 right`,
    pic: "Picture of the sum",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

let lang: Lang = getLang();
let op: Op = "+";
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });

/** A fraction the school way, numerator over denominator; mixed numbers with the whole in front. */
function fracNode(f: Frac, asMixed = true): HTMLElement {
  const neg = f.n < 0;
  const stacked = (n: number, d: number) => {
    const s = el("span", "", "frac");
    s.append(el("span", String(n)), el("span", String(d)));
    return s;
  };
  const wrap = el("span", "", "mixed");
  wrap.setAttribute("aria-label", mixedText(f));
  if (neg) wrap.append(el("span", "−"));
  const abs = { n: Math.abs(f.n), d: f.d };
  if (abs.d === 1) {
    wrap.append(el("span", String(abs.n)));
    return wrap;
  }
  const { whole, part } = toMixed(abs);
  if (asMixed && whole > 0) {
    wrap.append(el("span", String(whole)));
    if (part.n > 0) wrap.append(stacked(part.n, part.d));
  } else {
    wrap.append(stacked(abs.n, abs.d));
  }
  return wrap;
}
const opSign = (o: Op) => (o === "+" ? "+" : o === "-" ? "−" : o === "*" ? "·" : lang === "de" ? ":" : "÷");

// ---------- the calculator ----------

function render(): void {
  const a = readFrac($<HTMLInputElement>("a").value), b = readFrac($<HTMLInputElement>("b").value);
  document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.op === op)));
  $("op-div").textContent = opSign(":");
  const err = $("error");
  if (!a || !b || (op === ":" && b.n === 0)) {
    err.textContent = !a || !b ? t().bad : t().zero;
    err.hidden = false;
    $("result").replaceChildren();
    $("steps").replaceChildren();
    $("pic-fig").hidden = true;
    return;
  }
  err.hidden = true;
  const w = work(op, a, b);
  const r = resultOf(w);
  const raw = w.op === ":" ? w.times.raw : w.raw;
  const parts: Node[] = [fracNode(a), el("span", opSign(op)), fracNode(b), el("span", "=", "is")];
  if (raw.n !== r.n || raw.d !== r.d) parts.push(fracNode(raw, false), el("span", "=", "is"));
  const final = fracNode(r, false);
  final.classList.add("final");
  parts.push(final);
  if (Math.abs(r.n) > r.d && r.d !== 1) {
    const m = fracNode(r, true);
    m.classList.add("final");
    parts.push(el("span", "=", "is"), m);
  }
  $("result").replaceChildren(...parts);
  $("steps").replaceChildren(...[...steps(op, a, b, lang), trap(op, a, b, lang)].map((s) => el("li", s)));
  drawPicture(a, b, w);
}

/** Bars for + and − (both in the Hauptnenner), a rectangle for · (a part of a part). */
function drawPicture(a: Frac, b: Frac, w: ReturnType<typeof work>): void {
  const fig = $("pic-fig");
  const svg = $("pic") as unknown as SVGSVGElement;
  const NS = "http://www.w3.org/2000/svg";
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    nodes.push(n);
  };
  const positive = a.n > 0 && b.n > 0;
  if ((w.op === "+" || w.op === "-") && positive && value(a) <= 3 && value(b) <= 3 && w.common <= 24) {
    // One row per fraction, each whole cut into `common` pieces.
    const W = 340, rowH = 28, gap = 12;
    const wholes = Math.max(1, Math.ceil(Math.max(value(a), value(b), Math.abs(value(w.result)))));
    const rows: Array<[Frac, string, string]> = [[w.ea, "#ffd84d", `${w.ea.n}/${w.common}`], [w.eb, "#ff4da6", `${w.eb.n}/${w.common}`], [w.raw, "#7cfc00", `${w.raw.n}/${w.common}`]];
    const cell = (W - 70) / (wholes * w.common);
    rows.forEach(([f, colour, label], i) => {
      const y = 6 + i * (rowH + gap);
      for (let k = 0; k < wholes * w.common; k++) {
        add("rect", { x: 4 + k * cell, y, width: cell, height: rowH, fill: k < f.n ? colour : "none", "fill-opacity": 0.75, stroke: k % w.common === 0 ? "#eef3fb" : "#3a4a6c", "stroke-width": k % w.common === 0 ? 2 : 1 });
      }
      add("text", { x: W - 4, y: y + rowH / 2 + 5, "text-anchor": "end", fill: colour, "font-size": 15, "font-weight": 700 }, i === 2 ? `= ${label}` : label);
    });
    svg.setAttribute("viewBox", `0 0 ${W} ${3 * (rowH + gap) + 2}`);
    $("pic-note").textContent = t().barNote;
  } else if (w.op === "*" && positive && value(a) < 1 && value(b) < 1 && a.d <= 12 && b.d <= 12) {
    // a·b as "a of b": columns for a, rows for b; the overlap is the answer.
    const S = 240, cw = S / a.d, ch = S / b.d, x0 = 50, y0 = 6;
    for (let i = 0; i < a.d; i++) for (let j = 0; j < b.d; j++) {
      const inA = i < a.n, inB = j < b.n;
      add("rect", { x: x0 + i * cw, y: y0 + j * ch, width: cw, height: ch, fill: inA && inB ? "#7cfc00" : inA ? "#ffd84d" : inB ? "#ff4da6" : "none", "fill-opacity": inA && inB ? 0.8 : 0.3, stroke: "#3a4a6c", "stroke-width": 1 });
    }
    add("rect", { x: x0, y: y0, width: S, height: S, fill: "none", stroke: "#eef3fb", "stroke-width": 2 });
    add("text", { x: x0 + (a.n * cw) / 2, y: y0 + S + 22, "text-anchor": "middle", fill: "#ffd84d", "font-size": 15, "font-weight": 700 }, `${a.n}/${a.d}`);
    add("text", { x: x0 - 8, y: y0 + (b.n * ch) / 2 + 5, "text-anchor": "end", fill: "#ff4da6", "font-size": 15, "font-weight": 700 }, `${b.n}/${b.d}`);
    svg.setAttribute("viewBox", `0 0 ${x0 + S + 10} ${S + 34}`);
    $("pic-note").textContent = t().areaNote(`${a.n}/${a.d}`, `${b.n}/${b.d}`, `${a.n * b.n}/${a.d * b.d}`);
  } else {
    fig.hidden = true;
    return;
  }
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", t().pic);
  svg.replaceChildren(...nodes);
  fig.hidden = false;
}

$("a").addEventListener("input", render);
$("b").addEventListener("input", render);
document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((btn) =>
  btn.addEventListener("click", () => {
    op = btn.dataset.op as Op;
    render();
  }),
);

// ---------- quiz ----------

const quiz = mountQuiz<CalcQuestion>({
  host: $("quiz"),
  colour: "c-fraction",
  makeRound: () => makeCalcRound(Math.random),
  prompt: (q, l) => quizPrompt(q, l),
  choices: (q) => q.choices.map((f) => fracNode(f)),
  answer: (q) => q.answer,
  steps: (q, l) => quizSteps(q, l),
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: UI[l].wrong, score: (c) => UI[l].score(c) }),
});

// ---------- wiring ----------

function renderAll(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("examples").replaceChildren(...t().examples.map(([label, a, o, b]) => {
    const btn = el("button", label, "chip") as HTMLButtonElement;
    btn.type = "button";
    btn.addEventListener("click", () => {
      $<HTMLInputElement>("a").value = a!;
      $<HTMLInputElement>("b").value = b!;
      op = o as Op;
      render();
    });
    return btn;
  }));
  render();
  quiz.render(lang);
}
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    renderAll();
  }),
);

$<HTMLInputElement>("a").value = "3/4";
$<HTMLInputElement>("b").value = "1/6";
renderAll();
