import { makeAreaQuestion } from "../lib/area";
import { makeCuboidQuestion } from "../lib/cuboid";
import { makeDecimalQuestion } from "../lib/decimal";
import { evaluate, makeOrderTask, toTokens, workedLines, type OrderLevel } from "../lib/expression";
import { makeQuestion as makeFractionQuestion, toText, type FractionLevel } from "../lib/fraction";
import { makeIntQuestion } from "../lib/integers";
import { answerOf as mentalAnswer, makeQuestion as makeMentalQuestion, type MentalLevel } from "../lib/mental";
import { makePlaceQuestion, type PlaceLevel } from "../lib/place-value";
import { randomInt, type Random } from "../lib/random";
import { TABLES, answerOf as tableAnswer, questionsFor } from "../lib/times-tables";
import { makeUnitsQuestion } from "../lib/units-quiz";
import { makePercentQuestion } from "../lib/percent";
import { makeProportionQuestion } from "../lib/proportion";
import { apply, makeTask, solveAll } from "../lib/linear-equation";
import * as area from "../explain/area";
import * as cuboid from "../explain/cuboid";
import * as decimal from "../explain/decimal";
import { explainFraction, prompt as fractionPrompt } from "../explain/fraction";
import * as integers from "../explain/integers";
import { explainMental, questionText as mentalText } from "../explain/mental";
import * as place from "../explain/place-value";
import { explainQuestion as explainTable } from "../explain/times-tables";
import * as units from "../explain/units";
import * as percent from "../explain/percent";
import * as proportion from "../explain/proportion";
import * as linEq from "../explain/linear-equation";
import type { Lang } from "../explain/lang";

/**
 * "Heute üben" mixes questions from many topics. Each topic gets a small adapter that turns its
 * own question into this one shape, using the topic's existing generator and explanation.
 */
export interface MixedQuestion {
  topic: TopicId;
  prompt: (lang: Lang) => string;
  choices: (lang: Lang) => string[];
  answer: number;
  steps: (lang: Lang) => string[];
}

export type DailyLevel = "grundschule" | "sek1";

export const TOPICS = {
  einmaleins: { de: "Einmaleins", en: "Times tables", emoji: "✖️", href: "einmaleins/", levels: ["grundschule"] },
  kopfrechnen: { de: "Kopfrechnen", en: "Mental maths", emoji: "🧠", href: "kopfrechnen/", levels: ["grundschule"] },
  groessen: { de: "Größen", en: "Measures", emoji: "📏", href: "groessen/", levels: ["grundschule", "sek1"] },
  stellenwerte: { de: "Stellenwerte", en: "Place value", emoji: "🔟", href: "stellenwerte/", levels: ["grundschule", "sek1"] },
  brueche: { de: "Brüche", en: "Fractions", emoji: "🍕", href: "brueche/", levels: ["grundschule", "sek1"] },
  umfang: { de: "Umfang und Fläche", en: "Perimeter and area", emoji: "📐", href: "umfang-flaeche/", levels: ["grundschule", "sek1"] },
  punkt: { de: "Punkt vor Strich", en: "Order of operations", emoji: "🧩", href: "punkt-vor-strich/", levels: ["sek1"] },
  dezimal: { de: "Dezimalzahlen", en: "Decimals", emoji: "🔸", href: "dezimalzahlen/", levels: ["sek1"] },
  negativ: { de: "Negative Zahlen", en: "Negative numbers", emoji: "🌡️", href: "negative-zahlen/", levels: ["sek1"] },
  quader: { de: "Quader", en: "Cuboids", emoji: "🧊", href: "quader/", levels: ["sek1"] },
  prozent: { de: "Prozente", en: "Percentages", emoji: "💯", href: "prozent/", levels: ["sek1"] },
  dreisatz: { de: "Dreisatz", en: "Rule of three", emoji: "🛒", href: "dreisatz/", levels: ["sek1"] },
  gleichungen: { de: "Gleichungen", en: "Equations", emoji: "🟰", href: "gleichungen/", levels: ["sek1"] },
} as const satisfies Record<string, { de: string; en: string; emoji: string; href: string; levels: readonly DailyLevel[] }>;
export type TopicId = keyof typeof TOPICS;

export const topicsFor = (level: DailyLevel): TopicId[] =>
  (Object.keys(TOPICS) as TopicId[]).filter((id) => (TOPICS[id].levels as readonly DailyLevel[]).includes(level));

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;

/** Whole-number choices that may be negative: the right one plus three distinct wrong ones, shuffled. */
function signedChoices(right: number, wrongs: number[], random: Random): { choices: string[]; answer: number } {
  const picked = [...new Set(wrongs.filter((w) => w !== right && Number.isInteger(w)))].slice(0, 3);
  for (let k = 1; picked.length < 3; k++) for (const w of [right + k, right - k]) if (!picked.includes(w) && w !== right && picked.length < 3) picked.push(w);
  const all = [right, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  const show = (n: number) => (n < 0 ? `−${-n}` : String(n));
  return { choices: all.map((n) => `x = ${show(n)}`), answer: all.indexOf(right) };
}

/** Number choices: the right one plus distinct wrong ones (0 or more), shuffled. */
function numberChoices(right: number, wrongs: number[], random: Random, show: (n: number) => string = String): { choices: string[]; answer: number } {
  const picked = [...new Set(wrongs.filter((w) => w !== right && w >= 0 && Number.isInteger(w)))].slice(0, 3);
  for (let k = 1; picked.length < 3; k++) for (const w of [right + k, right - k]) if (w >= 0 && !picked.includes(w) && picked.length < 3) picked.push(w);
  const all = [right, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return { choices: all.map(show), answer: all.indexOf(right) };
}

/** Try a generator until it gives a question that works without a picture. */
function until<Q>(make: () => Q, ok: (q: Q) => boolean): Q {
  for (;;) {
    const q = make();
    if (ok(q)) return q;
  }
}

/** Left to right, ignoring Punkt vor Strich (and brackets): the classic mistake. */
function leftToRight(tokens: ReturnType<typeof toTokens>): number {
  const parts = tokens.filter((t) => t.kind !== "paren");
  let value = Number(parts[0]!.text);
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const b = Number(parts[i + 1]!.text);
    const op = parts[i]!.text;
    value = op === "+" ? value + b : op === "−" ? value - b : op === "·" ? value * b : value / b;
  }
  return value;
}

const ADAPTERS: Record<TopicId, (level: DailyLevel, random: Random) => MixedQuestion> = {
  einmaleins(_level, r) {
    const q = pick(questionsFor([...TABLES], "mixed"), r);
    const right = tableAnswer(q);
    const text = q.kind === "multiply" ? `${q.a} · ${q.b} = ?` : `${q.product} : ${q.divisor} = ?`;
    const wrongs = q.kind === "multiply" ? [right + q.b, right - q.b, right + q.a, right + 10] : [right + 1, right - 1, right + 2];
    const c = numberChoices(right, wrongs, r);
    return { topic: "einmaleins", prompt: () => text, choices: () => c.choices, answer: c.answer, steps: (l) => explainTable(q, l).flatMap((s) => s.steps) };
  },
  kopfrechnen(_level, r) {
    const q = makeMentalQuestion((randomInt(r, 1, 5)) as MentalLevel, r);
    const right = mentalAnswer(q);
    const c = numberChoices(right, [right + 10, right - 10, right + 1, right - 1, right + 100], r);
    return { topic: "kopfrechnen", prompt: () => mentalText(q), choices: () => c.choices, answer: c.answer, steps: (l) => explainMental(q, l) };
  },
  groessen(level, r) {
    const q = makeUnitsQuestion(level, r);
    return { topic: "groessen", prompt: (l) => units.questionText(q, l), choices: (l) => q.choices.map((c) => units.choiceText(q, c, l)), answer: q.answer, steps: (l) => units.questionSteps(q, l) };
  },
  stellenwerte(level, r) {
    const size: PlaceLevel = level === "grundschule" ? 1_000 : 1_000_000;
    const q = until(() => makePlaceQuestion(size, r), (x) => x.kind !== "number-line");
    return { topic: "stellenwerte", prompt: (l) => place.questionText(q, l), choices: (l) => q.choices.map((c) => place.show(c, l)), answer: q.answer, steps: (l) => place.questionSteps(q, l) };
  },
  brueche(level, r) {
    const lv: FractionLevel = pick(level === "grundschule" ? [2, 3, 4] as const : [3, 4, 5, 6] as const, r);
    const q = makeFractionQuestion(lv, r);
    const prompt = (l: Lang) => (q.kind === "add-same" || q.kind === "add-different" ? `${toText(q.left)} + ${toText(q.right)} = ?` : q.kind === "compare" ? `${fractionPrompt(q, l)} ${toText(q.left)} ${l === "de" ? "oder" : "or"} ${toText(q.right)}` : fractionPrompt(q, l));
    return {
      topic: "brueche", prompt,
      choices: (l) => q.choices.map((c) => (c.kind === "equal" ? (l === "de" ? "gleich groß" : "the same") : toText(c.value))),
      answer: q.answer, steps: (l) => explainFraction(q, l).flatMap((s) => s.steps),
    };
  },
  umfang(level, r) {
    const kinds = level === "grundschule" ? ["rectArea", "rectPerimeter", "missingSide"] : ["rectArea", "rectPerimeter", "missingSide", "convert"];
    const q = until(() => makeAreaQuestion(r), (x) => kinds.includes(x.kind));
    return { topic: "umfang", prompt: (l) => area.quizPrompt(q, l), choices: (l) => q.choices.map((c) => area.choiceText(q, c, l)), answer: q.answer, steps: (l) => area.quizSteps(q, l) };
  },
  punkt(_level, r) {
    const e = makeOrderTask(randomInt(r, 1, 4) as OrderLevel, r);
    const right = evaluate(e, 0);
    const lines = workedLines(e);
    const naive = leftToRight(toTokens(e));
    const c = numberChoices(right, [naive, right + 1, right - 1, right + 10], r);
    return { topic: "punkt", prompt: () => `${lines[0]} = ?`, choices: () => c.choices, answer: c.answer, steps: () => [lines.join(" = ")] };
  },
  dezimal(_level, r) {
    const q = makeDecimalQuestion(r);
    return { topic: "dezimal", prompt: (l) => decimal.quizPrompt(q, l), choices: (l) => q.choices.map((c) => decimal.choiceLabel(c, l)), answer: q.answer, steps: (l) => decimal.quizSteps(q, l) };
  },
  negativ(_level, r) {
    const q = makeIntQuestion(r);
    return { topic: "negativ", prompt: (l) => integers.quizPrompt(q, l), choices: () => q.choices.map((c) => integers.choiceText(q, c)), answer: q.answer, steps: (l) => integers.quizSteps(q, l) };
  },
  quader(_level, r) {
    const q = until(() => makeCuboidQuestion(r), (x) => x.kind === "volume" || x.kind === "surface" || x.kind === "convert");
    return { topic: "quader", prompt: (l) => cuboid.quizPrompt(q, l), choices: (l) => q.choices.map((c) => cuboid.choiceText(q, c, l)), answer: q.answer, steps: (l) => cuboid.quizSteps(q, l) };
  },
  prozent(_level, r) {
    const q = makePercentQuestion(r);
    return { topic: "prozent", prompt: (l) => percent.quizPrompt(q, l), choices: (l) => q.choices.map((c) => `${percent.choiceText(c, l)}${percent.quizUnit(q)}`), answer: q.answer, steps: (l) => percent.quizSteps(q, l) };
  },
  gleichungen(_level, r) {
    const e = makeTask(randomInt(r, 2, 4) as 2 | 3 | 4, r);
    const s = solveAll(e);
    const x = s.result.kind === "value" ? s.result.x.n : 0; // levels 2 to 4 always give a whole number
    // Typical slips, after the brackets are gone and it reads A·x + lc = rx·x + rc:
    // stopping before dividing (A·x), the wrong sign when dividing by a negative (−x),
    // and moving the number over with the wrong sign ((rc + lc) : A).
    const flat = e.left.k.n || e.right.k.n ? apply(e, { kind: "expand" }) : e;
    const val = (q: { n: number; d: number }) => q.n / q.d;
    const A = val(flat.left.x) - val(flat.right.x);
    const wrongSign = (val(flat.right.c) + val(flat.left.c)) / A;
    const wrongs = [A * x, -x, wrongSign].filter((v) => Number.isInteger(v));
    const c = signedChoices(x, wrongs, r);
    return { topic: "gleichungen", prompt: (l) => `${l === "de" ? "Löse" : "Solve"}: ${linEq.equationText(e)}`, choices: () => c.choices, answer: c.answer, steps: (l) => linEq.workedSteps(e, l) };
  },
  dreisatz(_level, r) {
    // Only the stories: the table questions need the table drawn.
    const q = makeProportionQuestion(r, "story");
    return { topic: "dreisatz", prompt: (l) => proportion.quizPrompt(q, l), choices: (l) => q.choices.map((c) => proportion.quizChoice(q, c, l)), answer: q.answer, steps: (l) => proportion.quizSteps(q, l) };
  },
};

export const makeMixedQuestion = (topic: TopicId, level: DailyLevel, random: Random): MixedQuestion => ADAPTERS[topic](level, random);
