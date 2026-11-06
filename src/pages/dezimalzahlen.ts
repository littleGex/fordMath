import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import { mountQuiz } from "./quiz";
import "../styles/dezimalzahlen.css";
import {
  compare, dec, formatDecimal, makeDecimalRound, parseDecimal, placeDigits, roundDecimal, subtract, widen, wholePart,
  writtenDecimalAdd, type Decimal, type DecimalQuestion,
} from "../lib/decimal";
import {
  PLACE_NAMES, PLACE_SHORT, choiceLabel, compareSteps, placeText, quizPrompt, quizSteps, roundSteps, sumSteps,
} from "../explain/decimal";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Dezimalzahlen", subtitle: "Zahlen mit Komma: Zehntel, Hundertstel, Tausendstel",
    numberLabel: "Deine Zahl", bad: "Bitte eine Zahl wie 3,472 eingeben (höchstens 3 Stellen nach dem Komma, nicht negativ).",
    lineTitle: "Auf dem Zahlenstrahl", zoomIn: "🔍 Näher ran", zoomOut: "Weiter weg",
    lineNote: "Tippe auf ein Stück des Strahls, um hineinzuzoomen.",
    roundTitle: "Runden", roundTo: (p: number) => (p === 0 ? "auf Ganze" : `auf ${PLACE_NAMES.de[-p]}`),
    roundNone: "Diese Zahl hat keine Stellen nach dem Komma: Da gibt es nichts zu runden.",
    compareTitle: "Vergleichen", sumTitle: "Schriftlich plus und minus", sumBad: "Bitte zwei Zahlen eingeben; bei Minus muss die erste größer sein.",
    quizTitle: "Quiz", quizIntro: "10 Fragen: vergleichen, Stellen, runden, Brüche, plus und minus.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`,
    score: (c: number) => `${c} von 10 richtig`, line: (v: string) => `Zahlenstrahl mit ${v}`,
  },
  en: {
    title: "Decimals", subtitle: "Numbers with a point: tenths, hundredths, thousandths",
    numberLabel: "Your number", bad: "Please type a number like 3.472 (at most 3 places after the point, not negative).",
    lineTitle: "On the number line", zoomIn: "🔍 Zoom in", zoomOut: "Zoom out",
    lineNote: "Tap a piece of the line to zoom into it.",
    roundTitle: "Rounding", roundTo: (p: number) => (p === 0 ? "to whole numbers" : `to ${PLACE_NAMES.en[-p]}`),
    roundNone: "This number has no places after the point: there's nothing to round.",
    compareTitle: "Comparing", sumTitle: "Written adding and subtracting", sumBad: "Please type two numbers; for minus, the first must be bigger.",
    quizTitle: "Quiz", quizIntro: "10 questions: compare, places, rounding, fractions, plus and minus.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`,
    score: (c: number) => `${c} out of 10 right`, line: (v: string) => `Number line showing ${v}`,
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const EXAMPLES = ["3,472", "0,5", "0,45", "12,08", "2,995", "0,001"];

let lang: Lang = getLang();
let roundPlaces = 1;
let op: "+" | "−" = "+";
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const fmt = (d: Decimal) => formatDecimal(d, lang);
const read = (id: string): Decimal | null => {
  const input = $<HTMLInputElement>(id);
  const d = parseDecimal(input.value);
  input.classList.toggle("bad", d === null);
  return d;
};

// ---------- Stellenwerttafel ----------

function renderPlaces(d: Decimal): void {
  const digits = placeDigits(d);
  const head = el("tr");
  const row = el("tr");
  for (const [p, digit] of digits) {
    if (p === -1) {
      head.append(el("th", ""));
      row.append(el("td", ",", "comma"));
    }
    const frac = p < 0 ? "frac" : "";
    const th = el("th", PLACE_SHORT[lang][p]!, frac);
    th.title = PLACE_NAMES[lang][p]!;
    head.append(th);
    row.append(el("td", String(digit), frac));
  }
  $("pv").replaceChildren(head, row);
  const [names, fractions] = placeText(d, lang);
  $("pv-words").textContent = names;
  $("pv-fractions").textContent = `${fmt(d)} = ${fractions}`;
}

// ---------- the zoomable number line ----------

/** What the line shows, in thousandths: from `lo` over `span` (1 000 = one whole, 100 = a tenth, 10 = a hundredth). */
let view = { lo: 3000, span: 1000 };
const NS = "http://www.w3.org/2000/svg";

function viewFor(d: Decimal, span: number): { lo: number; span: number } {
  const v = widen(d, 3).n;
  return { lo: Math.floor(v / span) * span, span };
}

function renderLine(d: Decimal): void {
  const svg = $("line") as unknown as SVGSVGElement;
  const W = 360, L = 22, R = W - 22, axisY = 58;
  const v = widen(d, 3).n;
  const places = view.span === 1000 ? 1 : view.span === 100 ? 2 : 3;
  const x = (thousandths: number) => L + ((thousandths - view.lo) / view.span) * (R - L);
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    nodes.push(n);
    return n;
  };
  add("line", { x1: L - 12, x2: R + 12, y1: axisY, y2: axisY, stroke: "#2c3a58", "stroke-width": 3, "stroke-linecap": "round" });
  for (let i = 0; i < 10; i++) {
    const seg = add("rect", { x: x(view.lo + (i * view.span) / 10), y: axisY - 26, width: (R - L) / 10, height: 52, class: "seg" });
    if (view.span > 10) seg.addEventListener("click", () => {
      view = { lo: view.lo + (i * view.span) / 10, span: view.span / 10 };
      renderLine(d);
    });
  }
  for (let i = 0; i <= 10; i++) {
    const at = view.lo + (i * view.span) / 10;
    const big = i === 0 || i === 10 || i === 5;
    add("line", { x1: x(at), x2: x(at), y1: axisY - (big ? 12 : 7), y2: axisY + (big ? 12 : 7), stroke: "#a9b8c9", "stroke-width": big ? 2.5 : 1.5 });
    if (i % 2 === 0 || view.span === 1000) {
      const label = formatDecimal(dec(at / 10 ** (3 - places), places), lang);
      add("text", { x: x(at), y: axisY + 30, "text-anchor": "middle", fill: "#a9b8c9", "font-size": label.length > 5 ? 10 : 12 }, label);
    }
  }
  if (v >= view.lo && v <= view.lo + view.span) {
    add("path", { d: `M ${x(v)} ${axisY - 6} l -8 -16 h 16 z`, fill: "#ffb347" });
    add("text", { x: Math.min(R - 10, Math.max(L + 10, x(v))), y: 16, "text-anchor": "middle", fill: "#ffb347", "font-size": 15, "font-weight": 700 }, fmt(d));
  }
  svg.setAttribute("viewBox", `0 0 ${W} 100`);
  svg.setAttribute("aria-label", t().line(fmt(d)));
  svg.replaceChildren(...nodes);
  $<HTMLButtonElement>("zoom-in").disabled = view.span <= 10;
  $<HTMLButtonElement>("zoom-out").disabled = view.span >= 1000;
  $("line-note").textContent = t().lineNote;
}

// ---------- rounding ----------

function renderRounding(d: Decimal): void {
  const options = Array.from({ length: d.places }, (_, p) => p);
  if (!options.includes(roundPlaces)) roundPlaces = options.at(-1) ?? 0;
  $("round-chips").replaceChildren(
    ...options.map((p) => {
      const b = el("button", t().roundTo(p), "chip") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("aria-pressed", String(p === roundPlaces));
      b.addEventListener("click", () => {
        roundPlaces = p;
        renderRounding(d);
      });
      return b;
    }),
  );
  $("round-steps").replaceChildren(...(options.length ? roundSteps(roundDecimal(d, roundPlaces), lang) : [t().roundNone]).map((s) => el("li", s)));
}

// ---------- comparing ----------

function renderCompare(): void {
  const a = read("cmp-a");
  const b = read("cmp-b");
  if (!a || !b) {
    $("cmp-sign").textContent = "?";
    $("cmp-steps").replaceChildren();
    return;
  }
  const c = compare(a, b);
  $("cmp-sign").textContent = c > 0 ? ">" : c < 0 ? "<" : "=";
  $("cmp-steps").replaceChildren(...compareSteps(a, b, lang).map((s) => el("li", s)));
}

// ---------- written plus and minus, comma under comma ----------

function renderSum(): void {
  const a = read("sum-a");
  const b = read("sum-b");
  const ok = a !== null && b !== null && (op === "+" || compare(a, b) >= 0);
  $("sum-error").hidden = ok;
  $("sum-error").textContent = t().sumBad;
  document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.op === op)));
  if (!ok) {
    $("columns").replaceChildren();
    $("sum-steps").replaceChildren();
    return;
  }
  const p = Math.max(a.places, b.places);
  const result = op === "+" ? writtenDecimalAdd(a, b).result : subtract(a, b);
  const carries = op === "+" ? writtenDecimalAdd(a, b).steps.map((s) => s.carryIn) : [];
  const wholeWidth = Math.max(...[a, b, result].map((x) => String(wholePart(x)).length));
  const cols = 1 + wholeWidth + (p ? 1 + p : 0);
  const cells: HTMLElement[] = [];
  /** One row: the op sign, the whole digits right-aligned, the comma, the places (padded zeros faded). */
  const row = (d: Decimal | null, sign: string, cls: string, original = d?.places ?? 0): void => {
    cells.push(el("span", sign, `op ${cls}`));
    if (!d) return;
    const w = widen(d, p);
    const whole = String(wholePart(w)).padStart(wholeWidth, " ");
    const frac = p ? String(w.n % 10 ** p).padStart(p, "0") : "";
    for (const ch of whole) cells.push(el("span", ch.trim(), cls));
    if (p) cells.push(el("span", lang === "de" ? "," : ".", `comma ${cls}`));
    [...frac].forEach((ch, i) => cells.push(el("span", ch, `${cls}${i >= original ? " fill" : ""}`)));
  };
  // Carries sit above the column they're added into (column 0 is the last digit).
  cells.push(el("span", ""));
  const width = wholeWidth + p;
  for (let i = 0; i < width; i++) {
    const column = width - 1 - i;
    if (p && i === wholeWidth) cells.push(el("span", "", "comma"));
    const c = carries[column] ?? 0;
    cells.push(el("span", c ? String(c) : "", "carry"));
  }
  row(a, "", "");
  row(b, op, "");
  row(result, "", "res", p);
  const grid = $("columns");
  grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;
  grid.replaceChildren(...cells);
  $("sum-steps").replaceChildren(...sumSteps(a, b, op, lang).map((s) => el("li", s)));
}

// ---------- quiz ----------

const quiz = mountQuiz<DecimalQuestion>({
  host: $("quiz"),
  colour: "c-decimal",
  makeRound: () => makeDecimalRound(Math.random),
  prompt: (q, l) => quizPrompt(q, l),
  choices: (q, l) => q.choices.map((c) => choiceLabel(c, l)),
  answer: (q) => q.answer,
  steps: (q, l) => quizSteps(q, l),
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: (r) => UI[l].wrong(r), score: (c) => UI[l].score(c) }),
});

// ---------- wiring ----------

function renderNumber(resetView: boolean): void {
  const d = read("num");
  $("num-error").hidden = d !== null;
  $("num-error").textContent = t().bad;
  if (!d) return;
  if (resetView) view = viewFor(d, 1000);
  renderPlaces(d);
  renderLine(d);
  renderRounding(d);
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("examples").replaceChildren(
    ...EXAMPLES.map((ex) => {
      const b = el("button", lang === "de" ? ex : ex.replace(",", "."), "chip") as HTMLButtonElement;
      b.type = "button";
      b.addEventListener("click", () => {
        $<HTMLInputElement>("num").value = b.textContent ?? "";
        renderNumber(true);
      });
      return b;
    }),
  );
  renderNumber(false);
  renderCompare();
  renderSum();
  quiz.render(lang);
}

$("num").addEventListener("input", () => renderNumber(true));
$("zoom-in").addEventListener("click", () => {
  const d = read("num");
  if (d && view.span > 10) {
    view = viewFor(d, view.span / 10);
    renderLine(d);
  }
});
$("zoom-out").addEventListener("click", () => {
  const d = read("num");
  if (d && view.span < 1000) {
    view = viewFor(d, view.span * 10);
    renderLine(d);
  }
});
for (const id of ["cmp-a", "cmp-b"]) $(id).addEventListener("input", renderCompare);
for (const id of ["sum-a", "sum-b"]) $(id).addEventListener("input", renderSum);
document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((b) =>
  b.addEventListener("click", () => {
    op = b.dataset.op === "−" ? "−" : "+";
    renderSum();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

view = viewFor(parseDecimal("3,472")!, 1000);
render();
