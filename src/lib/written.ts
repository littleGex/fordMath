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
  digits: number[]; // the digits standing in this column, top to bottom (a shorter number has none here)
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

/** One digit of a partial product (a · one digit of b), or the carry written in front at the end. */
export type MulRowStep =
  | { kind: "digit"; aDigit: number; bDigit: number; carryIn: number; total: number; write: number; carryOut: number }
  | { kind: "carry"; write: number };

/**
 * One line of a written multiplication: a times one digit of b.
 * German layout: lines go left to right through b's digits, and each line ends under
 * the digit it multiplies by, so `shift` is how many places it sits left of the last column.
 */
export interface MulRow {
  bDigit: number;
  shift: number;
  value: number;
  steps: MulRowStep[]; // ones first; each writes one digit
}

/** One round of a written division: divide, multiply, subtract, then bring down the next digit. */
export interface DivStep {
  part: number; // the number being divided now: 28, then 45
  shown: string; // how it's written, e.g. "01" when 0 was left and 1 brought down
  partEnd: number; // index (from the left) of the dividend digit it ends under
  qDigit: number; // digit of the answer
  product: number; // qDigit · divisor
  remainder: number; // part − product
  bringDown: number | null; // next dividend digit, or null when there's none left
}

/** One discriminant, `kind`, tells TypeScript which working is present. */
export type WrittenSum =
  | { kind: "add"; numbers: number[]; result: number; steps: AddStep[] }
  | { kind: "complement"; numbers: [number, number]; result: number; steps: ComplementStep[] }
  | { kind: "borrow"; numbers: [number, number]; result: number; steps: BorrowStep[] }
  | { kind: "multiply"; numbers: [number, number]; result: number; rows: MulRow[]; addition: AddStep[] | null }
  | { kind: "divide"; numbers: [number, number]; result: number; remainder: number; steps: DivStep[] };

/**
 * Each function returns only its own member of the union. `Extract` picks members out by shape,
 * so code that calls writtenAdd() can use `.steps` straight away without checking `kind`.
 */
export type AddSum = Extract<WrittenSum, { kind: "add" }>;
export type SubtractSum = Extract<WrittenSum, { kind: "complement" | "borrow" }>;
export type MultiplySum = Extract<WrittenSum, { kind: "multiply" }>;
export type DivideSum = Extract<WrittenSum, { kind: "divide" }>;

/** Digits with the ones first: 473 → [3, 7, 4]. */
export function digitsOf(n: number): number[] {
  return [...String(n)].reverse().map(Number);
}

export function assertWhole(n: number, name: string): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${name} must be a whole number, 0 or more`);
}

/** Adds digit columns, where each number's digits (ones first) start `shift` places to the left. */
function addColumns(numbers: readonly { digits: number[]; shift: number }[]): AddStep[] {
  const width = Math.max(...numbers.map((n) => n.digits.length + n.shift));
  const steps: AddStep[] = [];
  let carry = 0;
  for (let column = 0; column < width || carry > 0; column++) {
    const col = numbers.flatMap((n) => {
      const d = n.digits[column - n.shift];
      return d === undefined ? [] : [d];
    });
    const total = col.reduce((a, d) => a + d, 0) + carry;
    steps.push({ column, digits: col, carryIn: carry, total, write: total % 10, carryOut: Math.floor(total / 10) });
    carry = Math.floor(total / 10);
  }
  return steps;
}

export function writtenAdd(numbers: readonly number[]): AddSum {
  if (numbers.length < 2) throw new Error("Addition needs at least two numbers");
  numbers.forEach((n, i) => assertWhole(n, `Number ${i + 1}`));
  const steps = addColumns(numbers.map((n) => ({ digits: digitsOf(n), shift: 0 })));
  return { kind: "add", numbers: [...numbers], result: numbers.reduce((a, n) => a + n, 0), steps };
}

/** Schriftliche Multiplikation: a · b, one line per digit of b (left to right), then add the lines. */
export function writtenMultiply(a: number, b: number): MultiplySum {
  assertWhole(a, "The first number");
  assertWhole(b, "The second number");
  if (!Number.isSafeInteger(a * b)) throw new Error("The answer is too big");
  const aDigits = digitsOf(a);
  const bLeft = [...String(b)].map(Number);
  const rows: MulRow[] = bLeft.map((d, i) => {
    const steps: MulRowStep[] = [];
    let carry = 0;
    for (const ad of aDigits) {
      const total = ad * d + carry;
      steps.push({ kind: "digit", aDigit: ad, bDigit: d, carryIn: carry, total, write: total % 10, carryOut: Math.floor(total / 10) });
      carry = Math.floor(total / 10);
    }
    if (carry > 0) steps.push({ kind: "carry", write: carry }); // at most 8 (9 · 9 + 8 = 89)
    return { bDigit: d, shift: bLeft.length - 1 - i, value: a * d, steps };
  });
  const addition =
    rows.length > 1 ? addColumns(rows.map((r) => ({ digits: r.steps.map((s) => s.write), shift: r.shift }))) : null;
  return { kind: "multiply", numbers: [a, b], result: a * b, rows, addition };
}

/** Schriftliche Division: dividend : divisor = quotient Rest remainder, worked from the left. */
export function writtenDivide(dividend: number, divisor: number): DivideSum {
  assertWhole(dividend, "The first number");
  assertWhole(divisor, "The second number");
  if (divisor === 0) throw new Error("You can't divide by 0");
  const ds = [...String(dividend)].map(Number);
  // Start with the first digits that make a number at least as big as the divisor.
  let i = 0;
  let part = ds[0]!;
  let shown = String(part);
  while (part < divisor && i < ds.length - 1) {
    i++;
    part = part * 10 + ds[i]!;
    shown += ds[i];
  }
  const steps: DivStep[] = [];
  for (;;) {
    const qDigit = Math.floor(part / divisor);
    const product = qDigit * divisor;
    const remainder = part - product;
    const bringDown = i < ds.length - 1 ? ds[i + 1]! : null;
    steps.push({ part, shown, partEnd: i, qDigit, product, remainder, bringDown });
    if (bringDown === null) break;
    i++;
    shown = String(remainder) + bringDown;
    part = remainder * 10 + bringDown;
  }
  return {
    kind: "divide", numbers: [dividend, divisor],
    result: Math.floor(dividend / divisor), remainder: dividend % divisor, steps,
  };
}

function assertSubtraction(a: number, b: number): void {
  assertWhole(a, "The first number");
  assertWhole(b, "The second number");
  if (b > a) throw new Error("The second number must not be bigger than the first");
}

export function writtenSubtract(a: number, b: number, method: SubtractMethod): SubtractSum {
  assertSubtraction(a, b);
  return method === "complement" ? complement(a, b) : borrow(a, b);
}

function complement(a: number, b: number): SubtractSum {
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

function borrow(a: number, b: number): SubtractSum {
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

/**
 * The "harder" version of each sum: a carry (addition, multiplication), an exchange
 * (subtraction), or a remainder (division).
 */
export function needsCarry(sum: WrittenSum): boolean {
  switch (sum.kind) {
    case "add": return sum.steps.some((s) => s.carryOut > 0);
    case "complement": return sum.steps.some((s) => s.carryOut > 0);
    case "borrow": return sum.steps.some((s) => s.exchanges.length > 0);
    case "multiply":
      return (
        sum.rows.some((r) => r.steps.some((s) => s.kind === "carry" || s.carryOut > 0)) ||
        (sum.addition ?? []).some((s) => s.carryOut > 0)
      );
    case "divide": return sum.remainder > 0;
  }
}

// ---------- practice problems ----------

export type Op = "add" | "subtract" | "multiply" | "divide";

export interface ProblemLevel {
  /** Numbers up to this size: 100, 1 000 or 10 000. */
  max: number;
  carry: boolean;
}

/**
 * Two numbers for practice. With `carry: false` every column fits without carrying;
 * with `carry: true` at least one column needs it. Subtraction never goes below 0.
 * For multiplication and division the sizes are:
 *   max 100:   2-digit · 1-digit,   2-digit : 1-digit
 *   max 1000:  3-digit · 1-digit,   3-digit : 1-digit
 *   max 10000: 3-digit · 2-digit,   4-digit : 2-digit (11–25)
 * and for division `carry` means "with a remainder".
 */
export function makeProblem(op: Op, level: ProblemLevel, random: Random): [number, number] {
  if (op === "multiply") return multiplyProblem(level, random);
  if (op === "divide") return divideProblem(level, random);
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

function multiplyProblem(level: ProblemLevel, random: Random): [number, number] {
  const [aMin, aMax] = level.max <= 100 ? [12, 99] : [102, 999];
  const [bMin, bMax] = level.max >= 10000 ? [12, 99] : [2, 9];
  for (let attempt = 0; attempt < 2000; attempt++) {
    const a = randomInt(random, aMin, aMax);
    const b = randomInt(random, bMin, bMax);
    if (needsCarry(writtenMultiply(a, b)) === level.carry) return [a, b];
  }
  return level.carry ? [level.max >= 10000 ? 473 : 47, level.max >= 10000 ? 26 : 6] : [level.max <= 100 ? 21 : 312, level.max >= 10000 ? 13 : 3];
}

function divideProblem(level: ProblemLevel, random: Random): [number, number] {
  const [dMin, dMax] = level.max >= 10000 ? [11, 25] : [2, 9];
  const [nMin, nMax] = level.max <= 100 ? [10, 99] : level.max <= 1000 ? [100, 999] : [1000, 9999];
  for (let attempt = 0; attempt < 2000; attempt++) {
    const divisor = randomInt(random, dMin, dMax);
    const dividend = level.carry
      ? randomInt(random, nMin, nMax)
      : divisor * randomInt(random, Math.ceil(nMin / divisor), Math.floor(nMax / divisor));
    if (dividend >= nMin && dividend <= nMax && (dividend % divisor > 0) === level.carry) return [dividend, divisor];
  }
  return level.carry ? [285, 6] : [612, 6];
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
