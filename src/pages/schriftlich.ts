import "../styles/zone.css";
import "../styles/schriftlich.css";
import {
  makeProblem, writtenAdd, writtenDivide, writtenMultiply, writtenSubtract,
  type Op, type SubtractMethod, type WrittenSum,
} from "../lib/written";
import { finishText, fullText, introText, walkthrough, type Walk } from "../explain/written";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";
import { buildBoard } from "./written-board";

// ---------- words on the page ----------
const UI = {
  de: {
    title: "Schriftlich rechnen", subtitle: "Plus, minus, mal und geteilt, Schritt für Schritt",
    newSum: "🎲 Neue Aufgabe", modeShow: "👀 Zeig mir", modeTry: "✍️ Ich rechne",
    back: "◀ Zurück", next: "Weiter ▶", hint: "Tipp",
    settings: "⚙️ Einstellungen für Eltern", methodNote: "So wird Minus gerechnet. Nimm die Methode, die in der Schule benutzt wird.",
    complementName: "Ergänzen", complementHow: "Von unten nach oben ergänzen: 7 + ? = 14, merke 1",
    borrowName: "Abziehen mit Entbündeln", borrowHow: "Oben minus unten, notfalls 1 Zehner in 10 Einer tauschen",
    right: "Richtig! ", wrong: "Nicht ganz. Tipp: ", again: "Versuch's nochmal.", tapDigit: "Tippe die Ziffer.",
    errEmpty: "Gib zwei Zahlen ein.", errWhole: "Bitte nur ganze Zahlen ohne Komma.",
    errBig: "Die zweite Zahl darf nicht größer sein als die erste.", errHuge: "Bitte Zahlen bis 9 999 999.",
    errHugeB: "Die zweite Zahl bitte höchstens dreistellig.", errZero: "Durch 0 kann man nicht teilen.",
    firstNumber: "Erste Zahl", secondNumber: "Zweite Zahl",
    carry: "mit Übertrag", rest: "mit Rest", digits: "stellig",
  },
  en: {
    title: "Written sums", subtitle: "Plus, minus, times and divide, step by step",
    newSum: "🎲 New sum", modeShow: "👀 Show me", modeTry: "✍️ My turn",
    back: "◀ Back", next: "Next ▶", hint: "Hint",
    settings: "⚙️ Settings for parents", methodNote: "How subtraction is done. Choose the method the school uses.",
    complementName: "Adding on (Ergänzen)", complementHow: "Add on from the bottom to the top: 7 + ? = 14, carry 1",
    borrowName: "Taking away with exchanging", borrowHow: "Top minus bottom; if needed, exchange 1 ten for 10 ones",
    right: "Right! ", wrong: "Not quite. Hint: ", again: "Have another go.", tapDigit: "Tap the digit.",
    errEmpty: "Type two numbers.", errWhole: "Whole numbers only, please.",
    errBig: "The second number mustn't be bigger than the first.", errHuge: "Numbers up to 9,999,999, please.",
    errHugeB: "The second number can have at most three digits.", errZero: "You can't divide by 0.",
    firstNumber: "First number", secondNumber: "Second number",
    carry: "with carrying", rest: "with remainder", digits: "-digit",
  },
} satisfies Record<Lang, Record<string, string>>;
type TextKey = keyof (typeof UI)["de"];

/** Chip labels for the sizes, which mean different things per operation. */
function levelLabel(op: Op, max: number, lang: Lang): string {
  const w = (n: number) => `${n}${UI[lang].digits}`;
  if (op === "multiply") return max <= 100 ? `${w(2)} · 1` : max <= 1000 ? `${w(3)} · 1` : `${w(3)} · ${w(2)}`;
  if (op === "divide") return max <= 100 ? `${w(2)} : 1` : max <= 1000 ? `${w(3)} : 1` : `${w(4)} : ${w(2)}`;
  const n = max.toLocaleString(lang === "de" ? "de-DE" : "en-GB");
  return lang === "de" ? `bis ${n}` : `up to ${n}`;
}

/** Each operation has its own link: schriftlich/#mal opens straight on multiplication. */
const HASH: Record<Op, string> = { add: "plus", subtract: "minus", multiply: "mal", divide: "geteilt" };
const SYMBOL: Record<Op, string> = { add: "+", subtract: "−", multiply: "·", divide: ":" };

// ---------- settings, remembered on this device ----------
interface Settings {
  op: Op;
  max: number;
  carry: boolean;
  mode: "show" | "try";
  method: SubtractMethod;
}
const KEY = "fm.schriftlich.v1";
const OPS = Object.keys(HASH) as Op[];

function loadSettings(): Settings {
  const d: Settings = { op: "add", max: 1000, carry: true, mode: "show", method: "complement" };
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Settings> | null;
    if (r && typeof r === "object") {
      d.op = OPS.includes(r.op as Op) ? (r.op as Op) : "add";
      d.max = r.max === 100 || r.max === 10000 ? r.max : 1000;
      d.carry = r.carry !== false;
      d.mode = r.mode === "try" ? "try" : "show";
      d.method = r.method === "borrow" ? "borrow" : "complement";
    }
  } catch { /* use the defaults */ }
  const fromLink = OPS.find((op) => `#${HASH[op]}` === location.hash);
  if (fromLink) d.op = fromLink;
  return d;
}
const settings = loadSettings();
let lang: Lang = getLang();
function saveSettings(): void {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* not remembered */ }
}

// ---------- the current sum ----------
let sum: WrittenSum | null = null;
let walk: Walk[] = [];
let done = 0; // small steps finished
let wrongTries = 0;
let say: { text: string; tone: "" | "good" | "oops" } = { text: "", tone: "" };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const inA = $<HTMLInputElement>("num-a");
const inB = $<HTMLInputElement>("num-b");
const t = () => UI[lang];

function makeSum(a: number, b: number): WrittenSum {
  switch (settings.op) {
    case "add": return writtenAdd([a, b]);
    case "subtract": return writtenSubtract(a, b, settings.method);
    case "multiply": return writtenMultiply(a, b);
    case "divide": return writtenDivide(a, b);
  }
}

/** The question for the step the child is on, or "" when finished. */
function question(): string {
  const w = walk[done];
  return w ? `${w.text.place}: ${w.text.ask} ${t().tapDigit}` : "";
}

/** In "my turn" mode, steps without an answer (writing a product, bringing down, a blank 0) happen by themselves. */
function runAutoSteps(): string[] {
  const texts: string[] = [];
  if (settings.mode !== "try") return texts;
  while (done < walk.length && walk[done]!.answer === null) texts.push(fullText(walk[done++]!.text));
  return texts;
}

function build(a: number, b: number): void {
  sum = makeSum(a, b);
  walk = walkthrough(sum, lang);
  done = 0;
  wrongTries = 0;
  const auto = runAutoSteps();
  say = { text: [introText(sum, lang), ...auto, settings.mode === "try" ? question() : ""].filter(Boolean).join("\n"), tone: "" };
}

/** Reads the two boxes; shows a friendly message instead of building when they don't make a sum. */
function fromInputs(): void {
  const clean = (v: string) => v.trim().replace(/[ .]/g, "");
  const raw = [clean(inA.value), clean(inB.value)];
  let message = "";
  if (raw.some((v) => v === "")) message = t().errEmpty;
  else if (raw.some((v) => !/^\d+$/.test(v))) message = t().errWhole;
  const [a, b] = raw.map(Number) as [number, number];
  if (!message && (a > 9_999_999 || b > 9_999_999)) message = t().errHuge;
  if (!message && settings.op === "subtract" && b > a) message = t().errBig;
  if (!message && (settings.op === "multiply" || settings.op === "divide") && b > 999) message = t().errHugeB;
  if (!message && settings.op === "divide" && b === 0) message = t().errZero;
  $("error").textContent = message;
  $("error").hidden = !message;
  if (message) sum = null;
  else build(a, b);
  render();
}

function newProblem(): void {
  const [a, b] = makeProblem(settings.op, { max: settings.max, carry: settings.carry }, Math.random);
  inA.value = String(a);
  inB.value = String(b);
  fromInputs();
}

// ---------- drawing ----------
function renderBoard(): void {
  const el = $("board");
  if (!sum) {
    el.replaceChildren();
    return;
  }
  const board = buildBoard(sum, done, settings.mode);
  // Cells shrink so the whole sum fits the screen: the page gutter and panel padding take about 64px.
  el.style.setProperty("--cw", `min(46px, calc((min(100vw, 760px) - 64px) / ${board.cols}))`);
  el.style.gridTemplateColumns = `repeat(${board.cols}, var(--cw))`;
  el.replaceChildren(
    ...board.cells.map((cell) => {
      const span = document.createElement("span");
      span.className = ["cell", ...cell.cls].join(" ");
      span.textContent = cell.text;
      span.style.gridRow = String(cell.r + 1);
      span.style.gridColumn = cell.span ? `${cell.c + 1} / span ${cell.span}` : String(cell.c + 1);
      return span;
    }),
  );
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => (el.textContent = t()[el.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  inA.setAttribute("aria-label", t().firstNumber);
  inB.setAttribute("aria-label", t().secondNumber);

  $("op-symbol").textContent = SYMBOL[settings.op];
  document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.op === settings.op)));
  document.querySelectorAll<HTMLButtonElement>("[data-max]").forEach((b) => {
    b.textContent = levelLabel(settings.op, Number(b.dataset.max), lang);
    b.setAttribute("aria-pressed", String(Number(b.dataset.max) === settings.max));
  });
  $("carry").textContent = settings.op === "divide" ? t().rest : t().carry;
  $("carry").setAttribute("aria-pressed", String(settings.carry));
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === settings.mode)));
  document.querySelectorAll<HTMLButtonElement>("[data-method]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.method === settings.method)));

  renderBoard();
  const finished = sum !== null && done >= walk.length;
  $("say").textContent = sum ? say.text : "";
  $("say").className = `say ${say.tone}`;
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

// ---------- stepping ----------
function step(delta: 1 | -1): void {
  if (!sum) return;
  done = Math.max(0, Math.min(walk.length, done + delta));
  say = { text: done === 0 ? introText(sum, lang) : fullText(walk[done - 1]!.text), tone: "" };
  render();
}

function typeDigit(digit: number): void {
  if (!sum || settings.mode !== "try" || done >= walk.length) return;
  const w = walk[done]!;
  if (digit === w.answer) {
    const texts = [fullText(w.text)];
    done++;
    wrongTries = 0;
    texts.push(...runAutoSteps());
    say = { text: t().right + [...texts, question()].filter(Boolean).join("\n"), tone: "good" };
  } else {
    wrongTries++;
    // First miss: the question again. Second miss: the full working.
    const help = wrongTries >= 2 ? `${w.text.place}: ${w.text.work}` : `${w.text.place}: ${w.text.ask}`;
    say = { text: `${t().wrong}${help} ${t().again}`, tone: "oops" };
  }
  render();
}

// ---------- events ----------
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    if (sum) {
      walk = walkthrough(sum, lang);
      say = { text: settings.mode === "try" ? question() : done === 0 ? introText(sum, lang) : fullText(walk[done - 1]!.text), tone: "" };
    }
    render();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((b) =>
  b.addEventListener("click", () => {
    settings.op = b.dataset.op as Op;
    saveSettings();
    history.replaceState(null, "", `#${HASH[settings.op]}`);
    newProblem();
  }),
);
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
    if (k !== "hint") return typeDigit(Number(k));
    const w = walk[done];
    if (w) {
      say = { text: `${w.text.place}: ${w.text.ask}`, tone: "" };
      render();
    }
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (settings.mode === "try" && /^\d$/.test(e.key)) typeDigit(Number(e.key));
  if (settings.mode === "show" && (e.key === "ArrowRight" || e.key === "Enter")) step(1);
  if (settings.mode === "show" && e.key === "ArrowLeft") step(-1);
});

if (location.hash !== `#${HASH[settings.op]}`) history.replaceState(null, "", `#${HASH[settings.op]}`);
newProblem();
