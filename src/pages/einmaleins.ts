import "../styles/zone.css";
import "../styles/einmaleins.css";
import {
  MAX_BOX, TABLES, answerOf, isCorrect, makeRound, questionsFor, record, starsFor, strategyFor, trickyPool,
  type Mastery, type Mode, type Question,
} from "../lib/times-tables";
import { explainQuestion, type Lang } from "../explain/times-tables";
import { renderSections } from "./render";

// ---------- words on the page (the explanations have their own, in src/explain) ----------
const UI = {
  de: {
    subtitle: "Übe die Malreihen, bis du sie im Schlaf kannst",
    tablesTitle: "Welche Reihen?", all: "Alle Reihen",
    modeTitle: "Was üben?", multiply: "Malnehmen", divide: "Teilen", mixed: "Gemischt", timer: "⏱ Zeit messen",
    start: "Los geht's!", tricky: (n: number) => (n ? `Knifflige üben (${n})` : "Noch nichts Kniffliges"),
    gridTitle: "Deine Einmaleins-Tafel",
    gridNote: "Jedes Feld ist eine Aufgabe (Zeile · Spalte). Grün sitzt, Rot noch üben, Grau noch nicht gefragt.",
    reset: "Fortschritt löschen", resetSure: "Wirklich alles löschen?", yes: "Ja, löschen", no: "Nein",
    right: ["Richtig! ⭐", "Super! ⭐", "Klasse! ⭐", "Genau! ⭐"],
    wrong: (q: string, c: number) => `Fast! ${q} = ${c}`,
    next: "Weiter", stop: "Runde beenden",
    score: (c: number, t: number) => `${c} von ${t} richtig`,
    best: (n: number) => `Beste Serie: ${n} 🔥`, time: (t: string) => `Zeit: ${t}`,
    praise: ["Nicht aufgeben, das wird!", "Gut, weiter üben!", "Toll gemacht!", "Super, alles richtig!"],
    mistakes: "Das üben wir noch:", you: (n: number) => `du: ${n}`,
    again: "Nochmal", change: "Andere Reihen wählen", pickTable: "Wähle mindestens eine Reihe.",
    del: "Löschen",
  },
  en: {
    subtitle: "Practise the times tables until you know them by heart",
    tablesTitle: "Which tables?", all: "All tables",
    modeTitle: "What to practise?", multiply: "Multiply", divide: "Divide", mixed: "Mixed", timer: "⏱ Time me",
    start: "Let's go!", tricky: (n: number) => (n ? `Practise tricky ones (${n})` : "Nothing tricky yet"),
    gridTitle: "Your times-table board",
    gridNote: "Each square is one fact (row · column). Green is known, red needs practice, grey hasn't come up yet.",
    reset: "Clear progress", resetSure: "Really clear everything?", yes: "Yes, clear it", no: "No",
    right: ["Right! ⭐", "Super! ⭐", "Brilliant! ⭐", "Yes! ⭐"],
    wrong: (q: string, c: number) => `Nearly! ${q} = ${c}`,
    next: "Next", stop: "Stop this round",
    score: (c: number, t: number) => `${c} out of ${t} right`,
    best: (n: number) => `Best streak: ${n} 🔥`, time: (t: string) => `Time: ${t}`,
    praise: ["Don't give up, you'll get there!", "Good, keep practising!", "Well done!", "Amazing, all right!"],
    mistakes: "Let's keep practising:", you: (n: number) => `you: ${n}`,
    again: "Again", change: "Choose other tables", pickTable: "Choose at least one table.",
    del: "Delete",
  },
};
type UiKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

// ---------- saved on this device ----------
interface Saved {
  lang: Lang;
  tables: number[];
  mode: Mode;
  timer: boolean;
  mastery: Mastery;
}
const STORE_KEY = "fm.einmaleins.v1";
const DEFAULTS: Saved = { lang: "de", tables: [2, 5, 10], mode: "multiply", timer: false, mastery: {} };

/** Reads saved settings without trusting them: anything odd falls back to the default. */
function load(): Saved {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    if (typeof raw !== "object" || raw === null) return { ...DEFAULTS };
    const r = raw as Partial<Saved>;
    return {
      lang: r.lang === "en" ? "en" : "de",
      tables: Array.isArray(r.tables) && r.tables.every((t) => TABLES.includes(t as (typeof TABLES)[number])) && r.tables.length
        ? r.tables : DEFAULTS.tables,
      mode: r.mode === "divide" || r.mode === "mixed" ? r.mode : "multiply",
      timer: r.timer === true,
      mastery: typeof r.mastery === "object" && r.mastery !== null ? r.mastery : {},
    };
  } catch {
    return { ...DEFAULTS };
  }
}
let saved = load();
function save(): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* private mode: progress lasts until the tab closes */ }
}

// ---------- game state: one of three screens ----------
type Mistake = { q: Question; given: number };
type State =
  | { screen: "setup" }
  | {
      screen: "play"; round: Question[]; index: number; typed: string; correct: number;
      streak: number; bestStreak: number; mistakes: Mistake[]; startedAt: number; tricky: boolean;
      feedback: null | "ok" | "no";
    }
  | { screen: "result"; correct: number; total: number; bestStreak: number; seconds: number | null; mistakes: Mistake[] };

let state: State = { screen: "setup" };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[saved.lang];
const show = (q: Question) => (q.kind === "multiply" ? `${q.a} · ${q.b}` : `${q.product} : ${q.divisor}`);

// ---------- rendering ----------
function renderText(): void {
  document.documentElement.lang = saved.lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => {
    const key = el.dataset.t as UiKey | "title";
    if (key === "title") return;
    el.textContent = t()[key];
  });
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === saved.lang)));
  document.querySelector<HTMLButtonElement>('[data-key="del"]')!.setAttribute("aria-label", t().del);
}

function renderSetup(): void {
  const box = $("tables");
  box.replaceChildren(
    ...TABLES.map((n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "table-btn";
      b.textContent = String(n);
      b.setAttribute("aria-pressed", String(saved.tables.includes(n)));
      b.addEventListener("click", () => {
        saved.tables = saved.tables.includes(n) ? saved.tables.filter((x) => x !== n) : [...saved.tables, n].sort((a, z) => a - z);
        save();
        renderSetup();
      });
      return b;
    }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === saved.mode)));
  $("timer").setAttribute("aria-pressed", String(saved.timer));

  const n = saved.tables.length ? trickyPool(questionsFor(saved.tables, saved.mode), saved.mastery).length : 0;
  for (const id of ["tricky", "tricky2"]) $<HTMLButtonElement>(id).disabled = n === 0;
  $("tricky-label").textContent = t().tricky(n);
  $("tricky-label2").textContent = t().tricky(n);
  $("setup-error").hidden = true;
  renderBoard();
}

/** 10 × 10 board of multiplication facts, coloured by how well each is known. */
function renderBoard(): void {
  const board = $("board");
  const cells: HTMLElement[] = [Object.assign(document.createElement("span"), { className: "head", textContent: "·" })];
  for (const col of TABLES) cells.push(Object.assign(document.createElement("span"), { className: "head", textContent: String(col) }));
  for (const row of TABLES) {
    cells.push(Object.assign(document.createElement("span"), { className: "head", textContent: String(row) }));
    for (const col of TABLES) {
      const s = saved.mastery[`m:${row}x${col}`];
      const cell = document.createElement("span");
      cell.className = s ? `b${s.box}` : "b-none";
      cell.textContent = s ? String(row * col) : "";
      cells.push(cell);
    }
  }
  board.replaceChildren(...cells);
  const known = Object.entries(saved.mastery).filter(([k, s]) => k.startsWith("m:") && s && s.box >= MAX_BOX - 1).length;
  board.setAttribute("aria-label", `${known} / 100`);
}

function renderPlay(): void {
  if (state.screen !== "play") return;
  const s = state;
  const q = s.round[s.index]!;
  $("progress").replaceChildren(
    ...s.round.map((_, i) => {
      const dot = document.createElement("i");
      if (i < s.index || (i === s.index && s.feedback)) {
        const wasWrong = s.mistakes.some((m) => m.q === s.round[i]);
        dot.className = wasWrong ? "no" : "ok";
      } else if (i === s.index) dot.className = "now";
      return dot;
    }),
  );
  $("streak").textContent = s.streak >= 3 ? `🔥 ${s.streak}` : "";
  $("question").textContent = show(q);
  $("answer").textContent = s.feedback === "no" ? String(answerOf(q)) : s.typed || "?";
  const card = $("question-card");
  card.classList.toggle("ok", s.feedback === "ok");
  card.classList.toggle("no", s.feedback === "no");

  const fb = $("feedback");
  fb.hidden = s.feedback === null;
  document.querySelectorAll<HTMLButtonElement>("#keypad button").forEach((b) => (b.disabled = s.feedback !== null));
  $("keypad").hidden = s.feedback === "no";

  if (s.feedback === "ok") {
    const words = t().right;
    $("verdict").textContent = words[s.correct % words.length]!;
    $("verdict").className = "verdict ok";
    $("dots-fig").hidden = true;
    $("explain").replaceChildren();
    $("next").hidden = true;
  } else if (s.feedback === "no") {
    $("verdict").textContent = t().wrong(show(q), answerOf(q));
    $("verdict").className = "verdict no";
    drawDots(q);
    renderSections($("explain"), explainQuestion(q, saved.lang), "c-times");
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
      const li = document.createElement("li");
      li.append(`${show(q)} = ${answerOf(q)}`, Object.assign(document.createElement("span"), { textContent: t().you(given) }));
      return li;
    }),
  );
  renderSetup(); // refresh the tricky counts on this screen's buttons
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

// ---------- the dots picture ----------
const NS = "http://www.w3.org/2000/svg";
const BLUE = "#00d4ff", ORANGE = "#ffb347";

function drawDots(q: Question): void {
  const svg = $("dots") as unknown as SVGSVGElement;
  const rows = q.kind === "multiply" ? q.a : answerOf(q);
  const cols = q.kind === "multiply" ? q.b : q.divisor;
  // Colour the rows the way the strategy splits them: 7 · 8 → 5 blue rows + 2 orange rows.
  const s = strategyFor(rows);
  const split = q.kind === "divide" ? rows : s.kind === "plus" ? s.first : s.kind === "double" ? s.half : rows;
  const ghost = q.kind === "multiply" && s.kind === "minus" ? s.take : 0; // 9 · 6: show the 10th row faded

  const gap = 30, r = 10, pad = 16;
  const totalRows = rows + ghost;
  svg.setAttribute("viewBox", `0 0 ${pad * 2 + (cols - 1) * gap} ${pad * 2 + (totalRows - 1) * gap}`);
  svg.setAttribute("aria-label", `${rows} × ${cols}`);
  const nodes: SVGElement[] = [];
  for (let i = 0; i < totalRows; i++) {
    for (let j = 0; j < cols; j++) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", String(pad + j * gap));
      c.setAttribute("cy", String(pad + i * gap));
      c.setAttribute("r", String(r));
      if (i >= rows) {
        c.setAttribute("fill", "none");
        c.setAttribute("stroke", "#6f8296");
        c.setAttribute("stroke-dasharray", "3 3");
        c.setAttribute("stroke-width", "2");
      } else {
        c.setAttribute("fill", i < split ? BLUE : ORANGE);
      }
      nodes.push(c);
    }
  }
  svg.replaceChildren(...nodes);
  $("dots-fig").hidden = false;
}

// ---------- actions ----------
function startRound(tricky: boolean): void {
  if (saved.tables.length === 0) {
    $("setup-error").textContent = t().pickTable;
    $("setup-error").hidden = false;
    return;
  }
  const all = questionsFor(saved.tables, saved.mode);
  const pool = tricky ? trickyPool(all, saved.mastery) : all;
  if (pool.length === 0) return;
  state = {
    screen: "play", round: makeRound(pool, saved.mastery, Math.random, Math.min(10, tricky ? Math.max(pool.length, 5) : 10)),
    index: 0, typed: "", correct: 0, streak: 0, bestStreak: 0, mistakes: [], startedAt: Date.now(), tricky, feedback: null,
  };
  render();
}

let advanceTimer: number | undefined;

function press(key: string): void {
  if (state.screen !== "play") return;
  const s = state;
  if (s.feedback === "no" && (key === "ok" || key === "next")) return next();
  if (s.feedback !== null) return;
  if (/^\d$/.test(key) && s.typed.length < 3) s.typed = (s.typed + key).replace(/^0+(?=\d)/, "");
  else if (key === "del") s.typed = s.typed.slice(0, -1);
  else if (key === "ok" && s.typed !== "") return check();
  renderPlay();
}

function check(): void {
  if (state.screen !== "play") return;
  const s = state;
  const q = s.round[s.index]!;
  const given = Number(s.typed);
  const ok = isCorrect(q, given);
  saved.mastery = record(saved.mastery, q.key, ok);
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
    s.mistakes.push({ q, given });
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
  const answered = s.index + (s.feedback ? 1 : 0);
  state = {
    screen: "result", correct: s.correct, total: answered, bestStreak: s.bestStreak, mistakes: s.mistakes,
    seconds: saved.timer ? Math.round((Date.now() - s.startedAt) / 1000) : null,
  };
  render();
  window.scrollTo({ top: 0 });
}

// ---------- events ----------
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    saved.lang = b.dataset.lang === "en" ? "en" : "de";
    save();
    render();
  }),
);
$("all-tables").addEventListener("click", () => {
  saved.tables = saved.tables.length === 10 ? [] : [...TABLES];
  save();
  renderSetup();
});
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) =>
  b.addEventListener("click", () => {
    saved.mode = b.dataset.mode as Mode;
    save();
    renderSetup();
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
$("tricky2").addEventListener("click", () => startRound(true));
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

$("reset").addEventListener("click", () => { $("reset-confirm").hidden = false; $("reset").hidden = true; });
$("reset-no").addEventListener("click", () => { $("reset-confirm").hidden = true; $("reset").hidden = false; });
$("reset-yes").addEventListener("click", () => {
  saved.mastery = {};
  save();
  $("reset-confirm").hidden = true;
  $("reset").hidden = false;
  renderSetup();
});

render();
