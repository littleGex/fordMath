import { gcd, lcm } from "./number-theory";
import { randomInt, type Random } from "./random";

declare const valid: unique symbol;

/**
 * A fraction num/den that has been checked: whole numbers, denominator above 0, sign on top.
 * The `[valid]` brand means a plain `{ num: 1, den: 0 }` object won't type-check as a Fraction;
 * the only way to get one is through `fraction()`, so every Fraction in the program is a sensible one.
 */
export type Fraction = { readonly num: number; readonly den: number } & { readonly [valid]: true };

export function fraction(num: number, den: number): Fraction {
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den)) throw new Error("A fraction needs whole numbers");
  if (den === 0) throw new Error("The denominator can't be 0");
  const sign = den < 0 ? -1 : 1;
  return { num: sign * num + 0, den: sign * den } as Fraction;
}

export const toText = (f: Fraction): string => `${f.num}/${f.den}`;

/** Kürzen as far as possible: 6/8 → 3/4. */
export function simplify(f: Fraction): Fraction {
  if (f.num === 0) return fraction(0, 1);
  const g = gcd(Math.abs(f.num), f.den);
  return fraction(f.num / g, f.den / g);
}

export const isSimplified = (f: Fraction): boolean => f.num === 0 ? f.den === 1 : gcd(Math.abs(f.num), f.den) === 1;

/** Erweitern: 1/2 by 3 → 3/6. */
export function expand(f: Fraction, k: number): Fraction {
  if (!Number.isSafeInteger(k) || k < 1) throw new Error("Expand by a whole number of at least 1");
  return fraction(f.num * k, f.den * k);
}

/** Same amount, even if written differently: 1/2 and 2/4. */
export const equals = (a: Fraction, b: Fraction): boolean => a.num * b.den === b.num * a.den;

/** −1 if a is smaller, 0 if equal, 1 if bigger. */
export function compare(a: Fraction, b: Fraction): -1 | 0 | 1 {
  const d = a.num * b.den - b.num * a.den;
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

/** The smallest shared denominator (Hauptnenner): the kgV of the two denominators. */
export const commonDenominator = (a: Fraction, b: Fraction): number => lcm(a.den, b.den);

/** Writes f with denominator `den` (which must be a multiple of f.den). */
export function withDenominator(f: Fraction, den: number): Fraction {
  if (den % f.den !== 0) throw new Error(`${den} is not a multiple of ${f.den}`);
  return expand(f, den / f.den);
}

/** Adds over the common denominator, without simplifying: 1/2 + 1/4 = 3/4, 1/4 + 1/4 = 2/4. */
export function add(a: Fraction, b: Fraction): Fraction {
  const den = commonDenominator(a, b);
  return fraction(withDenominator(a, den).num + withDenominator(b, den).num, den);
}

export const toDecimal = (f: Fraction): number => f.num / f.den;

// ---------- the game's questions ----------

export type FractionLevel = 1 | 2 | 3 | 4 | 5 | 6;
export const LEVELS: readonly FractionLevel[] = [1, 2, 3, 4, 5, 6];

export type Choice = { kind: "fraction"; value: Fraction } | { kind: "equal" };

/** Every question has the same choices/answer shape, so the page can draw any of them the same way. */
export type FractionQuestion = (
  | { kind: "name-picture"; shown: Fraction; picture: "bar" | "pizza" } // L1: which fraction is coloured?
  | { kind: "equivalent"; given: Fraction; factor: number } // L2: which is the same amount?
  | { kind: "simplify"; given: Fraction } // L3: simplify as far as possible
  | { kind: "compare"; left: Fraction; right: Fraction } // L4: which is bigger?
  | { kind: "add-same"; left: Fraction; right: Fraction } // L5: same denominator
  | { kind: "add-different"; left: Fraction; right: Fraction } // L6: different denominators
) & { choices: Choice[]; answer: number };

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;

function shuffle<T>(xs: T[], random: Random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Four fraction choices: the right one plus wrong ones built from typical mistakes.
 * `wrong` decides whether a candidate counts as wrong (usually: a different amount).
 */
function fractionChoices(
  right: Fraction,
  mistakes: Array<[number, number]>,
  wrong: (f: Fraction) => boolean,
  random: Random,
): { choices: Choice[]; answer: number } {
  const picked: Fraction[] = [];
  const seen = new Set([toText(right)]);
  const tryAdd = ([n, d]: [number, number]) => {
    if (picked.length >= 3 || n <= 0 || d <= 0 || !Number.isInteger(n) || !Number.isInteger(d)) return;
    const f = fraction(n, d);
    if (seen.has(toText(f)) || !wrong(f)) return;
    seen.add(toText(f));
    picked.push(f);
  };
  mistakes.forEach(tryAdd);
  for (let guard = 0; picked.length < 3 && guard < 200; guard++) {
    tryAdd([randomInt(random, 1, right.den + 2), randomInt(random, 2, Math.max(4, right.den + 3))]);
  }
  const all = shuffle([right, ...picked], random);
  return {
    choices: all.map((value) => ({ kind: "fraction", value })),
    answer: all.findIndex((f) => toText(f) === toText(right)),
  };
}

const differentAmount = (right: Fraction) => (f: Fraction) => !equals(f, right);

function nameQuestion(random: Random): FractionQuestion {
  const den = pick([2, 3, 4, 5, 6, 8], random);
  const num = randomInt(random, 1, den - 1);
  const shown = fraction(num, den);
  const c = fractionChoices(
    shown,
    [[den - num, den], [num, den - num], [num + 1 < den ? num + 1 : num - 1, den], [num, den + 1]],
    differentAmount(shown),
    random,
  );
  return { kind: "name-picture", shown, picture: random() < 0.5 ? "bar" : "pizza", ...c };
}

function equivalentQuestion(random: Random): FractionQuestion {
  const den = randomInt(random, 2, 6);
  const given = simplify(fraction(randomInt(random, 1, den - 1), den));
  const factor = randomInt(random, 2, 4);
  const right = expand(given, factor);
  const c = fractionChoices(
    right,
    [[given.num + factor, given.den + factor], [given.num * factor, given.den], [given.num, given.den * factor], [right.num + 1, right.den]],
    differentAmount(right),
    random,
  );
  return { kind: "equivalent", given, factor, ...c };
}

function simplifyQuestion(random: Random): FractionQuestion {
  const den = randomInt(random, 2, 9);
  const right = simplify(fraction(randomInt(random, 1, den - 1), den));
  const k = pick([2, 3, 4, 5, 6], random);
  const given = expand(right, k);
  // Halfway simplified (6/8 → 3/4 is right, but 12/16 → 6/8 isn't finished) counts as wrong here.
  const half = k % 2 === 0 && k > 2 ? [given.num / 2, given.den / 2] : [given.num / k, given.den];
  const c = fractionChoices(
    right,
    [half as [number, number], [right.num, right.den + 1], [right.num + 1, right.den], [given.num - 1, given.den - 1]],
    (f) => !(equals(f, right) && isSimplified(f)),
    random,
  );
  return { kind: "simplify", given, ...c };
}

function compareQuestion(random: Random): FractionQuestion {
  const make = () => {
    const d = randomInt(random, 2, 10);
    return fraction(randomInt(random, 1, d - 1), d);
  };
  const left = make();
  // About one in five pairs are equal amounts written differently, like 2/4 and 1/2.
  // The two sides never look identical, otherwise "which is bigger?" is no question.
  let right = left;
  while (toText(right) === toText(left)) {
    right = random() < 0.2 ? expand(simplify(left), randomInt(random, 1, 3)) : make();
  }
  const choices: Choice[] = [{ kind: "fraction", value: left }, { kind: "equal" }, { kind: "fraction", value: right }];
  const c = compare(left, right);
  return { kind: "compare", left, right, choices, answer: c === 1 ? 0 : c === 0 ? 1 : 2 };
}

function addSameQuestion(random: Random): FractionQuestion {
  const den = randomInt(random, 3, 10);
  const a = randomInt(random, 1, den - 2);
  const b = randomInt(random, 1, den - a);
  const left = fraction(a, den);
  const right = fraction(b, den);
  const sum = add(left, right);
  const c = fractionChoices(
    sum,
    [[a + b, den + den], [a * b, den], [a + b + 1, den], [a + b - 1, den]],
    differentAmount(sum),
    random,
  );
  return { kind: "add-same", left, right, ...c };
}

const FRIENDLY_PAIRS: Array<[number, number]> = [[2, 4], [2, 6], [2, 8], [3, 6], [4, 8], [2, 3], [3, 4], [2, 5], [5, 10], [2, 10], [4, 12], [3, 12], [6, 12]];

function addDifferentQuestion(random: Random): FractionQuestion {
  for (;;) {
    const [d1, d2] = shuffle([...pick(FRIENDLY_PAIRS, random)], random) as [number, number];
    const left = fraction(randomInt(random, 1, d1 - 1), d1);
    const right = fraction(randomInt(random, 1, d2 - 1), d2);
    const sum = add(left, right);
    if (sum.num > sum.den) continue; // keep answers at most one whole
    const L = sum.den;
    const c = fractionChoices(
      sum,
      [[left.num + right.num, left.den + right.den], [left.num + right.num, L], [sum.num + 1, L], [sum.num - 1, L]],
      differentAmount(sum),
      random,
    );
    return { kind: "add-different", left, right, ...c };
  }
}

const MAKERS: Record<FractionLevel, (random: Random) => FractionQuestion> = {
  1: nameQuestion,
  2: equivalentQuestion,
  3: simplifyQuestion,
  4: compareQuestion,
  5: addSameQuestion,
  6: addDifferentQuestion,
};

export const makeQuestion = (level: FractionLevel, random: Random): FractionQuestion => MAKERS[level](random);

/** A round of questions, avoiding the same question twice in a row. */
export function makeFractionRound(level: FractionLevel, random: Random, size = 10): FractionQuestion[] {
  const round: FractionQuestion[] = [];
  const key = (q: FractionQuestion) => JSON.stringify(q.choices) + q.kind;
  while (round.length < size) {
    const q = makeQuestion(level, random);
    if (round.length && key(round[round.length - 1]!) === key(q)) continue;
    round.push(q);
  }
  return round;
}
