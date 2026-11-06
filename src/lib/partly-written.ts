import { randomInt, type Random } from "./random";

/**
 * Halbschriftliches Rechnen (Klasse 3/4): split one number into easy parts, work each part
 * out in your head, then put the parts back together.
 *   7 · 46  = 7 · 40 + 7 · 6        = 280 + 42  = 322
 *   96 : 4  = 80 : 4 + 16 : 4       = 20 + 4    = 24
 *   87 : 4  = 80 : 4 + 7 : 4        = 20 + 1 R 3 = 21 R 3
 */
export type SplitLevel = 1 | 2 | 3;
export const SPLIT_LEVELS: readonly SplitLevel[] = [1, 2, 3];

export interface SplitMultiply {
  kind: "multiply";
  a: number; // the number that gets split
  b: number; // the other factor
  parts: number[]; // a split by place value: 46 → [40, 6]
  products: number[]; // each part · b
  result: number;
}

export interface SplitDivide {
  kind: "divide";
  dividend: number;
  divisor: number;
  parts: number[]; // the dividend split into easy multiples of the divisor: 96 : 4 → [80, 16]
  quotients: number[]; // each part : divisor
  rest: number; // what's left over (0 if it goes exactly)
  result: number; // the whole-number result
}

export type SplitTask = SplitMultiply | SplitDivide;

/** 128 → [100, 20, 8]; zero places are left out: 405 → [400, 5]. */
export function placeParts(n: number): number[] {
  if (!Number.isSafeInteger(n) || n < 1) throw new Error("Split a whole number of at least 1");
  const digits = String(n);
  return [...digits].map((d, i) => Number(d) * 10 ** (digits.length - 1 - i)).filter((p) => p > 0);
}

export function splitMultiply(a: number, b: number): SplitMultiply {
  if (!Number.isSafeInteger(b) || b < 1) throw new Error("Multiply by a whole number of at least 1");
  const parts = placeParts(a);
  const products = parts.map((p) => p * b);
  return { kind: "multiply", a, b, parts, products, result: a * b };
}

/**
 * Splits the dividend the way it's done in school: from the biggest place down, take the
 * largest multiple of divisor · 10, 100, … that still fits. 852 : 6 → 600 + 240 + 12.
 * Whatever is left at the end (less than the divisor) is the Rest.
 */
export function splitDivide(dividend: number, divisor: number): SplitDivide {
  if (!Number.isSafeInteger(dividend) || dividend < 1) throw new Error("Divide a whole number of at least 1");
  if (!Number.isSafeInteger(divisor) || divisor < 2) throw new Error("Divide by a whole number of at least 2");
  const parts: number[] = [];
  let left = dividend;
  for (let place = String(dividend).length - 1; place >= 0; place--) {
    const block = divisor * 10 ** place;
    const take = Math.floor(left / block) * block;
    if (take > 0) {
      parts.push(take);
      left -= take;
    }
  }
  const quotients = parts.map((p) => p / divisor);
  return { kind: "divide", dividend, divisor, parts, quotients, rest: left, result: quotients.reduce((s, q) => s + q, 0) };
}

/**
 * Tasks by level:
 *   1  two-digit · one-digit, and two-digit : one-digit without a rest
 *   2  three-digit · one-digit, and three-digit : one-digit without a rest
 *   3  two-digit · two-digit (split the first), and divisions with a rest
 * Every split has at least two parts, so there's something to split.
 */
export function makeSplitTask(level: SplitLevel, random: Random): SplitTask {
  for (;;) {
    if (random() < 0.5) {
      const a = level === 2 ? randomInt(random, 101, 999) : randomInt(random, 12, 99);
      const b = level === 3 ? randomInt(random, 11, 19) : randomInt(random, 2, 9);
      const t = splitMultiply(a, b);
      if (t.parts.length >= 2 && t.result <= 9999) return t;
    } else {
      const divisor = randomInt(random, 2, 9);
      const quotient = level === 2 ? randomInt(random, 21, 199) : randomInt(random, 11, 49);
      const rest = level === 3 ? randomInt(random, 1, divisor - 1) : 0;
      const t = splitDivide(divisor * quotient + rest, divisor);
      if (t.parts.length >= 2 && t.dividend <= 999) return t;
    }
  }
}

/** The numbers a child fills in, in order: the parts' results, then the total (and the rest). */
export function blanks(t: SplitTask): number[] {
  return t.kind === "multiply" ? [...t.products, t.result] : [...t.quotients, t.result, ...(t.rest ? [t.rest] : [])];
}
