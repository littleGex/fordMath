import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/dreisatz.css";
import { classify, makeProportionRound, product, quotient, STORIES, type Dreisatz, type Kind, type ProportionQuestion, type Relation, type Row, type Story } from "../lib/proportion";
import { parseRational, type Rational } from "../lib/rational";
import { choiceText, dreisatzLines, dreisatzWhy, num, quizChoice, quizPrompt, quizSteps, relationName, relationRule, storyText, storyUnits, whyRelation } from "../explain/proportion";
import type { Lang } from "../explain/lang";
import { mountQuiz } from "./quiz";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Dreisatz", subtitle: "Proportionale und antiproportionale Zuordnungen",
    checkTitle: "Zuordnung prüfen", checkHint: "Trag eine Wertetabelle ein. Ist y : x immer gleich, oder x · y?",
    quizTitle: "Quiz", quizIntro: "10 Fragen: Dreisatz in beide Richtungen, Tabellen erkennen und ergänzen.", quizGo: "Quiz starten",
    next: "Weiter", again: "Noch mal", right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`, score: (c: number) => `${c} von 10 richtig`,
    bad: "Bitte positive Zahlen eingeben, z. B. 3 oder 4,50.", graph: "Graph der Zuordnung",
    stories: { apples: "🍎 Äpfel", pumps: "💧 Pumpen", flour: "🥣 Rezept", prize: "🏆 Gewinn teilen" } as Partial<Record<Story, string>>,
    tables: [["🍎 Äpfel", "1 2 3 5", "1,5 3 4,5 7,5"], ["💧 Pumpen", "1 2 3 4", "24 12 8 6"], ["🚕 Taxi", "1 2 3 4", "5 7 9 11"]],
    neitherNote: "Die Punkte liegen weder auf einer Geraden durch 0 noch auf einer Hyperbel.",
  },
  en: {
    title: "Rule of three", subtitle: "Proportional and inversely proportional relationships",
    checkTitle: "Check a table", checkHint: "Type a table of values. Is y : x always the same, or x · y?",
    quizTitle: "Quiz", quizIntro: "10 questions: the rule of three both ways, recognising and completing tables.", quizGo: "Start the quiz",
    next: "Next", again: "Again", right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`, score: (c: number) => `${c} out of 10 right`,
    bad: "Please type positive numbers, e.g. 3 or 4.50.", graph: "Graph of the relationship",
    stories: { apples: "🍎 Apples", pumps: "💧 Pumps", flour: "🥣 Recipe", prize: "🏆 Sharing a prize" } as Partial<Record<Story, string>>,
    tables: [["🍎 Apples", "1 2 3 5", "1.5 3 4.5 7.5"], ["💧 Pumps", "1 2 3 4", "24 12 8 6"], ["🚕 Taxi", "1 2 3 4", "5 7 9 11"]],
    neitherNote: "The points lie neither on a straight line through 0 nor on a hyperbola.",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];
const STORY_NUMBERS: Partial<Record<Story, [string, string, string]>> = {
  apples: ["3", "4,5", "5"], pumps: ["4", "6", "3"], flour: ["4", "500", "6"], prize: ["4", "15", "5"],
};

let lang: Lang = getLang();
let kind: Kind = "proportional";
let story: Story | null = "apples";
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const input = (id: string) => $<HTMLInputElement>(id);
const positive = (text: string): Rational | null => {
  const v = parseRational(text.trim());
  return v && v.n > 0 ? v : null;
};

// ---------- the Dreisatz ----------

function renderDreisatz(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach((b) => {
    b.textContent = `${relationName(b.dataset.kind as Kind, lang)}: ${relationRule(b.dataset.kind as Kind, lang)}`;
    b.setAttribute("aria-pressed", String(b.dataset.kind === kind));
  });
  const u = story ? storyUnits(story, lang) : { x: "", one: "", y: "" };
  $("ux1").textContent = $("ux2").textContent = u.x;
  $("uy1").textContent = $("uy2").textContent = u.y;
  const [a, b, c] = ["a", "b", "c"].map((id) => positive(input(id).value));
  const err = $("error");
  const filled = ["a", "b", "c"].every((id) => input(id).value.trim() !== "");
  err.hidden = !filled || (a !== null && b !== null && c !== null);
  err.textContent = t().bad;
  if (!a || !b || !c) {
    $("lines").replaceChildren();
    $("why").textContent = "";
    $("story").textContent = "";
    return;
  }
  const d: Dreisatz = { kind, a, b, c };
  $("story").textContent = story ? storyText(story, a, b, c, lang) : "";
  const lines = dreisatzLines(d, lang, u.x, u.y, u.one);
  const inv = kind === "inverse" ? " inv" : "";
  $("lines").replaceChildren(...lines.flatMap((l, i) => {
    const last = i === lines.length - 1 ? " last" : "";
    return [
      el("span", l.opLeft ? `${l.opLeft} ↓` : "", "op l"),
      el("span", l.left, `side${last}`),
      el("span", "≙", "eq"),
      el("span", l.right, `side r${last}`),
      el("span", l.opRight ? `↓ ${l.opRight}` : "", `op${inv}`),
    ];
  }));
  $("why").textContent = dreisatzWhy(kind, lang);
}

for (const id of ["a", "b", "c"]) input(id).addEventListener("input", renderDreisatz);
document.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach((b) =>
  b.addEventListener("click", () => {
    kind = b.dataset.kind === "inverse" ? "inverse" : "proportional";
    if (story && STORIES[story] !== kind) story = null; // the story's units no longer fit
    renderDreisatz();
  }),
);

// ---------- checking a table ----------

const COLS = 4;
function buildCheckTable(): void {
  const row = (label: string, prefix: string) => {
    const tr = document.createElement("tr");
    tr.append(el("th", label));
    for (let i = 0; i < COLS; i++) {
      const td = document.createElement("td");
      const inp = Object.assign(document.createElement("input"), { id: `${prefix}${i}`, type: "text", inputMode: "decimal", autocomplete: "off" });
      inp.setAttribute("aria-label", `${label} ${i + 1}`);
      inp.addEventListener("input", renderCheck);
      td.append(inp);
      tr.append(td);
    }
    return tr;
  };
  const calc = (label: string, id: string) => {
    const tr = el("tr", "", "calc");
    tr.id = id;
    tr.append(el("th", label));
    for (let i = 0; i < COLS; i++) tr.append(el("td"));
    return tr;
  };
  $("check").replaceChildren(row("x", "x"), row("y", "y"), calc("y : x", "quot"), calc("x · y", "prod"));
}

function fillTable(xs: string, ys: string): void {
  xs.split(" ").forEach((v, i) => (input(`x${i}`).value = v));
  ys.split(" ").forEach((v, i) => (input(`y${i}`).value = lang === "de" ? v.replace(".", ",") : v));
  renderCheck();
}

function readRows(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < COLS; i++) {
    const x = positive(input(`x${i}`).value);
    const y = positive(input(`y${i}`).value);
    if (x && y) rows.push([x, y]);
  }
  return rows;
}

function renderCheck(): void {
  const cells = (id: string) => [...$(id).querySelectorAll("td")];
  for (let i = 0; i < COLS; i++) {
    const x = positive(input(`x${i}`).value);
    const y = positive(input(`y${i}`).value);
    cells("quot")[i]!.textContent = x && y ? num(quotient([x, y]), lang) : "";
    cells("prod")[i]!.textContent = x && y ? num(product([x, y]), lang) : "";
  }
  const rows = readRows();
  const relation: Relation | null = rows.length >= 2 ? classify(rows) : null;
  $("quot").classList.toggle("same", relation === "proportional");
  $("prod").classList.toggle("same", relation === "inverse");
  $("verdict").textContent = relation ? relationName(relation, lang) : "";
  $("verdict").classList.toggle("neither", relation === "neither");
  $("verdict-why").textContent = relation ? `${whyRelation(rows, relation, lang)}${relation === "neither" ? ` ${t().neitherNote}` : ""}` : "";
  drawGraph(rows, relation);
}

/** The points, with the line through 0 or the hyperbola they lie on. */
function drawGraph(rows: Row[], relation: Relation | null): void {
  const svg = $("graph") as unknown as SVGSVGElement;
  const NS = "http://www.w3.org/2000/svg";
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    nodes.push(n);
    return n;
  };
  const W = 360, H = 240, L = 40, B = 24, T = 12, R = 14;
  const pts = rows.map(([x, y]) => [x.n / x.d, y.n / y.d] as const);
  const xMax = niceMax(Math.max(1, ...pts.map((p) => p[0])) * 1.15);
  const yMax = niceMax(Math.max(1, ...pts.map((p) => p[1])) * 1.15);
  const sx = (x: number) => L + (x / xMax) * (W - L - R);
  const sy = (y: number) => H - B - (y / yMax) * (H - B - T);
  for (let i = 0; i <= 4; i++) {
    add("line", { x1: sx((xMax * i) / 4), x2: sx((xMax * i) / 4), y1: sy(0), y2: sy(yMax), stroke: "#2a3756", "stroke-width": 1 });
    add("line", { x1: sx(0), x2: sx(xMax), y1: sy((yMax * i) / 4), y2: sy((yMax * i) / 4), stroke: "#2a3756", "stroke-width": 1 });
    add("text", { x: sx((xMax * i) / 4), y: H - 6, "text-anchor": "middle", fill: "#a9b8c9", "font-size": 11 }, short((xMax * i) / 4));
    add("text", { x: L - 6, y: sy((yMax * i) / 4) + 4, "text-anchor": "end", fill: "#a9b8c9", "font-size": 11 }, short((yMax * i) / 4));
  }
  add("line", { x1: sx(0), x2: sx(xMax), y1: sy(0), y2: sy(0), stroke: "#a9b8c9", "stroke-width": 1.5 });
  add("line", { x1: sx(0), x2: sx(0), y1: sy(0), y2: sy(yMax), stroke: "#a9b8c9", "stroke-width": 1.5 });
  const first = rows[0];
  if (first && relation === "proportional") {
    const k = toNum(quotient(first));
    const xEnd = Math.min(xMax, yMax / k);
    add("line", { x1: sx(0), y1: sy(0), x2: sx(xEnd), y2: sy(k * xEnd), stroke: "#34d399", "stroke-width": 2.5 });
  } else if (first && relation === "inverse") {
    const k = toNum(product(first));
    const xs = Array.from({ length: 80 }, (_, i) => k / yMax + ((xMax - k / yMax) * i) / 79);
    add("polyline", { points: xs.map((x) => `${sx(x)},${sy(k / x)}`).join(" "), fill: "none", stroke: "#ff4da6", "stroke-width": 2.5 });
  } else if (pts.length >= 2) {
    const sorted = [...pts].sort((p, q) => p[0] - q[0]);
    add("polyline", { points: sorted.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" "), fill: "none", stroke: "#6f8296", "stroke-width": 1.5, "stroke-dasharray": "4 4" });
  }
  for (const [x, y] of pts) add("circle", { cx: sx(x), cy: sy(y), r: 5, fill: "#eef3fb" });
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("aria-label", t().graph);
  svg.replaceChildren(...nodes);
}
const toNum = (q: Rational) => q.n / q.d;
function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 4, 5, 8, 10].find((m) => m * p >= v) ?? 10) * p;
}
const short = (v: number) => {
  const s = String(Math.round(v * 100) / 100);
  return lang === "de" ? s.replace(".", ",") : s;
};

// ---------- quiz ----------

function quizTable(q: ProportionQuestion): Node | null {
  if (q.kind === "story") return null;
  const table = el("table", "", "ztable quiz-table");
  const row = (label: string, values: Array<number | null>, cls = "") => {
    const tr = el("tr", "", cls);
    tr.append(el("th", label), ...values.map((v) => el("td", v === null ? "?" : choiceText(String(v), lang), v === null ? "missing" : "")));
    return tr;
  };
  table.append(row("x", q.xs), row("y", q.ys));
  return table;
}

const quiz = mountQuiz<ProportionQuestion>({
  host: $("quiz"),
  colour: "c-dreisatz",
  makeRound: () => makeProportionRound(Math.random),
  prompt: (q, l) => quizPrompt(q, l),
  choices: (q, l) => q.choices.map((c) => quizChoice(q, c, l)),
  answer: (q) => q.answer,
  steps: (q, l) => quizSteps(q, l),
  picture: (q) => quizTable(q),
  columns: (q) => (q.kind === "classify" ? 1 : undefined),
  words: (l) => ({ intro: UI[l].quizIntro, go: UI[l].quizGo, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: UI[l].wrong, score: (c) => UI[l].score(c) }),
});

// ---------- wiring ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("stories").replaceChildren(...(Object.keys(STORY_NUMBERS) as Story[]).map((s) => {
    const b = el("button", t().stories[s] ?? s, "chip") as HTMLButtonElement;
    b.type = "button";
    b.addEventListener("click", () => setStory(s));
    return b;
  }));
  $("tables").replaceChildren(...t().tables.map(([label, xs, ys]) => {
    const b = el("button", label, "chip") as HTMLButtonElement;
    b.type = "button";
    b.addEventListener("click", () => fillTable(xs!, ys!));
    return b;
  }));
  // Decimals typed with the other language's mark still parse; just redraw.
  renderDreisatz();
  renderCheck();
  quiz.render(lang);
}

function setStory(s: Story): void {
  story = s;
  kind = STORIES[s];
  const [a, b, c] = STORY_NUMBERS[s]!;
  input("a").value = a;
  input("b").value = lang === "de" ? b : b.replace(",", ".");
  input("c").value = c;
  renderDreisatz();
}

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

buildCheckTable();
render();
setStory("apples");
fillTable(...(UI[lang].tables[1]!.slice(1) as [string, string]));
