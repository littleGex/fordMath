import "./sw-register";
import "../styles/zone.css";
import "../styles/groessen.css";
import "../styles/quiz.css";
import {
  QUANTITIES, UNITS, UnitError, changeFor, clockText, formatMixed, isDecimal, parseAmount, parseClock, timeSpan, unitTable,
  type Quantity, type Unit, type UnitErrorCode,
} from "../lib/units";
import { makeUnitsRound, type UnitsLevel, type UnitsQuestion } from "../lib/units-quiz";
import { starsFor } from "../lib/times-tables";
import {
  QUANTITY_NAMES, amount, changeSteps, choiceText, convertSteps, euro, minutesText, piece, questionSteps, questionText, spanSteps,
} from "../explain/units";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Größen", subtitle: "Geld, Längen, Gewichte und Zeit umrechnen",
    convertTitle: "Umrechnen", spanTitle: "Zeitspanne", shopTitle: "Einkaufen", quizTitle: "Üben",
    from: "Von", to: "Bis", price: "Preis", payWith: "Bezahlt mit", next: "Weiter", again: "Nochmal üben",
    gs: "Grundschule", k5: "Klasse 5", quizIntro: "10 Aufgaben: umrechnen, vergleichen, Rückgeld und Zeitspannen.", quizGo: "Los geht's!",
    right: "Richtig! ⭐", wrong: "Nicht ganz. So geht's:", score: (c: number, t: number) => `${c} von ${t} richtig`,
    change: (x: string) => `Rückgeld: ${x}`, lasts: (x: string) => `Das dauert ${x}.`,
    errors: {
      empty: "Gib eine Zahl ein.", format: "Bitte nur eine Zahl, z. B. 2,35.", unit: "Diese Einheit kenne ich nicht.",
      "too-precise": "So genau geht es nicht: Das ist kleiner als die kleinste Einheit.", "too-big": "Diese Zahl ist zu groß.",
      "not-enough-paid": "Du hast zu wenig bezahlt.",
    } satisfies Record<UnitErrorCode, string>,
  },
  en: {
    title: "Units", subtitle: "Convert money, length, weight and time",
    convertTitle: "Convert", spanTitle: "Time span", shopTitle: "Shopping", quizTitle: "Practise",
    from: "From", to: "To", price: "Price", payWith: "Pay with", next: "Next", again: "Practise again",
    gs: "Primary school", k5: "Class 5", quizIntro: "10 questions: converting, comparing, change and time spans.", quizGo: "Let's go!",
    right: "Right! ⭐", wrong: "Not quite. Here's how:", score: (c: number, t: number) => `${c} out of ${t} right`,
    change: (x: string) => `Change: ${x}`, lasts: (x: string) => `That takes ${x}.`,
    errors: {
      empty: "Type a number.", format: "Just a number, please, like 2.35.", unit: "I don't know that unit.",
      "too-precise": "That's finer than the smallest unit.", "too-big": "That number is too big.",
      "not-enough-paid": "That's not enough money.",
    } satisfies Record<UnitErrorCode, string>,
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const START: Record<Quantity, { text: string; unit: string; target: string }> = {
  money: { text: "3,50", unit: "€", target: "ct" },
  length: { text: "2,35", unit: "m", target: "cm" },
  mass: { text: "1,25", unit: "kg", target: "g" },
  time: { text: "1,5", unit: "h", target: "min" },
};

let lang: Lang = getLang();
let quantity: Quantity = "length";
let fromUnit = START.length.unit;
let target = START.length.target;
let paid = 500;
let level: UnitsLevel = "grundschule";

type Quiz =
  | { stage: "start" }
  | { stage: "play"; round: UnitsQuestion[]; index: number; correct: number; streak: number; results: boolean[]; chose: number | null }
  | { stage: "done"; correct: number; total: number };
let quiz: Quiz = { stage: "start" };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const list = (box: HTMLElement, steps: string[]) => box.replaceChildren(...steps.map((s) => el("li", s)));
const units = (q: Quantity) => UNITS[q] as readonly Unit[];

function errorText(e: unknown): string {
  return e instanceof UnitError ? t().errors[e.code] : String(e);
}

function chip(text: string, pressed: boolean, onClick: () => void): HTMLButtonElement {
  const b = el("button", text, "chip") as HTMLButtonElement;
  b.type = "button";
  b.setAttribute("aria-pressed", String(pressed));
  b.addEventListener("click", onClick);
  return b;
}

// ---------- Umrechnen ----------
function renderConvert(): void {
  $("quantities").replaceChildren(
    ...QUANTITIES.map((q) =>
      chip(QUANTITY_NAMES[lang][q], q === quantity, () => {
        quantity = q;
        fromUnit = START[q].unit;
        target = START[q].target;
        $<HTMLInputElement>("amount").value = lang === "de" ? START[q].text : START[q].text.replace(",", ".");
        renderConvert();
      }),
    ),
  );
  $("from-units").replaceChildren(
    ...units(quantity).map((u) =>
      chip(u.symbol, u.symbol === fromUnit, () => {
        fromUnit = u.symbol;
        if (target === fromUnit) target = units(quantity).find((x) => x.symbol !== fromUnit)!.symbol;
        renderConvert();
      }),
    ),
  );

  let base: number;
  try {
    base = parseAmount($<HTMLInputElement>("amount").value, quantity, fromUnit);
  } catch (e) {
    $("convert-error").textContent = errorText(e);
    $("convert-error").hidden = false;
    $("convert-out").hidden = true;
    return;
  }
  $("convert-error").hidden = true;
  $("convert-out").hidden = false;

  $("unit-list").replaceChildren(
    ...units(quantity).map((u) => {
      const row = el("button", "", `unit-row ${u.symbol === fromUnit ? "from" : ""}`) as HTMLButtonElement;
      row.type = "button";
      row.setAttribute("aria-pressed", String(u.symbol === target));
      row.append(el("b", amount(base, quantity, u.symbol, lang)));
      row.addEventListener("click", () => {
        if (u.symbol === fromUnit) return;
        target = u.symbol;
        renderConvert();
      });
      return row;
    }),
  );
  $("mixed").textContent = formatMixed(base, quantity);
  renderUnitTable(base);
  list($("convert-steps"), convertSteps(base, quantity, fromUnit, target, lang));
}

/** Stellenwerttafel with a column group per unit; the comma sits after the target unit's ones. */
function renderUnitTable(base: number): void {
  const wrap = $("ut-wrap");
  wrap.hidden = !isDecimal(quantity);
  if (!isDecimal(quantity)) return;
  const cols = unitTable(base, quantity);
  const table = $("unit-table");
  table.style.gridTemplateColumns = `repeat(${cols.length}, auto)`;
  const cells: HTMLElement[] = [];
  const groupIndex = new Map(units(quantity).map((u, i) => [u.symbol, i % 2]));
  const firstDigit = cols.findIndex((c) => c.digit !== null);
  const lastIndexOf = (unit: string) => cols.map((c) => c.unit).lastIndexOf(unit);
  let i = 0;
  while (i < cols.length) {
    const unit = cols[i]!.unit;
    const span = lastIndexOf(unit) - i + 1;
    const head = el("span", unit, `ut-head g${groupIndex.get(unit)}`);
    head.style.gridColumn = `${i + 1} / span ${span}`;
    cells.push(head);
    i += span;
  }
  const sub = lang === "de" ? ["E", "Z", "H"] : ["O", "T", "H"];
  const widthOf = (unit: string) => cols.filter((c) => c.unit === unit).length;
  // Fill in 0s from the first real digit or the target unit's ones column, whichever is further left,
  // so the amount can be read in the target unit: 2350 mm in km → 0,002350.
  const targetOnes = cols.findIndex((c) => c.unit === target && c.place === 0);
  const from = Math.min(firstDigit === -1 ? cols.length - 1 : firstDigit, targetOnes);
  cols.forEach((c, k) => {
    const s = el("span", widthOf(c.unit) > 1 ? sub[c.place] ?? "" : "", "ut-sub");
    s.style.gridColumn = String(k + 1);
    const text = c.digit !== null ? String(c.digit) : k >= from ? "0" : "";
    const comma = k === targetOnes && k < cols.length - 1 ? "comma" : "";
    const d = el("span", text, `ut-digit g${groupIndex.get(c.unit)} ${text === "" ? "blank" : ""} ${comma}`);
    d.style.gridColumn = String(k + 1);
    cells.push(s, d);
  });
  table.replaceChildren(...cells);
}

// ---------- Zeitspanne ----------
const NS = "http://www.w3.org/2000/svg";
function svg(parent: SVGSVGElement, tag: string, attrs: Record<string, string | number>, text?: string): void {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
}

function renderSpan(): void {
  const line = $("timeline") as unknown as SVGSVGElement;
  line.replaceChildren();
  try {
    const from = parseClock($<HTMLInputElement>("time-from").value);
    const to = parseClock($<HTMLInputElement>("time-to").value);
    const s = timeSpan(from, to);
    $("span-result").textContent = t().lasts(minutesText(s.minutes));
    list($("span-steps"), spanSteps(from, to, lang));
    // Each jump gets a width matching its share, with a minimum so short ones stay readable.
    const L = 20, R = 580, Y = 82;
    const widths = s.steps.map((x) => Math.max(x.minutes, s.minutes * 0.18));
    const total = widths.reduce((a, b) => a + b, 0) || 1;
    svg(line, "line", { x1: L, x2: R, y1: Y, y2: Y, stroke: "#9fb0c8", "stroke-width": 3 });
    let x = L;
    svg(line, "text", { x, y: Y + 30, "text-anchor": "start" }, clockText(from));
    s.steps.forEach((step, i) => {
      const w = (widths[i]! / total) * (R - L);
      svg(line, "path", { d: `M${x} ${Y - 4} Q${x + w / 2} ${Y - 52} ${x + w} ${Y - 4}`, fill: "none", stroke: "#ffd84d", "stroke-width": 3 });
      svg(line, "text", { x: x + w / 2, y: Y - 36, "text-anchor": "middle", class: "jump" }, minutesText(step.minutes));
      x += w;
      svg(line, "line", { x1: x, x2: x, y1: Y - 8, y2: Y + 8, stroke: "#9fb0c8", "stroke-width": 3 });
      svg(line, "text", { x, y: Y + 30, "text-anchor": i === s.steps.length - 1 ? "end" : "middle" }, clockText(step.to));
    });
    line.setAttribute("aria-label", `${clockText(from)} – ${clockText(to)}: ${minutesText(s.minutes)}`);
  } catch {
    $("span-result").textContent = "";
    $("span-steps").replaceChildren();
  }
}

// ---------- Einkaufen ----------
function pieceEl(ct: number): HTMLElement {
  if (ct >= 500) {
    const colours: Record<number, string> = { 500: "#c9c9c9", 1000: "#f19a9a", 2000: "#8fb8f0", 5000: "#f2b66d", 10000: "#9fd18b", 20000: "#f0dc75" };
    const n = el("span", piece(ct), "banknote"); // not "note": that's the site-wide small-text class
    n.style.setProperty("--n", colours[ct] ?? "#ccc");
    return n;
  }
  const cls = ct === 200 ? "two" : ct === 100 ? "one" : ct <= 5 ? "copper" : "";
  return el("span", piece(ct), `coin ${cls}`);
}

function renderShop(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-paid]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.paid) === paid)));
  try {
    const price = parseAmount($<HTMLInputElement>("price").value, "money", "€");
    const c = changeFor(price, paid);
    $("change-result").textContent = t().change(euro(c.change, lang));
    $("pieces").replaceChildren(...c.pieces.map(pieceEl));
    list($("change-steps"), changeSteps(price, paid, lang));
    $("shop-error").hidden = true;
    $("shop-out").hidden = false;
  } catch (e) {
    $("shop-error").textContent = errorText(e);
    $("shop-error").hidden = false;
    $("shop-out").hidden = true;
  }
}

// ---------- quiz ----------
function renderQuiz(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-qlevel]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.qlevel === level)));
  $("quiz-start").hidden = quiz.stage !== "start";
  $("quiz-play").hidden = quiz.stage !== "play";
  $("quiz-done").hidden = quiz.stage !== "done";
  if (quiz.stage === "done") {
    const stars = starsFor(quiz.correct, quiz.total);
    $("quiz-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("quiz-score").textContent = t().score(quiz.correct, quiz.total);
    return;
  }
  if (quiz.stage !== "play") return;
  const s = quiz;
  const q = s.round[s.index]!;
  $("quiz-progress").replaceChildren(...s.round.map((_, i) => el("i", "", i < s.results.length ? (s.results[i] ? "ok" : "no") : i === s.index ? "now" : "")));
  $("quiz-streak").textContent = s.streak >= 3 ? `🔥 ${s.streak}` : "";
  $("quiz-q").textContent = questionText(q, lang);
  $("quiz-choices").replaceChildren(
    ...q.choices.map((c, i) => {
      const b = el("button", choiceText(q, c, lang)) as HTMLButtonElement;
      b.type = "button";
      if (s.chose !== null) {
        b.disabled = true;
        if (i === q.answer) b.classList.add("right");
        else if (i === s.chose) b.classList.add("wrong");
      }
      b.addEventListener("click", () => choose(i));
      return b;
    }),
  );
  $("quiz-choices").style.gridTemplateColumns = q.kind === "compare" ? "repeat(3, minmax(0, 1fr))" : "";
  $("quiz-feedback").hidden = s.chose === null;
  if (s.chose !== null) {
    const ok = s.chose === q.answer;
    $("quiz-verdict").textContent = ok ? t().right : t().wrong;
    $("quiz-verdict").className = `verdict ${ok ? "ok" : "no"}`;
    list($("quiz-steps"), questionSteps(q, lang));
  }
}

function choose(i: number): void {
  if (quiz.stage !== "play" || quiz.chose !== null) return;
  const ok = i === quiz.round[quiz.index]!.answer;
  quiz.chose = i;
  quiz.results.push(ok);
  quiz.correct += ok ? 1 : 0;
  quiz.streak = ok ? quiz.streak + 1 : 0;
  renderQuiz();
}

function nextQuestion(): void {
  if (quiz.stage !== "play") return;
  if (quiz.index + 1 >= quiz.round.length) quiz = { stage: "done", correct: quiz.correct, total: quiz.results.length };
  else {
    quiz.index++;
    quiz.chose = null;
  }
  renderQuiz();
  $("quiz").scrollIntoView({ block: "start", behavior: "smooth" });
}

function startQuiz(): void {
  quiz = { stage: "play", round: makeUnitsRound(level, Math.random), index: 0, correct: 0, streak: 0, results: [], chose: null };
  renderQuiz();
}

// ---------- page ----------
function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  renderConvert();
  renderSpan();
  renderShop();
  renderQuiz();
}

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
$("amount").addEventListener("input", renderConvert);
for (const id of ["time-from", "time-to"]) $(id).addEventListener("input", renderSpan);
$("price").addEventListener("input", renderShop);
document.querySelectorAll<HTMLButtonElement>("[data-paid]").forEach((b) =>
  b.addEventListener("click", () => {
    paid = Number(b.dataset.paid);
    renderShop();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-qlevel]").forEach((b) =>
  b.addEventListener("click", () => {
    level = b.dataset.qlevel === "sek1" ? "sek1" : "grundschule";
    renderQuiz();
  }),
);
$("quiz-go").addEventListener("click", startQuiz);
$("quiz-again").addEventListener("click", startQuiz);
$("quiz-next").addEventListener("click", nextQuestion);

$<HTMLInputElement>("amount").value = lang === "de" ? START.length.text : START.length.text.replace(",", ".");
if (lang === "en") $<HTMLInputElement>("price").value = "3.65";
render();
