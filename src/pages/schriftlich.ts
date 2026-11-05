import "../styles/zone.css";
import "../styles/schriftlich.css";
import {
  digitsOf, makeProblem, writtenAdd, writtenSubtract,
  type Op, type SubtractMethod, type WrittenSum,
} from "../lib/written";
import { finishText, introText, stepTexts, type StepText } from "../explain/written";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

// ---------- words on the page ----------
const UI = {
  de: {
    title: "Schriftlich rechnen", subtitle: "Plus und Minus untereinander, Schritt für Schritt",
    upTo100: "bis 100", upTo1000: "bis 1 000", upTo10000: "bis 10 000", withCarry: "mit Übertrag",
    newSum: "🎲 Neue Aufgabe", modeShow: "👀 Zeig mir", modeTry: "✍️ Ich rechne",
    back: "◀ Zurück", next: "Weiter ▶", hint: "Tipp",
    settings: "⚙️ Einstellungen für Eltern", methodNote: "So wird Minus gerechnet. Nimm die Methode, die in der Schule benutzt wird.",
    complementName: "Ergänzen", complementHow: "Von unten nach oben ergänzen: 7 + ? = 14, merke 1",
    borrowName: "Abziehen mit Entbündeln", borrowHow: "Oben minus unten, notfalls 1 Zehner in 10 Einer tauschen",
    yourTurn: (place: string, ask: string) => `${place}: ${ask} Tippe die Ziffer.`,
    right: "Richtig! ", wrong: "Nicht ganz. Tipp: ", again: "Versuch's nochmal.",
    errEmpty: "Gib zwei Zahlen ein.", errWhole: "Bitte nur ganze Zahlen ohne Komma.",
    errBig: "Die zweite Zahl darf nicht größer sein als die erste.", errHuge: "Bitte Zahlen bis 9 999 999.",
    firstNumber: "Erste Zahl", secondNumber: "Zweite Zahl", opLabel: "Plus oder Minus",
  },
  en: {
    title: "Written sums", subtitle: "Plus and minus in columns, step by step",
    upTo100: "up to 100", upTo1000: "up to 1,000", upTo10000: "up to 10,000", withCarry: "with carrying",
    newSum: "🎲 New sum", modeShow: "👀 Show me", modeTry: "✍️ My turn",
    back: "◀ Back", next: "Next ▶", hint: "Hint",
    settings: "⚙️ Settings for parents", methodNote: "How subtraction is done. Choose the method the school uses.",
    complementName: "Adding on (Ergänzen)", complementHow: "Add on from the bottom to the top: 7 + ? = 14, carry 1",
    borrowName: "Taking away with exchanging", borrowHow: "Top minus bottom; if needed, exchange 1 ten for 10 ones",
    yourTurn: (place: string, ask: string) => `${place}: ${ask} Tap the digit.`,
    right: "Right! ", wrong: "Not quite. Hint: ", again: "Have another go.",
    errEmpty: "Type two numbers.", errWhole: "Whole numbers only, please.",
    errBig: "The second number mustn't be bigger than the first.", errHuge: "Numbers up to 9,999,999, please.",
    firstNumber: "First number", secondNumber: "Second number", opLabel: "Plus or minus",
  },
} satisfies Record<Lang, Record<string, string | ((place: string, ask: string) => string)>>;

type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

// ---------- settings, remembered on this device ----------
interface Settings {
  op: Op;
  max: number;
  carry: boolean;
  mode: "show" | "try";
  method: SubtractMethod;
}
const KEY = "fm.schriftlich.v1";
function loadSettings(): Settings {
  const d: Settings = { op: "add", max: 1000, carry: true, mode: "show", method: "complement" };
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Settings> | null;
    if (!r || typeof r !== "object") return d;
    return {
      op: r.op === "subtract" ? "subtract" : "add",
      max: r.max === 100 || r.max === 10000 ? r.max : 1000,
      carry: r.carry !== false,
      mode: r.mode === "try" ? "try" : "show",
      method: r.method === "borrow" ? "borrow" : "complement",
    };
  } catch {
    return d;
  }
}
const settings = loadSettings();
let lang: Lang = getLang();
function saveSettings(): void {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* not remembered */ }
}

// ---------- current sum ----------
let sum: WrittenSum | null = null;
let texts: StepText[] = [];
let done = 0; // columns finished
let wrongTries = 0;
let say: { text: string; tone: "" | "good" | "oops" } = { text: "", tone: "" };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const inA = $<HTMLInputElement>("num-a");
const inB = $<HTMLInputElement>("num-b");
const t = () => UI[lang];

function build(a: number, b: number): void {
  sum = settings.op === "add" ? writtenAdd([a, b]) : writtenSubtract(a, b, settings.method);
  texts = stepTexts(sum, lang);
  done = 0;
  wrongTries = 0;
  say = { text: introText(sum, lang), tone: "" };
  skipLeadingZeros();
  if (settings.mode === "try") say = { text: introText(sum, lang) + "\n" + nextQuestion(), tone: "" };
}

/** The question for the column the child is on now, or "" when finished. */
function nextQuestion(): string {
  if (!sum || done >= sum.steps.length) return "";
  return t().yourTurn(texts[done]!.place, texts[done]!.ask);
}

/** Reads the two boxes; shows a friendly message instead of building when they don't make a sum. */
function fromInputs(): void {
  const raw = [inA.value.trim(), inB.value.trim()];
  const err = $("error");
  let message = "";
  if (raw.some((v) => v === "")) message = t().errEmpty;
  else if (raw.some((v) => !/^\d+$/.test(v.replace(/[ .]/g, "")))) message = t().errWhole;
  const [a, b] = raw.map((v) => Number(v.replace(/[ .]/g, ""))) as [number, number];
  if (!message && (a > 9_999_999 || b > 9_999_999)) message = t().errHuge;
  if (!message && settings.op === "subtract" && b > a) message = t().errBig;
  err.textContent = message;
  err.hidden = !message;
  if (message) {
    sum = null;
    render();
    return;
  }
  build(a, b);
  render();
}

function newProblem(): void {
  const [a, b] = makeProblem(settings.op, { max: settings.max, carry: settings.carry }, Math.random);
  inA.value = String(a);
  inB.value = String(b);
  fromInputs();
}

/** In "my turn" mode a leading 0 is filled in automatically: there's nothing to type. */
function skipLeadingZeros(): void {
  if (!sum || settings.mode !== "try") return;
  while (done < sum.steps.length && "leadingZero" in sum.steps[done]! && (sum.steps[done] as { leadingZero: boolean }).leadingZero) done++;
}

// ---------- drawing the board ----------
function cell(text: string, ...classes: string[]): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = ["cell", ...classes].join(" ");
  el.textContent = text;
  return el;
}

function renderBoard(): void {
  const board = $("board");
  if (!sum) {
    board.replaceChildren();
    return;
  }
  const s = sum;
  const W = s.steps.length;
  board.style.gridTemplateColumns = `repeat(${W + 1}, auto)`;
  const current = settings.mode === "try" ? done : done - 1; // column being worked on, or just finished
  const rows: HTMLSpanElement[] = [];
  const nowClass = (c: number) => (c === current && done <= W ? "now" : "");

  // Exchanged digits (Abziehen): what each top digit has become so far.
  const exchanged = new Map<number, number>();
  if (s.kind === "borrow") {
    s.steps.forEach((step, i) => {
      if (i >= done) return;
      for (const e of step.exchanges) exchanged.set(e.column, e.to);
      if (step.exchanges.length) exchanged.set(step.column, step.topAfter);
    });
    const row = [cell("", "exch")];
    for (let p = 0; p < W; p++) {
      const c = W - 1 - p;
      row.push(cell(exchanged.has(c) ? String(exchanged.get(c)) : "", "exch", nowClass(c)));
    }
    rows.push(...row);
  }

  // The numbers, right-aligned; the sign goes in front of the last one.
  s.numbers.forEach((n, i) => {
    const d = digitsOf(n);
    const isLast = i === s.numbers.length - 1;
    rows.push(cell(isLast ? (s.kind === "add" ? "+" : "−") : "", "sign"));
    for (let p = 0; p < W; p++) {
      const c = W - 1 - p;
      const struck = i === 0 && exchanged.has(c) ? "struck" : "";
      rows.push(cell(d[c] !== undefined ? String(d[c]) : "", nowClass(c), struck));
    }
  });

  // Carries (Übertrag), written small above the line.
  if (s.kind !== "borrow") {
    rows.push(cell("", "small"));
    for (let p = 0; p < W; p++) {
      const c = W - 1 - p;
      const prev = c > 0 && c - 1 < done ? s.steps[c - 1]!.carryOut : 0;
      rows.push(cell(prev ? String(prev) : "", "small", nowClass(c)));
    }
  }

  // The answer row.
  rows.push(cell("", "result"));
  for (let p = 0; p < W; p++) {
    const c = W - 1 - p;
    const step = s.steps[c]!;
    const blank = "leadingZero" in step && step.leadingZero;
    let text = "";
    if (c < done) text = blank ? "" : String(step.write);
    else if (c === done && settings.mode === "try") text = "?";
    rows.push(cell(text, "result", nowClass(c), text === "?" ? "ask" : ""));
  }
  board.replaceChildren(...rows);
}

// ---------- page ----------
function renderText(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => {
    el.textContent = t()[el.dataset.t as TextKey];
  });
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  inA.setAttribute("aria-label", t().firstNumber);
  inB.setAttribute("aria-label", t().secondNumber);
  $("op").setAttribute("aria-label", t().opLabel);
}

function render(): void {
  renderText();
  $("op").textContent = settings.op === "add" ? "+" : "−";
  document.querySelectorAll<HTMLButtonElement>("[data-max]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.max) === settings.max)));
  $("carry").setAttribute("aria-pressed", String(settings.carry));
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === settings.mode)));
  document.querySelectorAll<HTMLButtonElement>("[data-method]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.method === settings.method)));

  renderBoard();
  const finished = sum !== null && done >= sum.steps.length;
  const sayEl = $("say");
  sayEl.textContent = sum ? say.text : "";
  sayEl.className = `say ${say.tone}`;

  $("nav").hidden = !sum || settings.mode !== "show";
  $<HTMLButtonElement>("back").disabled = done === 0;
  $<HTMLButtonElement>("next").disabled = finished;
  $("keypad").hidden = !sum || settings.mode !== "try" || finished;

  $("finish").hidden = !finished;
  if (sum && finished) {
    const f = finishText(sum, lang);
    $("finish-result").textContent = f.result;
    $("finish-check").textContent = f.check ?? "";
  }
}

const fullText = (i: number) => `${texts[i]!.place}: ${texts[i]!.work} ${texts[i]!.write}`;

function step(delta: 1 | -1): void {
  if (!sum) return;
  done = Math.max(0, Math.min(sum.steps.length, done + delta));
  say = done === 0 ? { text: introText(sum, lang), tone: "" } : { text: fullText(done - 1), tone: "" };
  render();
}

function typeDigit(d: number): void {
  if (!sum || settings.mode !== "try" || done >= sum.steps.length) return;
  const stepNow = sum.steps[done]!;
  if (d === stepNow.write) {
    const explained = fullText(done);
    done++;
    wrongTries = 0;
    skipLeadingZeros();
    const next = nextQuestion();
    say = { text: t().right + explained + (next ? "\n" + next : ""), tone: "good" };
    render();
    return;
  }
  wrongTries++;
  // First mistake: the question again as a hint. Second: the full working.
  const help = wrongTries >= 2 ? `${texts[done]!.place}: ${texts[done]!.work}` : `${texts[done]!.place}: ${texts[done]!.ask}`;
  say = { text: t().wrong + help + " " + t().again, tone: "oops" };
  render();
}

// ---------- events ----------
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    if (sum) {
      texts = stepTexts(sum, lang);
      if (settings.mode === "try") say = { text: nextQuestion(), tone: "" };
      else say = done === 0 ? { text: introText(sum, lang), tone: "" } : { text: fullText(done - 1), tone: "" };
    }
    render();
  }),
);
$("op").addEventListener("click", () => {
  settings.op = settings.op === "add" ? "subtract" : "add";
  saveSettings();
  newProblem();
});
document.querySelectorAll<HTMLButtonElement>("[data-max]").forEach((b) =>
  b.addEventListener("click", () => {
    settings.max = Number(b.dataset.max);
    saveSettings();
    newProblem();
  }),
);
$("carry").addEventListener("click", () => {
  settings.carry = !settings.carry;
  saveSettings();
  newProblem();
});
for (const id of ["new", "new2"]) $(id).addEventListener("click", newProblem);
for (const input of [inA, inB]) input.addEventListener("input", fromInputs);
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) =>
  b.addEventListener("click", () => {
    settings.mode = b.dataset.mode === "try" ? "try" : "show";
    saveSettings();
    fromInputs();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-method]").forEach((b) =>
  b.addEventListener("click", () => {
    settings.method = b.dataset.method === "borrow" ? "borrow" : "complement";
    saveSettings();
    fromInputs();
  }),
);
$("back").addEventListener("click", () => step(-1));
$("next").addEventListener("click", () => step(1));
document.querySelectorAll<HTMLButtonElement>("#keypad [data-key]").forEach((b) =>
  b.addEventListener("click", () => {
    const k = b.dataset.key!;
    if (k === "hint") {
      if (sum && done < sum.steps.length) {
        say = { text: `${texts[done]!.place}: ${texts[done]!.ask}`, tone: "" };
        render();
      }
    } else typeDigit(Number(k));
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (settings.mode === "try" && /^\d$/.test(e.key)) typeDigit(Number(e.key));
  if (settings.mode === "show" && (e.key === "ArrowRight" || e.key === "Enter")) step(1);
  if (settings.mode === "show" && e.key === "ArrowLeft") step(-1);
});

newProblem();
