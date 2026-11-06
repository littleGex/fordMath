import { randomInt, type Random } from "./random";

/**
 * Kopfrechnen up to 1 000, class 3. Five kinds of question, getting harder:
 *   1 tens and hundreds        340 + 50, 700 − 300
 *   2 bridging a ten           47 + 8, 63 − 7
 *   3 two-digit numbers        46 + 37, 82 − 45
 *   4 bridging a hundred       380 + 45, 512 − 36
 *   5 missing numbers          460 + ? = 500, ? − 25 = 75
 */
export type MentalLevel = 1 | 2 | 3 | 4 | 5;
export const MENTAL_LEVELS: readonly MentalLevel[] = [1, 2, 3, 4, 5];

export type Op = "+" | "-";
/** Which of the three numbers in a ○ b = c is hidden. */
export type Missing = "a" | "b" | "c";

export interface MentalQuestion {
  level: MentalLevel;
  op: Op;
  a: number;
  b: number;
  c: number; // a op b = c
  missing: Missing;
}

export const MAX = 1000;

export const answerOf = (q: MentalQuestion): number => q[q.missing];
export const keyOf = (q: MentalQuestion): string => `${q.a}${q.op}${q.b}=${q.c}:${q.missing}`;

const make = (level: MentalLevel, op: Op, a: number, b: number, missing: Missing = "c"): MentalQuestion => ({
  level, op, a, b, c: op === "+" ? a + b : a - b, missing,
});

const coin = (random: Random) => random() < 0.5;

// ---------- one generator per level ----------

function tensAndHundreds(random: Random): MentalQuestion {
  if (coin(random)) {
    // hundreds: 300 + 400, 900 − 600
    const a = randomInt(random, 1, 9) * 100;
    const b = coin(random) ? randomInt(random, 1, (MAX - a) / 100) * 100 : randomInt(random, 1, a / 100) * 100;
    if (a + b <= MAX && coin(random)) return make(1, "+", a, b);
    return b < a ? make(1, "-", a, b) : tensAndHundreds(random);
  }
  // tens without crossing a hundred: 340 + 50, 780 − 30
  for (;;) {
    const a = randomInt(random, 1, 99) * 10;
    const b = randomInt(random, 1, 9) * 10;
    if (coin(random)) {
      if ((a % 100) + b < 100) return make(1, "+", a, b);
    } else if (a % 100 >= b && a > b) return make(1, "-", a, b);
  }
}

function bridgeTen(random: Random): MentalQuestion {
  for (;;) {
    const hundreds = coin(random) ? 0 : randomInt(random, 1, 9) * 100; // 47 + 8 or 247 + 8
    const a = hundreds + randomInt(random, 11, 98);
    const b = randomInt(random, 2, 9);
    if (a % 10 === 0) continue;
    if (coin(random)) {
      if (a % 10 + b > 10 && (a % 100) + b < 100) return make(2, "+", a, b);
    } else if (a % 10 < b && a - b >= 10) return make(2, "-", a, b);
  }
}

function twoDigit(random: Random): MentalQuestion {
  for (;;) {
    const a = randomInt(random, 12, 98);
    const b = randomInt(random, 12, 89);
    if (a % 10 === 0 || b % 10 === 0) continue;
    if (coin(random)) {
      if (a + b <= 100) return make(3, "+", a, b);
    } else if (a - b >= 5) return make(3, "-", a, b);
  }
}

function bridgeHundred(random: Random): MentalQuestion {
  for (;;) {
    const a = randomInt(random, 101, 989);
    const b = randomInt(random, 12, 89);
    if (coin(random)) {
      if ((a % 100) + b > 100 && a + b <= MAX && a % 10 + b % 10 <= 10) return make(4, "+", a, b);
    } else if (a % 100 < b && a % 100 !== 0 && a - b >= 100 && a % 10 >= b % 10) return make(4, "-", a, b);
  }
}

function missingNumber(random: Random): MentalQuestion {
  switch (randomInt(random, 0, 2)) {
    case 0: {
      // Ergänzen to the next hundred (or the next ten): 460 + ? = 500, 347 + ? = 400, 83 + ? = 90
      const toTen = random() < 0.25;
      const a = toTen ? randomInt(random, 11, 989) : randomInt(random, 1, 98) * (coin(random) ? 10 : 1) + randomInt(random, 0, 9) * 100;
      const step = toTen ? 10 : 100;
      if (a % step === 0 || a <= 0 || a >= MAX) return missingNumber(random);
      const target = Math.ceil(a / step) * step;
      return make(5, "+", a, target - a, "b");
    }
    case 1: {
      // ? − 25 = 75: think of 75 + 25
      const q = coin(random) ? twoDigit(random) : tensAndHundreds(random);
      return q.op === "-" ? { ...q, level: 5, missing: "a" } : make(5, "-", q.c, q.b, "a");
    }
    default: {
      // 100 − ? = 75
      const q = coin(random) ? twoDigit(random) : bridgeTen(random);
      return q.op === "-" ? { ...q, level: 5, missing: "b" } : make(5, "-", q.c, q.b, "b");
    }
  }
}

const MAKERS: Record<MentalLevel, (random: Random) => MentalQuestion> = {
  1: tensAndHundreds, 2: bridgeTen, 3: twoDigit, 4: bridgeHundred, 5: missingNumber,
};

export const makeQuestion = (level: MentalLevel, random: Random): MentalQuestion => MAKERS[level](random);

// ---------- the school strategies, as jumps on the number line ----------

/**
 * How to work it out, as a start number and jumps: 47 + 8 → start 47, jumps +3, +5.
 * - "tens":       340 + 50 → think 34 + 5 tens; one jump
 * - "toTen":      47 + 8 → 47 + 3 + 5 (to the next ten first)
 * - "stepwise":   46 + 37 → 46 + 30 + 7 (tens, then ones)
 * - "toHundred":  380 + 45 → 380 + 20 + 25 (to the next hundred first)
 * - "fill":       460 + ? = 500 → jump from 460 up to 500 (Ergänzen)
 * - "reverse":    ? − 25 = 75 → the Umkehraufgabe 75 + 25, done with the jumps of its own kind
 */
export type Plan = {
  kind: "tens" | "toTen" | "stepwise" | "toHundred" | "fill" | "reverse";
  start: number;
  jumps: number[]; // signed: −3 is a jump to the left
};

/** Splits b to reach a round number first: (47, 8, ten) → [3, 5]. */
function splitAt(a: number, b: number, op: Op, unit: 10 | 100): number[] {
  const first = op === "+" ? unit - (a % unit) : a % unit;
  return first > 0 && first < b ? [first, b - first] : [b];
}

/** The plan for working out a op b (the result is the unknown). */
function planFor(level: MentalLevel, op: Op, a: number, b: number): Plan {
  const sign = op === "+" ? 1 : -1;
  const signed = (parts: number[]) => parts.map((p) => sign * p);
  const crossesTen = op === "+" ? (a % 10) + (b % 10) > 10 || ((a % 10) + b > 10 && b < 10) : a % 10 < b % 10;
  const crossesHundred = b < 100 && (op === "+" ? (a % 100) + b > 100 : a % 100 < b);
  // To the next hundred first when a is a whole ten (380 + 45) or nearly there (195 + 65, 512 − 36);
  // otherwise tens then ones (443 + 72 = 443 + 70 + 2).
  const nearHundred = a % 10 === 0 || (op === "+" ? 100 - (a % 100) : a % 100) < 20;
  if (b % 10 === 0 && (b < 100 || b % 100 === 0) && !crossesHundred) return { kind: "tens", start: a, jumps: [sign * b] };
  if (b < 10) return { kind: crossesTen ? "toTen" : "stepwise", start: a, jumps: signed(crossesTen ? splitAt(a, b, op, 10) : [b]) };
  if (crossesHundred && nearHundred && level !== 3) return { kind: "toHundred", start: a, jumps: signed(splitAt(a, b, op, 100)) };
  const tens = b - (b % 10);
  return { kind: "stepwise", start: a, jumps: signed(b % 10 ? [tens, b % 10] : [tens]) };
}

export function planOf(q: MentalQuestion): Plan {
  if (q.missing === "c") return planFor(q.level, q.op, q.a, q.b);
  if (q.op === "+" && q.missing === "b") {
    // Ergänzen: from a up to c, to the next ten first when that helps.
    return { kind: "fill", start: q.a, jumps: splitAt(q.a, q.b, "+", q.c % 100 === 0 && q.a % 10 !== 0 ? 10 : 100) };
  }
  if (q.op === "+" && q.missing === "a") return { ...planFor(q.level, "-", q.c, q.b), kind: "reverse" }; // ? + 7 = 50 → 50 − 7
  if (q.op === "-" && q.missing === "a") return { ...planFor(q.level, "+", q.c, q.b), kind: "reverse" }; // ? − 25 = 75 → 75 + 25
  // a − ? = c: how far from c up to a (Ergänzen)
  return { kind: "fill", start: q.c, jumps: splitAt(q.c, q.b, "+", 10) };
}

// ---------- rounds, and missed questions coming back ----------

/** A question the child got wrong, and how many times it's been right since. */
export interface Retry {
  q: MentalQuestion;
  box: number;
}

/** Right twice in a row and it's learnt. */
export const LEARNT = 2;

/**
 * Ten questions of one level, or of all levels mixed. Up to three missed questions of that
 * level come back first (Leitner boxes), then new ones; no question appears twice.
 */
export function makeRound(level: MentalLevel | "mixed", random: Random, retries: readonly Retry[] = [], size = 10): MentalQuestion[] {
  const fits = (q: MentalQuestion) => level === "mixed" || q.level === level;
  const round: MentalQuestion[] = retries.filter((r) => fits(r.q)).sort((x, y) => x.box - y.box).slice(0, 3).map((r) => r.q);
  const seen = new Set(round.map(keyOf));
  while (round.length < size) {
    const lv = level === "mixed" ? MENTAL_LEVELS[randomInt(random, 0, 4)]! : level;
    const q = makeQuestion(lv, random);
    if (seen.has(keyOf(q))) continue;
    seen.add(keyOf(q));
    round.push(q);
  }
  // Shuffle, so the returning questions aren't always first.
  for (let i = round.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [round[i], round[j]] = [round[j]!, round[i]!];
  }
  return round;
}

/** A new list: wrong puts the question in box 0; right moves it up, and out once learnt. */
export function recordAnswer(retries: readonly Retry[], q: MentalQuestion, correct: boolean): Retry[] {
  const key = keyOf(q);
  const rest = retries.filter((r) => keyOf(r.q) !== key);
  const old = retries.find((r) => keyOf(r.q) === key);
  if (!correct) return [...rest, { q, box: 0 }].slice(-30);
  if (!old) return rest;
  return old.box + 1 >= LEARNT ? rest : [...rest, { q, box: old.box + 1 }];
}
