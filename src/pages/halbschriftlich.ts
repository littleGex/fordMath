import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/halbschriftlich.css";
import { SPLIT_LEVELS, makeSplitTask, type SplitLevel, type SplitTask } from "../lib/partly-written";
import { starsFor } from "../lib/times-tables";
import { explainSplit, splitLine, taskText } from "../explain/partly-written";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Halbschriftlich", subtitle: "Zerlegen, im Kopf rechnen, zusammensetzen",
    levels: { 1: "Zweistellig", 2: "Dreistellig", 3: "Profi (mit Rest)" } as Record<SplitLevel, string>,
    hint: "Rechne jeden Teil aus und trag die Ergebnisse ein.", check: "Prüfen", next: "Nächste Aufgabe", finish: "Fertig", again: "Neue Aufgaben",
    right: "Alles richtig! ⭐", someWrong: "Noch nicht alles richtig. Schau dir die roten Felder an.", shown: "So geht's:",
    empty: "Füll erst alle Felder aus.", rest: "R",
    count: (i: number, n: number) => `Aufgabe ${i} von ${n}`, score: (c: number, n: number) => `${c} von ${n} beim ersten Versuch richtig`,
    picture: "Bild der Zerlegung",
  },
  en: {
    title: "Partly written", subtitle: "Split, work out in your head, put together",
    levels: { 1: "Two digits", 2: "Three digits", 3: "Expert (remainders)" } as Record<SplitLevel, string>,
    hint: "Work out each part and type the results.", check: "Check", next: "Next one", finish: "Done", again: "New ones",
    right: "All right! ⭐", someWrong: "Not all right yet. Look at the red boxes.", shown: "Here's how:",
    empty: "Fill in every box first.", rest: "r",
    count: (i: number, n: number) => `Sum ${i} of ${n}`, score: (c: number, n: number) => `${c} of ${n} right first time`,
    picture: "Picture of the split",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const ROUND = 5;
let lang: Lang = getLang();
let level: SplitLevel = 1;
let round: SplitTask[] = [];
let index = 0;
let firstTry = 0;
let tries = 0;
let solved = false;
let finished = false;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });

function startRound(): void {
  round = Array.from({ length: ROUND }, () => makeSplitTask(level, Math.random));
  index = 0;
  firstTry = 0;
  tries = 0;
  solved = false;
  finished = false;
  render();
  focusFirst();
}

// ---------- the working with boxes to fill in ----------

function input(answer: number, wide = false): HTMLInputElement {
  const box = el("input", "", wide ? "wide" : "") as HTMLInputElement;
  box.type = "text";
  box.inputMode = "numeric";
  box.autocomplete = "off";
  box.dataset.answer = String(answer);
  box.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
  return box;
}

function renderWorking(task: SplitTask): void {
  const line = (...nodes: Array<Node | string>) => {
    const row = el("div", "", "line");
    row.append(...nodes);
    return row;
  };
  const eq = () => el("span", "=", "eq");
  const plusJoined = (boxes: HTMLInputElement[]) => boxes.flatMap((b, i) => (i === 0 ? [b] : [el("span", "+", "op"), b]));
  const parts = task.kind === "multiply" ? task.products : task.quotients;
  const partBoxes = parts.map((p) => input(p, p >= 1000));
  const total = input(task.result, task.result >= 1000);
  const rows: HTMLElement[] = [line(el("span", taskText(task), "task")), line(eq(), el("span", splitLine(task)))];
  if (task.kind === "divide" && task.rest) {
    const restBox = input(task.rest);
    rows.push(line(eq(), ...plusJoined(partBoxes)), line(eq(), total, el("span", t().rest, "op"), restBox));
  } else {
    rows.push(line(eq(), ...plusJoined(partBoxes)), line(eq(), total));
  }
  $("working").replaceChildren(...rows);
}

/** The split as a picture: a rectangle in parts for ·, a bar in parts for :. */
function renderPicture(task: SplitTask): void {
  const svg = $("picture") as unknown as SVGSVGElement;
  const NS = "http://www.w3.org/2000/svg";
  const W = 340;
  const nodes: SVGElement[] = [];
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    nodes.push(n);
  };
  const colours = ["#ff9f43", "#4fc3f7", "#b967ff", "#7cfc00"];
  const parts = task.kind === "multiply" ? task.parts : task.parts.map((p, i) => (i === task.parts.length - 1 ? p + task.rest : p));
  const total = parts.reduce((a, p) => a + p, 0);
  // Every part gets at least a little room, so a small part like 6 next to 40 stays visible.
  const widths = parts.map((p) => Math.max(p / total, 0.16));
  const scale = (W - 20) / widths.reduce((a, w) => a + w, 0);
  const H = task.kind === "multiply" ? 90 : 46;
  let x = 10;
  parts.forEach((p, i) => {
    const w = widths[i]! * scale;
    add("rect", { x, y: 26, width: w - 3, height: H, rx: 6, fill: colours[i % 4]!, "fill-opacity": 0.35, stroke: colours[i % 4]!, "stroke-width": 2 });
    const label = task.kind === "multiply" ? (task.b < 10 ? `${task.b}·${p}` : `${p}·${task.b}`) : `${p}:${task.divisor}`;
    add("text", { x: x + w / 2, y: 26 + H / 2 + 5, "text-anchor": "middle", fill: "#eef3fb", "font-size": w < 70 ? 11 : 14, "font-weight": 700 }, label);
    add("text", { x: x + w / 2, y: 18, "text-anchor": "middle", fill: colours[i % 4]!, "font-size": 13, "font-weight": 700 }, String(p));
    x += w;
  });
  if (task.kind === "multiply") add("text", { x: 4, y: 26 + H / 2 + 5, "text-anchor": "end", fill: "#a9b8c9", "font-size": 13 }, String(task.b));
  svg.setAttribute("viewBox", `-20 0 ${W + 20} ${26 + H + 10}`);
  svg.setAttribute("aria-label", t().picture);
  svg.replaceChildren(...nodes);
}

function focusFirst(): void {
  $("working").querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
}

// ---------- checking ----------

function setMessage(text: string, tone: "ok" | "no"): void {
  $("message").textContent = text;
  $("message").className = `message ${tone}`;
  $("message").hidden = false;
}

function check(): void {
  if (solved) return;
  const boxes = [...$("working").querySelectorAll<HTMLInputElement>("input")];
  if (boxes.some((b) => b.value.trim() === "")) return setMessage(t().empty, "no");
  let allOk = true;
  for (const b of boxes) {
    const ok = Number(b.value.trim().replace(/\s/g, "")) === Number(b.dataset.answer);
    b.classList.toggle("ok", ok);
    b.classList.toggle("no", !ok);
    allOk &&= ok;
  }
  const task = round[index]!;
  if (allOk) {
    if (tries === 0) firstTry++;
    solved = true;
    setMessage(t().right, "ok");
  } else {
    tries++;
    if (tries >= 2) {
      solved = true;
      for (const b of boxes) { b.value = b.dataset.answer!; b.classList.remove("no"); b.classList.add("ok"); }
      setMessage(t().shown, "no");
    } else setMessage(t().someWrong, "no");
  }
  if (solved) {
    for (const b of boxes) b.readOnly = true;
    $("steps").replaceChildren(...explainSplit(task, lang).map((s) => el("li", s)));
    $("steps").hidden = false;
    $("check").hidden = true;
    $("next").hidden = false;
    $("next-label").textContent = index + 1 >= round.length ? t().finish : t().next;
    $("next").focus();
  }
}

// ---------- rendering ----------

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("levels").replaceChildren(...SPLIT_LEVELS.map((lv) => {
    const b = el("button", t().levels[lv], "chip") as HTMLButtonElement;
    b.type = "button";
    b.setAttribute("aria-pressed", String(lv === level));
    b.addEventListener("click", () => { level = lv; startRound(); });
    return b;
  }));
  $("play").hidden = finished;
  $("done").hidden = !finished;
  if (finished) {
    const stars = starsFor(firstTry, round.length);
    $("stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("score").textContent = t().score(firstTry, round.length);
    return;
  }
  const task = round[index]!;
  $("progress").replaceChildren(...round.map((_, i) => el("i", "", i < index ? "ok" : i === index ? "now" : "")));
  $("count").textContent = t().count(index + 1, round.length);
  renderWorking(task);
  renderPicture(task);
  $("message").hidden = true;
  $("steps").hidden = true;
  $("check").hidden = false;
  $("next").hidden = true;
}

$("check").addEventListener("click", check);
$("next").addEventListener("click", () => {
  if (index + 1 >= round.length) finished = true;
  else {
    index++;
    tries = 0;
    solved = false;
  }
  render();
  if (!finished) focusFirst();
});
$("again").addEventListener("click", startRound);
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    // Keep what's been typed: only the words change.
    const typed = [...$("working").querySelectorAll<HTMLInputElement>("input")].map((i) => i.value);
    render();
    [...$("working").querySelectorAll<HTMLInputElement>("input")].forEach((i, k) => (i.value = typed[k] ?? ""));
  }),
);

startRound();
