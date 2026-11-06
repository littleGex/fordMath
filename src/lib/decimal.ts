import { writtenAdd, type AddStep } from "./written";
import { randomInt, type Random } from "./random";

/**
 * A decimal number kept exact: `n` whole units of 10^−places. 3,25 is { n: 325, places: 2 }.
 * Like the amounts in units.ts, it's never a float, so 0,1 + 0,2 is exactly 0,3.
 * Trailing zeros are kept as written (0,50 has places 2), because "0,5 = 0,50" is part of the lesson.
 */
export interface Decimal {
  readonly n: number;
  readonly places: number;
}

export const MAX_PLACES = 3; // Zehntel, Hundertstel, Tausendstel
export const MAX_WHOLE = 999_999;

export function dec(n: number, places = 0): Decimal {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("A decimal here is a whole number of tenths, hundredths, …, 0 or more");
  if (!Number.isInteger(places) || places < 0 || places > MAX_PLACES) throw new Error(`At most ${MAX_PLACES} places after the comma`);
  return { n, places };
}

/** "3,25", "3.25", "0,5", ",5", "12" → Decimal; anything else (or negative, or too long) → null. */
export function parseDecimal(text: string): Decimal | null {
  const m = /^(\d*)(?:[.,](\d*))?$/.exec(text.trim().replace(/\s/g, ""));
  if (!m || (m[1] === "" && !m[2])) return null;
  const whole = m[1] || "0";
  const frac = m[2] ?? "";
  if (frac.length > MAX_PLACES || Number(whole) > MAX_WHOLE) return null;
  return dec(Number(whole + frac), frac.length);
}

/** The same number with more places: 0,5 → 0,50. */
export function widen(d: Decimal, places: number): Decimal {
  if (places < d.places) throw new Error("Can only add zeros, not take digits away");
  return dec(d.n * 10 ** (places - d.places), places);
}

/** Drops zeros at the end: 0,50 → 0,5; 3,000 → 3. */
export function trim(d: Decimal): Decimal {
  let { n, places } = d;
  while (places > 0 && n % 10 === 0) {
    n /= 10;
    places--;
  }
  return dec(n, places);
}

export const wholePart = (d: Decimal): number => Math.floor(d.n / 10 ** d.places);
export const toNumber = (d: Decimal): number => d.n / 10 ** d.places;

/** Written out: "3,25" (de) or "3.25" (en), keeping the places it has. */
export function formatDecimal(d: Decimal, lang: "de" | "en" = "de"): string {
  const whole = wholePart(d).toLocaleString(lang === "de" ? "de-DE" : "en-GB");
  if (d.places === 0) return whole;
  const frac = String(d.n % 10 ** d.places).padStart(d.places, "0");
  return `${whole}${lang === "de" ? "," : "."}${frac}`;
}

/** −1, 0 or 1, comparing after filling both with zeros to the same length. */
export function compare(a: Decimal, b: Decimal): -1 | 0 | 1 {
  const p = Math.max(a.places, b.places);
  const [x, y] = [widen(a, p).n, widen(b, p).n];
  return x < y ? -1 : x > y ? 1 : 0;
}

export function add(a: Decimal, b: Decimal): Decimal {
  const p = Math.max(a.places, b.places);
  return dec(widen(a, p).n + widen(b, p).n, p);
}

export function subtract(a: Decimal, b: Decimal): Decimal {
  const p = Math.max(a.places, b.places);
  const r = widen(a, p).n - widen(b, p).n;
  if (r < 0) throw new Error("The second number is bigger: that needs negative numbers");
  return dec(r, p);
}

/**
 * The digits by place: index 0 is the Einer, 1 the Zehner, …; −1 the Zehntel, −2 the Hundertstel, −3 the Tausendstel.
 * Returned as [place, digit] pairs from the biggest place down to the last written one.
 */
export function placeDigits(d: Decimal): Array<[place: number, digit: number]> {
  const whole = String(wholePart(d));
  const frac = d.places ? String(d.n % 10 ** d.places).padStart(d.places, "0") : "";
  return [
    ...[...whole].map((ch, i): [number, number] => [whole.length - 1 - i, Number(ch)]),
    ...[...frac].map((ch, i): [number, number] => [-(i + 1), Number(ch)]),
  ];
}

export interface DecimalRounding {
  d: Decimal;
  places: number; // round to this many places
  decider: number; // the digit just after
  up: boolean;
  lower: Decimal;
  upper: Decimal;
  result: Decimal;
}

/** Round to tenths (1), hundredths (2) or whole numbers (0): the next digit decides, 5 or more rounds up. */
export function roundDecimal(d: Decimal, places: number): DecimalRounding {
  if (!Number.isInteger(places) || places < 0 || places >= d.places) throw new Error("Round to fewer places than the number has");
  const step = 10 ** (d.places - places);
  const lowerN = Math.floor(d.n / step);
  const decider = Math.floor((d.n % step) / (step / 10));
  const up = decider >= 5;
  const lower = dec(lowerN, places);
  const upper = dec(lowerN + 1, places);
  return { d, places, decider, up, lower, upper, result: up ? upper : lower };
}

/** A fraction as a decimal, when the denominator divides 1 000: 3/4 → 0,75; 37/100 → 0,37. Otherwise null (1/3). */
export function fromFraction(num: number, den: number): Decimal | null {
  if (!Number.isInteger(num) || !Number.isInteger(den) || num < 0 || den < 1) return null;
  for (let places = 0; places <= MAX_PLACES; places++) {
    const scale = 10 ** places;
    if ((num * scale) % den === 0) return dec((num * scale) / den, places);
  }
  return null;
}

/** Written addition with the commas under each other: fill with zeros, add as whole numbers, put the comma back. */
export function writtenDecimalAdd(a: Decimal, b: Decimal): { places: number; rows: [Decimal, Decimal]; steps: AddStep[]; result: Decimal } {
  const p = Math.max(a.places, b.places);
  const [x, y] = [widen(a, p), widen(b, p)];
  const sum = writtenAdd([x.n, y.n]);
  return { places: p, rows: [x, y], steps: sum.steps, result: dec(sum.result, p) };
}

// ---------- quiz ----------

export type DecimalQuestion = (
  | { kind: "compare"; a: Decimal; b: Decimal } // which is bigger? choices: a, b, equal
  | { kind: "smallest"; options: Decimal[] } // which is the smallest?
  | { kind: "digit"; d: Decimal; place: number } // which digit is in the hundredths place?
  | { kind: "round"; d: Decimal; places: number }
  | { kind: "fraction"; num: number; den: number }
  | { kind: "add" | "subtract"; a: Decimal; b: Decimal }
) & { choices: string[]; answer: number }; // choices are written in German; the page rewrites them for English

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;
const shuffle = <T>(xs: T[], random: Random): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
};
const fmt = (d: Decimal) => formatDecimal(d, "de");

/** Right answer plus wrong ones (deduplicated by value), shuffled. Exactly one choice is right. */
function choicesOf(right: Decimal, wrongs: Decimal[], random: Random): { choices: string[]; answer: number } {
  const picked: Decimal[] = [];
  for (const w of wrongs) if (compare(w, right) !== 0 && !picked.some((p) => compare(p, w) === 0)) picked.push(w);
  for (let k = 1; picked.length < 3; k++) {
    const w = dec(right.n + k, right.places);
    if (!picked.some((p) => compare(p, w) === 0)) picked.push(w);
  }
  const all = shuffle([right, ...picked.slice(0, 3)], random);
  return { choices: all.map(fmt), answer: all.indexOf(right) };
}

/** A decimal with `places` places whose last digit isn't 0, so 0,30 doesn't sneak in. */
function randomDecimal(random: Random, places: number, maxWhole = 9): Decimal {
  for (;;) {
    const d = dec(randomInt(random, 0, maxWhole) * 10 ** places + randomInt(random, 0, 10 ** places - 1), places);
    if (places === 0 || d.n % 10 !== 0) return d;
  }
}

export function makeDecimalQuestion(random: Random): DecimalQuestion {
  const kind = pick(["compare", "smallest", "digit", "round", "fraction", "add", "subtract"] as const, random);
  switch (kind) {
    case "compare": {
      // The classic trap: more digits isn't bigger. 0,5 vs 0,45; 2,3 vs 2,25; sometimes equal (0,5 and 0,50).
      const whole = randomInt(random, 0, 9);
      const t = randomInt(random, 1, 8);
      const a = dec(whole * 10 + t + (random() < 0.5 ? 1 : 0), 1);
      const b = random() < 0.15 ? widen(a, 2) : dec(whole * 100 + t * 10 + randomInt(random, 1, 9), 2);
      const [l, r] = random() < 0.5 ? [a, b] : [b, a];
      const c = compare(l, r);
      return { kind, a: l, b: r, choices: [fmt(l), fmt(r), "="], answer: c > 0 ? 0 : c < 0 ? 1 : 2 };
    }
    case "smallest": {
      const whole = randomInt(random, 0, 5);
      const base = [dec(whole * 10 + 3, 1), dec(whole * 100 + 25, 2), dec(whole * 1000 + 305, 3), dec(whole * 100 + 35, 2)];
      const t = randomInt(random, 1, 7);
      const options = shuffle(base.map((d) => dec(d.n + t * 10 ** (d.places - 1), d.places)), random);
      let smallest = 0;
      options.forEach((d, i) => { if (compare(d, options[smallest]!) < 0) smallest = i; });
      return { kind, options, choices: options.map(fmt), answer: smallest };
    }
    case "digit": {
      // Four different digits, so each place has its own.
      const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random).slice(0, 4);
      const d = dec(Number(digits.join("")), 3);
      const place = pick([-1, -2, -3, 0] as const, random);
      const digit = placeDigits(d).find(([p]) => p === place)![1];
      const choices = shuffle(digits.map(String), random);
      return { kind, d, place, choices, answer: choices.indexOf(String(digit)) };
    }
    case "round": {
      const places = pick([0, 1, 2] as const, random);
      const d = randomDecimal(random, places + 1 + (random() < 0.4 && places < 2 ? 1 : 0), 20);
      const r = roundDecimal(d, places);
      return { kind, d, places, ...choicesOf(r.result, [r.up ? r.lower : r.upper, trim(dec(Math.floor(d.n / 10), d.places - 1))], random) };
    }
    case "fraction": {
      const [num, den] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [1, 10], [7, 10], [3, 100], [37, 100], [9, 100], [125, 1000], [45, 1000]] as const, random);
      const right = fromFraction(num, den)!;
      // Typical slips: the digits in the wrong place (0,037 for 37/100), or numerator then denominator (0,14 for 1/4).
      const wrongs = [dec(num, Math.min(MAX_PLACES, right.places + 1)), dec(num, Math.max(0, right.places - 1)), parseDecimal(`${num},${den}`) ?? dec(num + 1, 1)];
      return { kind, num, den, ...choicesOf(right, wrongs, random) };
    }
    case "add":
    case "subtract": {
      const a = randomDecimal(random, randomInt(random, 1, 2), 9);
      const b = randomDecimal(random, a.places === 1 ? 2 : 1, 5);
      const [big, small] = compare(a, b) >= 0 ? [a, b] : [b, a];
      const right = kind === "add" ? add(big, small) : subtract(big, small);
      // Lining up the last digits instead of the commas: 2,5 + 0,75 "= 1,00".
      const p = Math.max(big.places, small.places);
      const misN = kind === "add" ? big.n + small.n : Math.abs(big.n - small.n);
      const wrongs = [dec(misN, p), dec(right.n + 10 ** (p - 1), p), dec(right.n + 10 ** p, p)];
      return { kind, a: big, b: small, ...choicesOf(right, wrongs, random) };
    }
  }
}

export function makeDecimalRound(random: Random, size = 10): DecimalQuestion[] {
  const out: DecimalQuestion[] = [];
  const counts = new Map<string, number>();
  while (out.length < size) {
    const q = makeDecimalQuestion(random);
    if ((counts.get(q.kind) ?? 0) >= 2) continue;
    counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
    out.push(q);
  }
  return out;
}
