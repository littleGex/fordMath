import "./sw-register";
import "../styles/zone.css";
import "../styles/brueche.css";
import { LEVELS, makeFractionRound, type Choice, type Fraction, type FractionLevel, type FractionQuestion } from "../lib/fraction";
import { starsFor } from "../lib/times-tables";
import { LEVEL_NAMES, barsFor, explainFraction, prompt } from "../explain/fraction";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";
import { renderSections } from "./render";

const UI = {
  de: {
    title: "Brüche", subtitle: "Teile, Pizzas und Streifen: Brüche spielend lernen",
    pickLevel: "Wähle ein Level", parents: "⚙️ Für Eltern", unlockAll: "Alle Level freischalten",
    reset: "Sterne löschen", resetSure: "Wirklich alle Sterne löschen?", yes: "Ja, löschen", no: "Nein",
    next: "Weiter", stop: "Runde beenden", again: "Nochmal", nextLevel: "Nächstes Level", toLevels: "Level wählen",
    right: ["Richtig! ⭐", "Super! ⭐", "Klasse! ⭐", "Genau! ⭐"], wrong: "Nicht ganz. So geht's:",
    equal: "gleich groß", score: (c: number, t: number) => `${c} von ${t} richtig`,
    praise: ["Nicht aufgeben, das wird!", "Gut, weiter üben!", "Toll gemacht!", "Super, alles richtig!"],
    unlocked: (name: string) => `🔓 Neues Level frei: ${name}`, locked: "Noch gesperrt: hol 2 Sterne im Level davor",
    level: (n: number) => `Level ${n}`,
  },
  en: {
    title: "Fractions", subtitle: "Slices, pizzas and bars: learn fractions by playing",
    pickLevel: "Choose a level", parents: "⚙️ For parents", unlockAll: "Unlock all levels",
    reset: "Clear stars", resetSure: "Really clear all stars?", yes: "Yes, clear", no: "No",
    next: "Next", stop: "Stop this round", again: "Again", nextLevel: "Next level", toLevels: "Choose a level",
    right: ["Right! ⭐", "Super! ⭐", "Brilliant! ⭐", "Yes! ⭐"], wrong: "Not quite. Here's how:",
    equal: "same size", score: (c: number, t: number) => `${c} out of ${t} right`,
    praise: ["Don't give up, you'll get there!", "Good, keep practising!", "Well done!", "Amazing, all right!"],
    unlocked: (name: string) => `🔓 New level unlocked: ${name}`, locked: "Locked: get 2 stars in the level before",
    level: (n: number) => `Level ${n}`,
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];
const LEVEL_EMOJI: Record<FractionLevel, string> = { 1: "🍕", 2: "🪄", 3: "✂️", 4: "⚖️", 5: "➕", 6: "🧩" };

// ---------- progress, remembered on this device ----------
interface Saved {
  stars: Partial<Record<FractionLevel, number>>;
  unlockAll: boolean;
}
const KEY = "fm.brueche.v1";
function load(): Saved {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Saved> | null;
    return { stars: r && typeof r.stars === "object" && r.stars ? r.stars : {}, unlockAll: r?.unlockAll === true };
  } catch {
    return { stars: {}, unlockAll: false };
  }
}
const saved = load();
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* not remembered */ }
};
const isUnlocked = (level: FractionLevel) => level === 1 || saved.unlockAll || (saved.stars[(level - 1) as FractionLevel] ?? 0) >= 2;

// ---------- screens ----------
type State =
  | { screen: "setup" }
  | {
      screen: "play"; level: FractionLevel; round: FractionQuestion[]; index: number;
      correct: number; streak: number; best: number; results: boolean[]; chose: number | null;
    }
  | { screen: "result"; level: FractionLevel; correct: number; total: number; newlyUnlocked: FractionLevel | null };

let state: State = { screen: "setup" };
let lang: Lang = getLang();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];

// ---------- drawing fractions ----------
function fracEl(f: Fraction): HTMLElement {
  const box = document.createElement("span");
  box.className = "frac";
  box.append(
    Object.assign(document.createElement("span"), { className: "n", textContent: String(f.num) }),
    Object.assign(document.createElement("span"), { className: "d", textContent: String(f.den) }),
  );
  box.setAttribute("aria-label", `${f.num}/${f.den}`);
  return box;
}

const NS = "http://www.w3.org/2000/svg";
function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}
const FILL = "#ff9ad5";
const EMPTY = "#24314e";
const EDGE = "#141c2e";

function pizza(f: Fraction): SVGSVGElement {
  const svg = svgEl("svg", { viewBox: "0 0 200 200", role: "img", "aria-label": `${f.num}/${f.den}` }) as SVGSVGElement;
  const cx = 100, cy = 100, r = 90;
  for (let i = 0; i < f.den; i++) {
    const a0 = (i / f.den) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / f.den) * 2 * Math.PI - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
    svg.appendChild(svgEl("path", { d, fill: i < f.num ? "#ffb347" : EMPTY, stroke: EDGE, "stroke-width": 4 }));
  }
  return svg;
}

/** One bar split into `den` equal parts with `num` coloured; used for single pictures and comparisons. */
function barShapes(f: Fraction, x: number, y: number, w: number, h: number, colour = FILL): SVGElement[] {
  const parts: SVGElement[] = [];
  const pw = w / f.den;
  for (let i = 0; i < f.den; i++) {
    parts.push(svgEl("rect", { x: x + i * pw, y, width: pw, height: h, fill: i < f.num ? colour : EMPTY, stroke: EDGE, "stroke-width": 3 }));
  }
  return parts;
}

function bar(f: Fraction): SVGSVGElement {
  const svg = svgEl("svg", { viewBox: "0 0 300 70", role: "img", "aria-label": `${f.num}/${f.den}` }) as SVGSVGElement;
  svg.append(...barShapes(f, 4, 4, 292, 62));
  return svg;
}

/** Bars of the same length, one under the other, so amounts can be compared by eye. */
function drawBars(fs: Fraction[]): void {
  const svg = $("bars") as unknown as SVGSVGElement;
  const h = 34, gap = 16, labelW = 70, w = 320;
  svg.setAttribute("viewBox", `0 0 ${labelW + w + 4} ${fs.length * (h + gap) - gap + 4}`);
  const colours = [FILL, "#4fc3f7", "#7cfc00"];
  const nodes: SVGElement[] = [];
  fs.forEach((f, i) => {
    const y = 2 + i * (h + gap);
    const label = svgEl("text", { x: 0, y: y + h * 0.72 });
    label.textContent = `${f.num}/${f.den}`;
    nodes.push(label, ...barShapes(f, labelW, y, w, h, colours[i % colours.length]));
  });
  svg.replaceChildren(...nodes);
  svg.setAttribute("aria-label", fs.map((f) => `${f.num}/${f.den}`).join(", "));
}

/** The fractions in the question, drawn big. */
function renderShow(q: FractionQuestion): void {
  const box = $("show");
  const op = (s: string) => Object.assign(document.createElement("span"), { className: "op", textContent: s });
  switch (q.kind) {
    case "name-picture":
      box.replaceChildren(q.picture === "pizza" ? pizza(q.shown) : bar(q.shown));
      break;
    case "equivalent":
    case "simplify":
      box.replaceChildren(fracEl(q.given));
      break;
    case "compare":
      box.replaceChildren(fracEl(q.left), op("?"), fracEl(q.right));
      break;
    case "add-same":
    case "add-different":
      box.replaceChildren(fracEl(q.left), op("+"), fracEl(q.right), op("="), op("?"));
      break;
  }
}

function choiceButton(c: Choice, i: number, s: Extract<State, { screen: "play" }>, q: FractionQuestion): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `choice ${c.kind === "equal" ? "equal" : ""}`;
  if (c.kind === "fraction") b.append(fracEl(c.value));
  else b.append("=", Object.assign(document.createElement("span"), { className: "label", textContent: t().equal }));
  if (s.chose !== null) {
    b.disabled = true;
    if (i === q.answer) b.classList.add("right");
    else if (i === s.chose) b.classList.add("wrong");
  }
  b.addEventListener("click", () => choose(i));
  return b;
}

// ---------- rendering ----------
function renderText(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
}

function renderSetup(): void {
  $("levels").replaceChildren(
    ...LEVELS.map((level) => {
      const open = isUnlocked(level);
      const stars = saved.stars[level] ?? 0;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tile level-btn";
      b.disabled = !open;
      b.title = open ? "" : t().locked;
      b.innerHTML = `<span class="num"></span><span class="emoji" aria-hidden="true"></span><h3></h3><span class="lvl-stars"></span>`;
      b.querySelector(".num")!.textContent = String(level);
      b.querySelector(".emoji")!.textContent = open ? LEVEL_EMOJI[level] : "🔒";
      b.querySelector("h3")!.textContent = LEVEL_NAMES[lang][level];
      b.querySelector(".lvl-stars")!.textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
      b.addEventListener("click", () => start(level));
      return b;
    }),
  );
  $<HTMLInputElement>("unlock-all").checked = saved.unlockAll;
}

function renderPlay(): void {
  if (state.screen !== "play") return;
  const s = state;
  const q = s.round[s.index]!;
  $("level-name").textContent = `${t().level(s.level)}: ${LEVEL_NAMES[lang][s.level]}`;
  $("streak").textContent = s.streak >= 3 ? `🔥 ${s.streak}` : "";
  $("progress").replaceChildren(
    ...s.round.map((_, i) => {
      const dot = document.createElement("i");
      if (i < s.results.length) dot.className = s.results[i] ? "ok" : "no";
      else if (i === s.index) dot.className = "now";
      return dot;
    }),
  );
  $("prompt").textContent = prompt(q, lang);
  renderShow(q);
  const choices = $("choices");
  choices.className = `choices ${q.choices.length === 3 ? "three" : ""}`;
  choices.replaceChildren(...q.choices.map((c, i) => choiceButton(c, i, s, q)));

  const fb = $("feedback");
  fb.hidden = s.chose === null;
  if (s.chose !== null) {
    const ok = s.chose === q.answer;
    $("verdict").textContent = ok ? t().right[s.correct % t().right.length]! : t().wrong;
    $("verdict").className = `verdict ${ok ? "ok" : "no"}`;
    drawBars(barsFor(q));
    renderSections($("explain"), explainFraction(q, lang), "c-fraction");
    $("next").hidden = ok;
    if (!ok) $("next").focus();
  }
}

function renderResult(): void {
  if (state.screen !== "result") return;
  const s = state;
  const stars = starsFor(s.correct, s.total);
  $("stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  $("praise").textContent = t().praise[stars]!;
  $("score").textContent = t().score(s.correct, s.total);
  $("unlocked").hidden = s.newlyUnlocked === null;
  if (s.newlyUnlocked) $("unlocked").textContent = t().unlocked(LEVEL_NAMES[lang][s.newlyUnlocked]);
  const nextLevel = (s.level + 1) as FractionLevel;
  $<HTMLButtonElement>("next-level").disabled = s.level === 6 || !isUnlocked(nextLevel);
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

// ---------- actions ----------
let advance: number | undefined;

function start(level: FractionLevel): void {
  if (!isUnlocked(level)) return;
  state = { screen: "play", level, round: makeFractionRound(level, Math.random), index: 0, correct: 0, streak: 0, best: 0, results: [], chose: null };
  render();
  window.scrollTo({ top: 0 });
}

function choose(i: number): void {
  if (state.screen !== "play" || state.chose !== null) return;
  const s = state;
  const ok = i === s.round[s.index]!.answer;
  s.chose = i;
  s.results.push(ok);
  if (ok) {
    s.correct++;
    s.streak++;
    s.best = Math.max(s.best, s.streak);
    advance = window.setTimeout(next, 1100);
  } else {
    s.streak = 0;
  }
  renderPlay();
}

function next(): void {
  window.clearTimeout(advance);
  if (state.screen !== "play") return;
  const s = state;
  if (s.index + 1 >= s.round.length) return finish();
  s.index++;
  s.chose = null;
  renderPlay();
  window.scrollTo({ top: 0 });
}

function finish(): void {
  window.clearTimeout(advance);
  if (state.screen !== "play") return;
  const s = state;
  const total = s.results.length;
  const stars = starsFor(s.correct, total);
  const nextLevel = (s.level + 1) as FractionLevel;
  const wasLocked = s.level < 6 && !isUnlocked(nextLevel);
  if (total > 0) saved.stars[s.level] = Math.max(saved.stars[s.level] ?? 0, stars);
  save();
  state = { screen: "result", level: s.level, correct: s.correct, total, newlyUnlocked: wasLocked && isUnlocked(nextLevel) ? nextLevel : null };
  render();
  window.scrollTo({ top: 0 });
}

// ---------- events ----------
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
$("next").addEventListener("click", next);
$("stop").addEventListener("click", finish);
$("again").addEventListener("click", () => state.screen === "result" && start(state.level));
$("next-level").addEventListener("click", () => state.screen === "result" && state.level < 6 && start((state.level + 1) as FractionLevel));
$("to-levels").addEventListener("click", () => { state = { screen: "setup" }; render(); });
$<HTMLInputElement>("unlock-all").addEventListener("change", (e) => {
  saved.unlockAll = (e.target as HTMLInputElement).checked;
  save();
  renderSetup();
});
$("reset").addEventListener("click", () => { $("reset-confirm").hidden = false; $("reset").hidden = true; });
$("reset-no").addEventListener("click", () => { $("reset-confirm").hidden = true; $("reset").hidden = false; });
$("reset-yes").addEventListener("click", () => {
  saved.stars = {};
  save();
  $("reset-confirm").hidden = true;
  $("reset").hidden = false;
  renderSetup();
});
document.addEventListener("keydown", (e) => {
  if (state.screen !== "play") return;
  if (state.chose === null && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
  else if (state.chose !== null && e.key === "Enter") next();
});

render();
