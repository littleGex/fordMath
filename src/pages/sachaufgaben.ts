import "./sw-register";
import "../styles/zone.css";
import "../styles/quiz.css";
import "../styles/game.css";
import "../styles/sachaufgaben.css";
import { compare, parseDecimal } from "../lib/decimal";
import { starsFor } from "../lib/times-tables";
import { checkNumbers, makeProblemRound, type ProblemLevel, type WordProblem } from "../lib/word-problems";
import { calcText, num, numberText, solution, storyFor } from "../explain/word-problems";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Sachaufgaben", subtitle: "Frage, Rechnung, Antwort", gs: "Grundschule", sek1: "Klasse 5",
    steps: ["Frage", "Zahlen", "Rechnung", "Antwort"],
    askQuestion: "1. Tippe auf den Satz mit der Frage.", askNumbers: "2. Tippe in der Geschichte die Zahlen an, die du brauchst.",
    askCalc: "3. Welche Rechnung passt?", askResult: "Rechne aus:", askAnswer: "4. Welcher Antwortsatz stimmt?",
    check: "Prüfen", solutionTitle: "So geht's", next: "Nächste Aufgabe", finish: "Fertig", again: "Neue Aufgaben",
    notQuestion: "Dieser Satz erzählt etwas, er fragt nichts. Die Frage endet mit einem Fragezeichen.",
    missing: (x: string) => `Es fehlt noch: ${x}.`, extra: (x: string) => `Nicht gebraucht: ${x}.`,
    shown: "Hier sind die richtigen Zahlen.", wrongCalc: "Diese Rechnung beantwortet nicht die Frage. Probier eine andere.",
    wrongResult: "Nicht ganz. Rechne noch einmal nach.", resultShown: (v: string) => `Das Ergebnis ist ${v}.`,
    wrongAnswer: "Schau auf die Zahl und auf die Einheit!", right: "Richtig! ⭐", numbersRight: "Genau diese Zahlen brauchst du! ⭐",
    score: (c: number, t: number) => `${c} von ${t} Schritten beim ersten Versuch richtig`,
    praise: ["Weiter üben!", "Gut gemacht!", "Toll!", "Super, alles beim ersten Mal!"], bad: "Bitte eine Zahl eingeben, z. B. 13 oder 2,45.",
  },
  en: {
    title: "Word problems", subtitle: "Question, calculation, answer", gs: "Primary", sek1: "Year 5",
    steps: ["Question", "Numbers", "Calculation", "Answer"],
    askQuestion: "1. Tap the sentence that asks the question.", askNumbers: "2. Tap the numbers in the story that you need.",
    askCalc: "3. Which calculation fits?", askResult: "Work it out:", askAnswer: "4. Which answer sentence is right?",
    check: "Check", solutionTitle: "How it works", next: "Next problem", finish: "Done", again: "New problems",
    notQuestion: "That sentence tells you something; it doesn't ask. The question ends with a question mark.",
    missing: (x: string) => `Still missing: ${x}.`, extra: (x: string) => `Not needed: ${x}.`,
    shown: "Here are the right numbers.", wrongCalc: "That calculation doesn't answer the question. Try another one.",
    wrongResult: "Not quite. Work it out again.", resultShown: (v: string) => `The result is ${v}.`,
    wrongAnswer: "Look at the number and at the unit!", right: "Right! ⭐", numbersRight: "Exactly the numbers you need! ⭐",
    score: (c: number, t: number) => `${c} of ${t} steps right first time`,
    praise: ["Keep practising!", "Well done!", "Great!", "Brilliant, all first time!"], bad: "Please type a number, e.g. 13 or 2.45.",
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

type Step = "question" | "numbers" | "calc" | "answer" | "solved";
const STEPS: Step[] = ["question", "numbers", "calc", "answer"];

interface Current {
  p: WordProblem;
  step: Step;
  tries: number; // wrong tries in this step
  firstTry: number; // steps right first time, this problem
  questionAt: "start" | "end"; // school texts put the question at the end, sometimes at the start
  calcOrder: string[];
  answerOrder: Array<"right" | "number" | "unit">;
  picked: Set<string>;
  numbersChecked: boolean;
  calcChosen: boolean;
  wrongPicks: Set<string>; // buttons already tried in this step
  message: { tone: "ok" | "no"; text: (lang: Lang) => string } | null;
}

let lang: Lang = getLang();
let level: ProblemLevel = "grundschule";
let round: WordProblem[] = [];
let index = 0;
let total = 0; // steps right first time, whole round
let cur: Current;
let finished = false;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const t = () => UI[lang];
const el = (tag: string, text = "", cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const shuffle = <T>(xs: T[]): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
};

function startProblem(p: WordProblem): void {
  cur = {
    p, step: "question", tries: 0, firstTry: 0,
    questionAt: Math.random() < 0.3 ? "start" : "end", calcOrder: shuffle([p.calc, ...p.wrongCalcs.slice(0, 3)]),
    answerOrder: shuffle<"right" | "number" | "unit">(["right", "number", "unit"]),
    picked: new Set(), numbersChecked: false, calcChosen: false, wrongPicks: new Set(), message: null,
  };
}

function startRound(): void {
  round = makeProblemRound(level, Math.random);
  index = 0;
  total = 0;
  finished = false;
  startProblem(round[0]!);
  render();
}

/** The step was solved: count it if it was the first try, move on. */
function advance(): void {
  if (cur.tries === 0) cur.firstTry++;
  const i = STEPS.indexOf(cur.step);
  cur.step = i + 1 < STEPS.length ? STEPS[i + 1]! : "solved";
  if (cur.step === "solved") total += cur.firstTry;
  cur.tries = 0;
  cur.wrongPicks = new Set();
}

// ---------- rendering ----------

function renderStory(): void {
  const story = storyFor(cur.p, lang);
  const finding = cur.step === "question";
  const tapping = cur.step === "numbers" && !cur.numbersChecked;
  const result = checkNumbers(cur.p, [...cur.picked]);
  const sentence = (segs: (typeof story.story)[number], key: string): HTMLElement => {
    const para = el(finding ? "button" : "p", "", finding ? "sentence" : "");
    if (finding) {
      (para as HTMLButtonElement).type = "button";
      if (cur.wrongPicks.has(key)) para.classList.add("wrong");
      para.addEventListener("click", () => pickSentence(key));
    }
    for (const seg of segs) {
      if (typeof seg === "string") {
        para.append(document.createTextNode(seg));
        continue;
      }
      const chip = el(tapping ? "button" : "span", numberText(cur.p, seg.key, lang), "num") as HTMLElement;
      if (tapping) {
        (chip as HTMLButtonElement).type = "button";
        chip.setAttribute("aria-pressed", String(cur.picked.has(seg.key)));
        chip.addEventListener("click", () => {
          if (cur.picked.has(seg.key)) cur.picked.delete(seg.key);
          else cur.picked.add(seg.key);
          cur.message = null;
          render();
        });
      } else if (!finding && cur.step !== "numbers") {
        if (cur.p.needed.includes(seg.key)) chip.classList.add("need");
      } else if (cur.step === "numbers" && result.extra.includes(seg.key)) chip.classList.add("extra");
      para.append(chip);
    }
    return para;
  };
  const paras = story.story.map((segs, i) => sentence(segs, `s${i}`));
  const question = sentence([story.questions[0]], "question");
  if (!finding) question.classList.add("q");
  if (cur.questionAt === "start") paras.unshift(question);
  else paras.push(question);
  $("story").replaceChildren(...paras);
}

/** Step 1: the child taps the sentence that asks the question. */
function pickSentence(key: string): void {
  if (key === "question") {
    cur.message = { tone: "ok", text: (l) => UI[l].right };
    advance();
  } else {
    cur.tries++;
    cur.wrongPicks.add(key);
    cur.message = { tone: "no", text: (l) => UI[l].notQuestion };
  }
  render();
}

function optionButton(label: string, mono: boolean, state: "right" | "wrong" | null, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const b = el("button", label, mono ? "mono" : "") as HTMLButtonElement;
  b.type = "button";
  if (state) b.classList.add(state);
  b.disabled = disabled;
  b.addEventListener("click", onClick);
  return b;
}

function renderTask(): void {
  const story = storyFor(cur.p, lang);
  const options = $("options");
  $("result-row").hidden = true;
  $("check").hidden = true;
  options.replaceChildren();
  switch (cur.step) {
    case "question":
      $("task-title").textContent = t().askQuestion;
      break;
    case "numbers":
      $("task-title").textContent = t().askNumbers;
      $("check").hidden = false;
      break;
    case "calc":
      $("task-title").textContent = cur.calcChosen ? t().askResult : t().askCalc;
      if (!cur.calcChosen) {
        options.append(...cur.calcOrder.map((c) => optionButton(calcText(c, lang), true, cur.wrongPicks.has(c) ? "wrong" : null, cur.wrongPicks.has(c), () => {
          if (c === cur.p.calc) {
            cur.calcChosen = true;
            cur.message = null;
          } else {
            cur.tries++;
            cur.wrongPicks.add(c);
            cur.message = { tone: "no", text: (l) => UI[l].wrongCalc };
          }
          render();
          if (cur.calcChosen) $("result").focus();
        })));
      } else {
        $("result-row").hidden = false;
        $("calc-shown").textContent = calcText(cur.p.calc, lang);
        $("unit").textContent = (story.units && Object.values(story.units)[0]?.trim()) || "";
        $("check").hidden = false;
      }
      break;
    case "answer": {
      $("task-title").textContent = t().askAnswer;
      const sentence = { right: story.answer(num(cur.p.answer, lang)), number: story.answer(num(cur.p.wrongAnswer, lang)), unit: story.wrongUnit(num(cur.p.answer, lang)) };
      options.append(...cur.answerOrder.map((k) => optionButton(sentence[k], false, cur.wrongPicks.has(k) ? "wrong" : null, cur.wrongPicks.has(k), () => {
        if (k === "right") {
          cur.message = { tone: "ok", text: (l) => UI[l].right };
          advance();
        } else {
          cur.tries++;
          cur.wrongPicks.add(k);
          cur.message = { tone: "no", text: (l) => UI[l].wrongAnswer };
        }
        render();
      })));
      break;
    }
    case "solved":
      break;
  }
  const msg = $("message");
  msg.hidden = cur.message === null;
  if (cur.message) {
    msg.className = `message ${cur.message.tone}`;
    msg.textContent = cur.message.text(lang);
  }
}

function check(): void {
  if (cur.step === "numbers") {
    const r = checkNumbers(cur.p, [...cur.picked]);
    if (r.ok) {
      cur.message = { tone: "ok", text: (l) => UI[l].numbersRight };
      advance();
    } else {
      cur.tries++;
      const label = (keys: string[], l: Lang) => keys.map((k) => `${numberText(cur.p, k, l)} (${storyFor(cur.p, l).labels[k]})`).join(", ");
      const { missing, extra } = r;
      if (cur.tries >= 2) {
        cur.picked = new Set(cur.p.needed);
        cur.message = { tone: "no", text: (l) => UI[l].shown };
        advance();
      } else {
        cur.message = { tone: "no", text: (l) => [missing.length ? UI[l].missing(label(missing, l)) : "", extra.length ? UI[l].extra(label(extra, l)) : ""].filter(Boolean).join(" ") };
      }
    }
  } else if (cur.step === "calc" && cur.calcChosen) {
    const typed = parseDecimal($<HTMLInputElement>("result").value);
    if (!typed) {
      cur.message = { tone: "no", text: (l) => UI[l].bad };
    } else if (compare(typed, cur.p.answer) === 0) {
      cur.message = { tone: "ok", text: (l) => UI[l].right };
      advance();
    } else {
      cur.tries++;
      if (cur.tries >= 3) {
        cur.message = { tone: "no", text: (l) => UI[l].resultShown(num(cur.p.answer, l)) };
        advance();
      } else cur.message = { tone: "no", text: (l) => UI[l].wrongResult };
    }
  }
  render();
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === level)));
  $("play").hidden = finished;
  $("done").hidden = !finished;
  if (finished) {
    const max = round.length * STEPS.length;
    const stars = starsFor(total, max);
    $("stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("praise").textContent = t().praise[stars]!;
    $("score").textContent = t().score(total, max);
    return;
  }
  $("progress").replaceChildren(...round.map((_, i) => {
    const dot = document.createElement("i");
    if (i < index) dot.className = "ok";
    else if (i === index) dot.className = "now";
    return dot;
  }));
  $("stepper").replaceChildren(...STEPS.map((_, i) => {
    const li = el("li", t().steps[i]!);
    const at = STEPS.indexOf(cur.step);
    if (cur.step === "solved" || i < at) li.className = "done";
    else if (i === at) li.className = "now";
    return li;
  }));
  renderStory();
  renderTask();
  $("task").hidden = cur.step === "solved";
  $("solution").hidden = cur.step !== "solved";
  if (cur.step === "solved") {
    $("solution-steps").replaceChildren(...solution(cur.p, lang).map((s) => el("li", s)));
    $("next-label").textContent = index + 1 >= round.length ? t().finish : t().next;
  }
}

// ---------- wiring ----------

$("check").addEventListener("click", check);
$("result").addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
$("next").addEventListener("click", () => {
  if (index + 1 >= round.length) {
    finished = true;
  } else {
    index++;
    startProblem(round[index]!);
  }
  render();
  window.scrollTo({ top: 0 });
});
$("again").addEventListener("click", startRound);
document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) =>
  b.addEventListener("click", () => {
    level = b.dataset.level === "sek1" ? "sek1" : "grundschule";
    startRound();
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);

startRound();
