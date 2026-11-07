import { parse, type Expr } from "./expression";
import { add, div, equals, isInteger, isZero, mul, neg, parseRational, rat, sub, ZERO, ONE, type Rational } from "./rational";
import { randomInt, type Random } from "./random";

/**
 * Lineare Gleichungen (Klasse 7/8), solved the school way: one Äquivalenzumformung per line,
 * with what's done written on the right ("| − 2", "| : 3").
 *
 * One side of an equation: an optional bracket k·(bx·x + bc), then x·x + c.
 * So "4(x − 1) + 2x" is { k: 4, bx: 1, bc: −1, x: 2, c: 0 }; without a bracket k is 0.
 */
export interface Side {
  k: Rational;
  bx: Rational;
  bc: Rational;
  x: Rational;
  c: Rational;
}
export interface LinearEquation {
  left: Side;
  right: Side;
}

export const side = (x: number | Rational, c: number | Rational = 0): Side => ({
  k: ZERO, bx: ZERO, bc: ZERO, x: toRat(x), c: toRat(c),
});
export const bracketSide = (k: number | Rational, bx: number | Rational, bc: number | Rational, x: number | Rational = 0, c: number | Rational = 0): Side => ({
  k: toRat(k), bx: toRat(bx), bc: toRat(bc), x: toRat(x), c: toRat(c),
});
const toRat = (v: number | Rational): Rational => (typeof v === "number" ? rat(v) : v);

export const hasBracket = (s: Side): boolean => !isZero(s.k);
/** The side worked out for one value of x. */
export const valueAt = (s: Side, x: Rational): Rational => add(add(mul(s.k, add(mul(s.bx, x), s.bc)), mul(s.x, x)), s.c);

// ---------- the operations (Äquivalenzumformungen) ----------

export type Operation =
  | { kind: "expand" } // Klammer auflösen (and collect like terms)
  | { kind: "add"; x: Rational; c: Rational } // add the same term to both sides: | − 2x, | + 3
  | { kind: "mul"; f: Rational }; // multiply both sides: | : 3 is f = 1/3, | · 2 is f = 2

const expandSide = (s: Side): Side => ({ k: ZERO, bx: ZERO, bc: ZERO, x: add(s.x, mul(s.k, s.bx)), c: add(s.c, mul(s.k, s.bc)) });

export function apply(e: LinearEquation, op: Operation): LinearEquation {
  switch (op.kind) {
    case "expand":
      return { left: expandSide(e.left), right: expandSide(e.right) };
    case "add": {
      const f = (s: Side): Side => ({ ...s, x: add(s.x, op.x), c: add(s.c, op.c) });
      return { left: f(e.left), right: f(e.right) };
    }
    case "mul": {
      if (isZero(op.f)) throw new Error("Multiplying by 0 isn't an Äquivalenzumformung");
      const f = (s: Side): Side => ({ ...s, k: mul(s.k, op.f), x: mul(s.x, op.f), c: mul(s.c, op.f) });
      return { left: f(e.left), right: f(e.right) };
    }
  }
}

/** Where the solving has got to. */
export type Outcome =
  | { kind: "value"; x: Rational } // x = 4
  | { kind: "none" } // 0 = 5: L = { }
  | { kind: "all" }; // 0 = 0: every number

/** Finished when it reads "x = number", or when no x is left ("3 = 5", "2 = 2"). */
export function outcome(e: LinearEquation): Outcome | null {
  const { left: l, right: r } = e;
  if (hasBracket(l) || hasBracket(r)) return null;
  if (isZero(l.x) && isZero(r.x)) return equals(l.c, r.c) ? { kind: "all" } : { kind: "none" };
  if (equals(l.x, ONE) && isZero(l.c) && isZero(r.x)) return { kind: "value", x: r.c };
  return null;
}

/**
 * The next step the school way: brackets first, then the x terms to the left, then the numbers
 * to the right, then divide by the number in front of x.
 */
export function bestOperation(e: LinearEquation): Operation | null {
  if (outcome(e)) return null;
  const { left: l, right: r } = e;
  if (hasBracket(l) || hasBracket(r)) return { kind: "expand" };
  // x on the right (also "5 = 2x + 1", where it's only there): bring it over to the left.
  if (!isZero(r.x)) return { kind: "add", x: neg(r.x), c: ZERO };
  if (!isZero(l.c)) return { kind: "add", x: ZERO, c: neg(l.c) };
  return { kind: "mul", f: div(ONE, l.x) };
}

/** Why a choice isn't the best next step. "best" is the one to take. */
export type Verdict =
  | "best"
  | "bracketFirst" // anything else while there's still a bracket
  | "insideBracket" // taking away the number inside a bracket
  | "wrongSign" // + 2 where − 2 makes it disappear
  | "divideEarly" // dividing while x terms or numbers are still on the wrong side
  | "subtractCoef" // 3x = 12, | − 3
  | "multiplyCoef" // 3x = 12, | · 3
  | "wrongDivisor" // 3x = 12, | : 12
  | "xGone"; // subtracting the only x term

export interface Choice {
  op: Operation;
  verdict: Verdict;
}

const opKey = (op: Operation): string =>
  op.kind === "expand" ? "e" : op.kind === "add" ? `a${op.x.n}/${op.x.d},${op.c.n}/${op.c.d}` : `m${op.f.n}/${op.f.d}`;
const plus = (x: Rational, c: Rational): Operation => ({ kind: "add", x, c });

/** The best next step and two or three tempting wrong ones, in a random order. */
export function choicesFor(e: LinearEquation, random: Random): Choice[] {
  const best = bestOperation(e);
  if (!best) return [];
  const { left: l, right: r } = e;
  const wrong: Choice[] = [];
  const isOne = (q: Rational) => equals(q, ONE);
  if (best.kind === "expand") {
    const b = hasBracket(l) ? l : r;
    if (!isZero(b.bc)) wrong.push({ op: plus(ZERO, neg(b.bc)), verdict: "insideBracket" });
    if (!isZero(r.c)) wrong.push({ op: plus(ZERO, neg(r.c)), verdict: "bracketFirst" });
    else if (!isZero(l.c)) wrong.push({ op: plus(ZERO, neg(l.c)), verdict: "bracketFirst" });
    if (!isZero(r.x)) wrong.push({ op: plus(neg(r.x), ZERO), verdict: "bracketFirst" });
  } else if (best.kind === "add" && !isZero(best.x)) {
    wrong.push({ op: plus(neg(best.x), ZERO), verdict: "wrongSign" });
    if (!isZero(l.x) && !isOne(l.x)) wrong.push({ op: { kind: "mul", f: div(ONE, l.x) }, verdict: "divideEarly" });
  } else if (best.kind === "add") {
    wrong.push({ op: plus(ZERO, neg(best.c)), verdict: "wrongSign" });
    if (!isOne(l.x) && !isZero(l.x)) wrong.push({ op: { kind: "mul", f: div(ONE, l.x) }, verdict: "divideEarly" });
    wrong.push({ op: plus(neg(l.x), ZERO), verdict: "xGone" });
  } else {
    const a = l.x;
    wrong.push({ op: plus(ZERO, neg(a)), verdict: "subtractCoef" });
    if (!isZero(r.c) && !equals(r.c, a) && !equals(r.c, neg(a))) wrong.push({ op: { kind: "mul", f: div(ONE, r.c) }, verdict: "wrongDivisor" });
    wrong.push({ op: { kind: "mul", f: a }, verdict: "multiplyCoef" });
  }
  const seen = new Set([opKey(best)]);
  const picked: Choice[] = [];
  for (const w of wrong) {
    const k = opKey(w.op);
    if (seen.has(k) || (w.op.kind === "mul" && (isZero(w.op.f) || equals(w.op.f, ONE)))) continue;
    if (w.op.kind === "add" && isZero(w.op.x) && isZero(w.op.c)) continue;
    seen.add(k);
    picked.push(w);
  }
  const all = [{ op: best, verdict: "best" as const }, ...picked.slice(0, 3)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}

/** Every line from the start to the end, taking the best step each time. */
export function solveAll(e: LinearEquation): { lines: LinearEquation[]; ops: Operation[]; result: Outcome } {
  const lines = [e];
  const ops: Operation[] = [];
  for (let guard = 0; guard < 12; guard++) {
    const done = outcome(lines[lines.length - 1]!);
    if (done) return { lines, ops, result: done };
    const op = bestOperation(lines[lines.length - 1]!)!;
    ops.push(op);
    lines.push(apply(lines[lines.length - 1]!, op));
  }
  throw new Error("Didn't finish");
}

// ---------- tasks ----------

export type Level = 1 | 2 | 3 | 4 | 5;
/** The most x boxes and weights the balance (levels 1 and 2) draws on one pan. */
export const BALANCE_BOXES = 8;
export const BALANCE_WEIGHTS = 24;
/** 1 Waage: 3x + 2 = 11 · 2 x on both sides · 3 with negatives · 4 brackets · 5 fractions, no solution, every number */
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5];

const nonZero = (random: Random, lo: number, hi: number) => {
  for (;;) {
    const v = randomInt(random, lo, hi);
    if (v !== 0) return v;
  }
};

export function makeTask(level: Level, random: Random): LinearEquation {
  for (;;) {
    const e = draft(level, random);
    const s = solveAll(e);
    if (level < 5 && (s.result.kind !== "value" || !isInteger(s.result.x))) continue;
    if (s.ops.length < 2 && level > 1) continue;
    return e;
  }
}

function draft(level: Level, random: Random): LinearEquation {
  switch (level) {
    case 1: {
      // The balance: a boxes and b weights on the left, c weights on the right; everything positive.
      // At most BALANCE_WEIGHTS weights on a pan, so the balance can always be drawn.
      const a = randomInt(random, 2, 5), b = randomInt(random, 1, 9);
      const x = randomInt(random, 1, Math.min(6, Math.floor((BALANCE_WEIGHTS - b) / a)));
      return { left: side(a, b), right: side(0, a * x + b) };
    }
    case 2: {
      // Still on the balance: 5x + 1 = 2x + 10.
      const c = randomInt(random, 1, 4), a = c + randomInt(random, 1, 3), x = randomInt(random, 1, 5);
      const b = randomInt(random, 0, 6);
      const d = (a - c) * x + b;
      return { left: side(a, b), right: side(c, d) };
    }
    case 3: {
      const x = nonZero(random, -9, 9);
      const a = nonZero(random, -6, 7), c = randomInt(random, -5, 5);
      if (a === c) return draft(3, random);
      const b = randomInt(random, -12, 12);
      return { left: side(a, b), right: side(c, (a - c) * x + b) };
    }
    case 4: {
      // 4(x − 1) = 2x + 6, or 3(2x + 1) − x = 2(x + 9)
      const x = nonZero(random, -6, 8);
      const k = nonZero(random, -4, 5), bx = randomInt(random, 1, 3), bc = nonZero(random, -6, 6);
      const lx = random() < 0.4 ? nonZero(random, -3, 3) : 0;
      const rx = randomInt(random, -3, 4);
      if (k * bx + lx === rx) return draft(4, random);
      const leftValue = k * (bx * x + bc) + lx * x;
      return { left: bracketSide(k, bx, bc, lx, 0), right: side(rx, leftValue - rx * x) };
    }
    case 5: {
      const kind = randomInt(random, 0, 3);
      if (kind === 0) {
        // No solution: 2(x + 3) = 2x + 1
        const k = nonZero(random, 2, 4), bc = nonZero(random, -5, 5);
        let c = randomInt(random, -9, 9);
        if (c === k * bc) c += 1;
        return { left: bracketSide(k, 1, bc), right: side(k, c) };
      }
      if (kind === 1) {
        // Every number: 3(x − 2) = 3x − 6
        const k = nonZero(random, 2, 4), bc = nonZero(random, -5, 5);
        return { left: bracketSide(k, 1, bc), right: side(k, k * bc) };
      }
      // A fraction answer: 3x + 1 = 8 gives x = 7/3; or x/2 + 3 = 7.
      if (kind === 2) {
        const a = randomInt(random, 2, 6), b = randomInt(random, -9, 9);
        let d = randomInt(random, -12, 15);
        if ((d - b) % a === 0) d += 1;
        return { left: side(a, b), right: side(0, d) };
      }
      const den = randomInt(random, 2, 4), x = nonZero(random, -5, 6) * den, b = randomInt(random, -6, 6);
      return { left: side(rat(1, den), b), right: side(0, x / den + b) };
    }
  }
}

/** A round: five tasks of one level. */
export const makeRound = (level: Level, random: Random): LinearEquation[] => Array.from({ length: 5 }, () => makeTask(level, random));

// ---------- reading a typed equation ----------

export type ReadResult = { ok: true; equation: LinearEquation } | { ok: false; why: "noEquals" | "notLinear" | "twoBrackets" | "noX" | "syntax" };

type Lin = { x: Rational; c: Rational };
const fromNumber = (v: number): Rational | null => parseRational(String(v));

/** A linear expression with no bracket left to show: 2x + 3, x/2, 3·(x + 1) counted out. */
function linOf(e: Expr): Lin | null {
  switch (e.type) {
    case "num": {
      const c = fromNumber(e.value);
      return c && { x: ZERO, c };
    }
    case "var": return { x: ONE, c: ZERO };
    case "neg": {
      const a = linOf(e.arg);
      return a && { x: neg(a.x), c: neg(a.c) };
    }
    case "binary": {
      const a = linOf(e.left), b = linOf(e.right);
      if (!a || !b) return null;
      if (e.op === "+") return { x: add(a.x, b.x), c: add(a.c, b.c) };
      if (e.op === "-") return { x: sub(a.x, b.x), c: sub(a.c, b.c) };
      if (e.op === "*") {
        if (isZero(a.x)) return { x: mul(a.c, b.x), c: mul(a.c, b.c) };
        if (isZero(b.x)) return { x: mul(b.c, a.x), c: mul(b.c, a.c) };
        return null; // x · x
      }
      if (e.op === "/" && isZero(b.x) && !isZero(b.c)) return { x: div(a.x, b.c), c: div(a.c, b.c) };
      return null;
    }
    default:
      return null;
  }
}

/** A sum of terms, keeping one bracket (a number times a bracket) as a bracket. */
function sideOf(e: Expr): Side | "twoBrackets" | null {
  const terms: Array<[Expr, 1 | -1]> = [];
  const walk = (t: Expr, s: 1 | -1) => {
    if (t.type === "binary" && (t.op === "+" || t.op === "-") && !t.paren) {
      walk(t.left, s);
      walk(t.right, t.op === "-" ? (s === 1 ? -1 : 1) : s);
    } else if (t.type === "neg") walk(t.arg, s === 1 ? -1 : 1);
    else terms.push([t, s]);
  };
  walk(e, 1);
  let out: Side = side(0, 0);
  for (const [t, s] of terms) {
    const bracket = bracketOf(t);
    if (bracket) {
      if (hasBracket(out)) return "twoBrackets";
      out = { ...out, k: s === 1 ? bracket.k : neg(bracket.k), bx: bracket.inner.x, bc: bracket.inner.c };
      continue;
    }
    const l = linOf(t);
    if (!l) return null;
    out = { ...out, x: s === 1 ? add(out.x, l.x) : sub(out.x, l.x), c: s === 1 ? add(out.c, l.c) : sub(out.c, l.c) };
  }
  return out;
}

/** "4(x − 1)", "(x + 2)·3", "−2(x + 1)", "(x + 1)/2" as factor and inside. */
function bracketOf(t: Expr): { k: Rational; inner: Lin } | null {
  if (t.type !== "binary") return null;
  const isSum = (u: Expr) => u.type === "binary" && (u.op === "+" || u.op === "-");
  if (t.op === "*") {
    const [num, br] = isSum(t.right) ? [t.left, t.right] : isSum(t.left) ? [t.right, t.left] : [null, null];
    if (!num || !br) return null;
    const k = linOf(num), inner = linOf(br);
    if (!k || !inner || !isZero(k.x) || isZero(inner.x) || isZero(inner.c)) return null;
    return { k: k.c, inner };
  }
  if (t.op === "/" && isSum(t.left)) {
    const k = linOf(t.right), inner = linOf(t.left);
    if (!k || !inner || !isZero(k.x) || isZero(k.c) || isZero(inner.x) || isZero(inner.c)) return null;
    return { k: div(ONE, k.c), inner };
  }
  return null;
}

/** Reads what the child typed, like "4(x − 1) = 2x + 6". */
export function readEquation(text: string): ReadResult {
  const parts = text.split("=");
  if (parts.length !== 2 || !parts[0]!.trim() || !parts[1]!.trim()) return { ok: false, why: "noEquals" };
  try {
    const [l, r] = [sideOf(parse(parts[0]!.replace(/,/g, "."))), sideOf(parse(parts[1]!.replace(/,/g, ".")))];
    if (l === "twoBrackets" || r === "twoBrackets") return { ok: false, why: "twoBrackets" };
    if (!l || !r) return { ok: false, why: "notLinear" };
    const xs = [l.x, r.x, mul(l.k, l.bx), mul(r.k, r.bx)];
    if (xs.every(isZero)) return { ok: false, why: "noX" };
    return { ok: true, equation: { left: l, right: r } };
  } catch {
    return { ok: false, why: "syntax" };
  }
}
