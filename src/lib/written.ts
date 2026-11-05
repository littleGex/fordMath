import { randomInt, type Random } from "./random";

/**
 * Written ("schriftlich") column arithmetic as taught in German primary schools.
 * Every function returns the working as data (one step per column, ones first),
 * so the page can draw it and the explanation can describe it.
 */

/** Ergänzungsverfahren ("7 plus what makes 14?") or Abziehverfahren mit Entbündeln (borrowing). */
export type SubtractMethod = "complement" | "borrow";

export interface AddStep {
  column: number; // 0 = ones (Einer), 1 = tens (Zehner), …
  digits: number[]; // this column's digit from each number, top to bottom (0 where a number is shorter)
  carryIn: number;
  total: number; // digits + carryIn
  write: number;
  carryOut: number;
}

export interface ComplementStep {
  column: number;
  top: number;
  bottom: number;
  carryIn: number; // Übertrag added to the bottom digit
  lower: number; // bottom + carryIn
  target: number; // top, or top + 10 when lower doesn't fit
  write: number;
  carryOut: 0 | 1;
  leadingZero: boolean; // a 0 at the front of the answer isn't written
}

/** A digit crossed out and rewritten above when borrowing: 2 → 1, or 0 → 9 in a chain. */
export interface Exchange {
  column: number;
  from: number;
  to: number;
}

export interface BorrowStep {
  column: number;
  top: number; // digit in this column before this step (after earlier exchanges)
  bottom: number;
  exchanges: Exchange[]; // left-to-right, empty when top ≥ bottom
  topAfter: number; // top, or top + 10 after exchanging
  write: number;
  leadingZero: boolean;
}

/** One discriminant, `kind`, tells TypeScript which steps array is present. */
export type WrittenSum =
  | { kind: "add"; numbers: number[]; result: number; steps: AddStep[] }
  | { kind: "complement"; numbers: [number, number]; result: number; steps: ComplementStep[] }
  | { kind: "borrow"; numbers: [number, number]; result: number; steps: BorrowStep[] };

/** Digits with the ones first: 473 → [3, 7, 4]. */
export function digitsOf(n: number): number[] {
  return [...String(n)].reverse().map(Number);
}

export function assertWhole(n: number, name: string): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${name} must be a whole number, 0 or more`);
}

export function writtenAdd(numbers: readonly number[]): WrittenSum {
  if (numbers.length < 2) throw new Error("Addition needs at least two numbers");
  numbers.forEach((n, i) => assertWhole(n, `Number ${i + 1}`));
  const digits = numbers.map(digitsOf);
  const width = Math.max(...digits.map((d) => d.length));
  const steps: AddStep[] = [];
  let carry = 0;
  for (let column = 0; column < width || carry > 0; column++) {
    const col = digits.map((d) => d[column] ?? 0);
    const total = col.reduce((a, d) => a + d, 0) + carry;
    steps.push({ column, digits: col, carryIn: carry, total, write: total % 10, carryOut: Math.floor(total / 10) });
    carry = Math.floor(total / 10);
  }
  return { kind: "add", numbers: [...numbers], result: numbers.reduce((a, n) => a + n, 0), steps };
}

function assertSubtraction(a: number, b: number): void {
  assertWhole(a, "The first number");
  assertWhole(b, "The second number");
  if (b > a) throw new Error("The second number must not be bigger than the first");
}

export function writtenSubtract(a: number, b: number, method: SubtractMethod): WrittenSum {
  assertSubtraction(a, b);
  return method === "complement" ? complement(a, b) : borrow(a, b);
}

function complement(a: number, b: number): WrittenSum {
  const top = digitsOf(a);
  const bottom = digitsOf(b);
  const steps: ComplementStep[] = [];
  let carry: 0 | 1 = 0;
  for (let column = 0; column < top.length; column++) {
    const t = top[column]!;
    // Explicit types: `carry` is updated from `fits` below, so TypeScript can't infer these on its own.
    const lower: number = (bottom[column] ?? 0) + carry;
    const fits: boolean = lower <= t;
    const target = fits ? t : t + 10;
    const write = target - lower;
    steps.push({
      column, top: t, bottom: bottom[column] ?? 0, carryIn: carry, lower, target, write,
      carryOut: fits ? 0 : 1,
      leadingZero: false,
    });
    carry = fits ? 0 : 1;
  }
  markLeadingZeros(steps);
  return { kind: "complement", numbers: [a, b], result: a - b, steps };
}

function borrow(a: number, b: number): WrittenSum {
  const top = digitsOf(a); // changed as we exchange
  const bottom = digitsOf(b);
  const steps: BorrowStep[] = [];
  for (let column = 0; column < top.length; column++) {
    const t = top[column]!;
    const btm = bottom[column] ?? 0;
    const exchanges: Exchange[] = [];
    let topAfter = t;
    if (t < btm) {
      // Find the nearest non-zero digit to the left, take 1 from it, and turn the zeros in between into 9s.
      let from = column + 1;
      while (top[from] === 0) from++;
      for (let c = from; c > column; c--) {
        const before = top[c]!;
        const after = c === from ? before - 1 : 9;
        exchanges.push({ column: c, from: before, to: after });
        top[c] = after;
      }
      topAfter = t + 10;
    }
    steps.push({ column, top: t, bottom: btm, exchanges, topAfter, write: topAfter - btm, leadingZero: false });
  }
  markLeadingZeros(steps);
  return { kind: "borrow", numbers: [a, b], result: a - b, steps };
}

/** 105 − 98 = 7, not 007: zeros at the front of the answer are left blank. */
function markLeadingZeros(steps: { write: number; leadingZero: boolean }[]): void {
  for (let i = steps.length - 1; i > 0 && steps[i]!.write === 0; i--) steps[i]!.leadingZero = true;
}

/** True if any column needs a carry (addition) or an exchange (subtraction). */
export function needsCarry(sum: WrittenSum): boolean {
  switch (sum.kind) {
    case "add": return sum.steps.some((s) => s.carryOut > 0);
    case "complement": return sum.steps.some((s) => s.carryOut > 0);
    case "borrow": return sum.steps.some((s) => s.exchanges.length > 0);
  }
}

// ---------- practice problems ----------

export type Op = "add" | "subtract";

export interface ProblemLevel {
  /** Numbers up to this size: 100, 1 000 or 10 000. */
  max: number;
  carry: boolean;
}

/**
 * Two numbers for practice. With `carry: false` every column fits without carrying;
 * with `carry: true` at least one column needs it. Subtraction never goes below 0.
 */
export function makeProblem(op: Op, level: ProblemLevel, random: Random): [number, number] {
  const width = String(level.max - 1).length;
  for (let attempt = 0; attempt < 200; attempt++) {
    const [a, b] = level.carry ? anyPair(op, level.max, random) : noCarryPair(op, width, random);
    if (a < 10 || b < 1) continue;
    const sum = op === "add" ? writtenAdd([a, b]) : writtenSubtract(a, b, "complement");
    if (op === "add" && a + b >= level.max * (level.carry ? 2 : 1)) continue;
    if (needsCarry(sum) === level.carry) return [a, b];
  }
  // Practically unreachable; a safe fallback that matches the request.
  return level.carry ? (op === "add" ? [48, 37] : [52, 27]) : op === "add" ? [42, 35] : [87, 23];
}

function anyPair(op: Op, max: number, random: Random): [number, number] {
  const a = randomInt(random, 10, max - 1);
  const b = op === "add" ? randomInt(random, 1, max - 1) : randomInt(random, 1, a);
  return [a, b];
}

function noCarryPair(op: Op, width: number, random: Random): [number, number] {
  let a = 0;
  let b = 0;
  for (let c = 0, place = 1; c < width; c++, place *= 10) {
    const leading = c === width - 1;
    if (op === "add") {
      const da = randomInt(random, leading ? 1 : 0, 8);
      const db = randomInt(random, 0, 9 - da);
      a += da * place;
      b += db * place;
    } else {
      const da = randomInt(random, leading ? 1 : 0, 9);
      const db = randomInt(random, 0, da);
      a += da * place;
      b += db * place;
    }
  }
  return [a, b];
}
