import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/heute.css";
import { chooseTopics, currentStreak, dayOf, daysBetween, finishRound, recordAnswer, type Day, type Progress, type Streak } from "../lib/daily";
import { TOPICS, makeMixedQuestion, topicsFor, type DailyLevel, type MixedQuestion } from "./daily-topics";
import { mountQuiz } from "./quiz";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Heute üben", subtitle: "10 gemischte Aufgaben aus deinen Themen", gs: "Grundschule", sek1: "Klasse 5 bis 7",
    intro: "Themen, die noch nicht so gut klappen, kommen öfter dran.", go: "Los geht's!", next: "Weiter", again: "Noch eine Runde",
    right: "Richtig! ⭐", wrong: (a: string) => `Leider nicht. Richtig ist: ${a}`, score: (c: number, t: number) => `${c} von ${t} richtig`,
    days: (n: number) => (n === 0 ? "Noch keine Serie" : n === 1 ? "1 Tag" : `${n} Tage in Folge`),
    doneToday: "Heute schon geübt ✓ Morgen geht's weiter!", notYet: (n: number) => (n ? "Üb heute, damit die Serie weitergeht!" : "Eine Runde am Tag, und die Serie wächst."),
    progressTitle: "Deine Themen", never: "noch nicht geübt", today: "heute", yesterday: "gestern", ago: (n: number) => `vor ${n} Tagen`,
    rightOf: (r: number, s: number) => `${r} von ${s} richtig`,
    reset: "Fortschritt löschen", resetSure: "Wirklich alles löschen?", yes: "Ja, löschen", no: "Nein",
  },
  en: {
    title: "Practise today", subtitle: "10 mixed questions from your topics", gs: "Primary", sek1: "Years 5 to 7",
    intro: "Topics that aren't going so well yet come up more often.", go: "Let's go!", next: "Next", again: "Another round",
    right: "Right! ⭐", wrong: (a: string) => `Not quite. The answer is ${a}`, score: (c: number, t: number) => `${c} out of ${t} right`,
    days: (n: number) => (n === 0 ? "No streak yet" : n === 1 ? "1 day" : `${n} days in a row`),
    doneToday: "Practised today ✓ See you tomorrow!", notYet: (n: number) => (n ? "Practise today to keep your streak!" : "One round a day, and your streak grows."),
    progressTitle: "Your topics", never: "not practised yet", today: "today", yesterday: "yesterday", ago: (n: number) => `${n} days ago`,
    rightOf: (r: number, s: number) => `${r} of ${s} right`,
    reset: "Clear progress", resetSure: "Really clear everything?", yes: "Yes, clear", no: "No",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

// ---------- saved on this device ----------
const KEY = "fm.daily.v1";
const LEVEL_KEY = "fm.level"; // shared with the homepage's level filter
interface Saved { progress: Progress; streak: Streak }

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Saved> | null;
    const progress = raw?.progress && typeof raw.progress === "object" ? raw.progress : {};
    const s = raw?.streak;
    const streak: Streak = s && (s.last === null || typeof s.last === "string") && Number.isInteger(s.days) ? s : { last: null, days: 0 };
    return { progress, streak };
  } catch {
    return { progress: {}, streak: { last: null, days: 0 } };
  }
}
function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage blocked: progress lasts until the tab closes */ }
}
function loadLevel(): DailyLevel {
  try { return localStorage.getItem(LEVEL_KEY) === "sek1" ? "sek1" : "grundschule"; } catch { return "grundschule"; }
}

let saved = load();
let lang: Lang = getLang();
let level: DailyLevel = loadLevel();
const today = (): Day => dayOf(new Date());

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });

// ---------- the round ----------
const quiz = mountQuiz<MixedQuestion>({
  host: $("quiz"),
  colour: "c-mental",
  makeRound: () => chooseTopics(topicsFor(level), saved.progress, today(), Math.random).map((topic) => makeMixedQuestion(topic, level, Math.random)),
  prompt: (q, l) => q.prompt(l),
  choices: (q, l) => q.choices(l),
  answer: (q) => q.answer,
  steps: (q, l) => q.steps(l),
  words: (l) => ({ intro: UI[l].intro, go: UI[l].go, next: UI[l].next, again: UI[l].again, right: UI[l].right, wrong: UI[l].wrong, score: UI[l].score }),
  onPick: (q, ok) => {
    saved.progress = recordAnswer(saved.progress, q.topic, ok, today());
    save();
  },
  onFinish: () => {
    saved.streak = finishRound(saved.streak, today());
    save();
    renderStreak();
    renderTopics();
  },
});

// ---------- streak and progress ----------
function renderStreak(): void {
  const n = currentStreak(saved.streak, today());
  const doneToday = saved.streak.last === today();
  $("flame").classList.toggle("off", n === 0);
  $("streak-days").textContent = t().days(n);
  $("streak-note").textContent = doneToday ? t().doneToday : t().notYet(n);
}

function renderTopics(): void {
  $("topics").replaceChildren(...topicsFor(level).map((id) => {
    const info = TOPICS[id];
    const stats = saved.progress[id];
    const row = Object.assign(document.createElement("a"), { className: "topic-row", href: `../${info.href}` });
    const text = el("div");
    text.append(el("div", info[lang], "name"));
    if (stats) {
      const ago = daysBetween(stats.last, today());
      const when = ago === 0 ? t().today : ago === 1 ? t().yesterday : t().ago(ago);
      text.append(el("div", `${t().rightOf(stats.right, stats.seen)} · ${when}`, "meta"));
      const bar = el("div", "", "bar");
      const fill = el("i");
      fill.style.width = `${Math.round((100 * stats.right) / stats.seen)}%`;
      bar.append(fill);
      text.append(bar);
    } else text.append(el("div", t().never, "meta"));
    const share = stats ? stats.right / stats.seen : 0;
    const stars = !stats ? "" : share >= 0.9 && stats.seen >= 5 ? "⭐⭐⭐" : share >= 0.7 ? "⭐⭐" : share >= 0.4 ? "⭐" : "";
    row.append(el("span", info.emoji, "emoji"), text, el("p", stars, "stars"));
    return row;
  }));
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === level)));
  renderStreak();
  renderTopics();
  quiz.render(lang);
}

// ---------- wiring ----------
document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) =>
  b.addEventListener("click", () => {
    level = b.dataset.level === "sek1" ? "sek1" : "grundschule";
    try { localStorage.setItem(LEVEL_KEY, level); } catch { /* not remembered */ }
    quiz.reset();
    render();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
$("reset").addEventListener("click", () => { $("reset-confirm").hidden = false; $("reset").hidden = true; });
$("reset-no").addEventListener("click", () => { $("reset-confirm").hidden = true; $("reset").hidden = false; });
$("reset-yes").addEventListener("click", () => {
  saved = { progress: {}, streak: { last: null, days: 0 } };
  save();
  $("reset-confirm").hidden = true;
  $("reset").hidden = false;
  render();
});

render();
