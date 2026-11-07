import { randomInt, type Random } from "./random";

/**
 * Bruchrechnen (Klasse 6/7): +, −, · and : with fractions and mixed numbers, worked the school way.
 * The working keeps fractions as written (6/8 stays 6/8 until it's gekürzt), so a fraction here is
 * a plain pair, not a self-simplifying Rational.
 */
/** ggT and kgV that also cope with 0 (the ones in number-theory are for the Teiler page, from 1 up). */
const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
export const lcm = (a: number, b: number): number => (a / (gcd(a, b) || 1)) * b;

export interface Frac {
  n: number;
  d: number;
}
export const fr = (n: number, d = 1): Frac => {
  if (d === 0) throw new Error("Division by zero");
  return d < 0 ? { n: -n, d: -d } : { n, d };
};
export type Op = "+" | "-" | "*" | ":";

/** Kürzen as far as it goes: by the ggT of numerator and denominator. */
export function simplify(f: Frac): { result: Frac; by: number } {
  const g = gcd(f.n, f.d) || 1;
  return { result: { n: f.n / g, d: f.d / g }, by: g };
}
export const sameValue = (a: Frac, b: Frac): boolean => a.n * b.d === b.n * a.d;
export const value = (f: Frac): number => f.n / f.d;

/** 7/3 as a mixed number: 2 and 1/3. Whole numbers have part 0. */
export function toMixed(f: Frac): { whole: number; part: Frac } {
  const s = simplify(f).result;
  const whole = Math.trunc(s.n / s.d);
  return { whole, part: { n: Math.abs(s.n - whole * s.d), d: s.d } };
}
export const fromMixed = (whole: number, part: Frac): Frac => fr(whole * part.d + (whole < 0 ? -part.n : part.n), part.d);

/** Reads "3/4", "2 1/3", "5", "−1/2", "1,5". Returns null for anything else. */
export function readFrac(text: string): Frac | null {
  const t = text.trim().replace(/[−–]/g, "-").replace(/\s+/g, " ");
  let m = /^(-?\d+) (\d+)\/(\d+)$/.exec(t);
  if (m) return Number(m[3]) === 0 ? null : fromMixed(Number(m[1]), fr(Number(m[2]), Number(m[3])));
  m = /^(-?\d+)\/(-?\d+)$/.exec(t);
  if (m) return Number(m[2]) === 0 ? null : fr(Number(m[1]), Number(m[2]));
  m = /^(-?\d+)(?:[.,](\d{1,4}))?$/.exec(t);
  if (m) {
    const dec = m[2] ?? "";
    const den = 10 ** dec.length;
    const whole = Number(m[1]);
    return fr(whole * den + (whole < 0 || m[1] === "-0" ? -1 : 1) * Number(dec || "0"), den);
  }
  return null;
}

// ---------- the working ----------

/** Every number the explanation needs, step by step. */
export type Working =
  | { op: "+" | "-"; a: Frac; b: Frac; common: number; ka: number; kb: number; ea: Frac; eb: Frac; raw: Frac; result: Frac; by: number }
  | { op: "*"; a: Frac; b: Frac; cross: [number, number]; ca: Frac; cb: Frac; raw: Frac; result: Frac; by: number }
  | { op: ":"; a: Frac; b: Frac; flipped: Frac; times: Extract<Working, { op: "*" }> };

/** Plus and minus: bring both to the Hauptnenner (the kgV of the denominators), then add the Zähler. */
function addSub(op: "+" | "-", a: Frac, b: Frac): Extract<Working, { op: "+" | "-" }> {
  const common = lcm(a.d, b.d);
  const ka = common / a.d, kb = common / b.d;
  const ea = { n: a.n * ka, d: common }, eb = { n: b.n * kb, d: common };
  const raw = { n: op === "+" ? ea.n + eb.n : ea.n - eb.n, d: common };
  const { result, by } = simplify(raw);
  return { op, a, b, common, ka, kb, ea, eb, raw, result, by };
}

/** Times: kürzen über Kreuz first, then Zähler mal Zähler, Nenner mal Nenner. */
function times(a: Frac, b: Frac): Extract<Working, { op: "*" }> {
  const g1 = gcd(Math.abs(a.n), b.d) || 1; // a's numerator with b's denominator
  const g2 = gcd(Math.abs(b.n), a.d) || 1;
  const ca = { n: a.n / g1, d: a.d / g2 }, cb = { n: b.n / g2, d: b.d / g1 };
  const raw = { n: ca.n * cb.n, d: ca.d * cb.d };
  const { result, by } = simplify(raw);
  return { op: "*", a, b, cross: [g1, g2], ca, cb, raw, result, by };
}

export function work(op: Op, a: Frac, b: Frac): Working {
  if (op === "+" || op === "-") return addSub(op, a, b);
  if (op === "*") return times(a, b);
  if (b.n === 0) throw new Error("Division by zero");
  const flipped = fr(b.d, b.n); // the Kehrwert
  return { op: ":", a, b, flipped, times: times(a, flipped) };
}
export const resultOf = (w: Working): Frac => (w.op === ":" ? w.times.result : w.result);

// ---------- quiz ----------

export type CalcKind = "add" | "sub" | "mul" | "div" | "mixed";
export interface CalcQuestion {
  kind: CalcKind;
  op: Op;
  a: Frac;
  b: Frac;
  /** Shown as mixed numbers (2 1/3) in the question. */
  mixed: boolean;
  choices: Frac[];
  answer: number;
}

const OP: Record<CalcKind, Op> = { add: "+", sub: "-", mul: "*", div: ":", mixed: "+" };
const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;
const DENS = [2, 3, 4, 5, 6, 8, 9, 10, 12] as const;

function properFrac(random: Random, dens: readonly number[] = DENS): Frac {
  const d = pick(dens, random);
  return fr(randomInt(random, 1, d - 1), d);
}

/** The typical mistakes for each kind, as wrong answers. */
function mistakes(kind: CalcKind, a: Frac, b: Frac): Frac[] {
  const out: Frac[] = [];
  const push = (n: number, d: number) => {
    if (d > 0 && n > 0) out.push({ n, d });
  };
  switch (kind) {
    case "add":
    case "mixed":
      push(a.n + b.n, a.d + b.d); // Zähler plus Zähler, Nenner plus Nenner
      push(a.n + b.n, lcm(a.d, b.d)); // forgot to expand the Zähler
      push(a.n * b.n, a.d * b.d); // multiplied instead
      break;
    case "sub":
      push(a.n - b.n, a.d - b.d);
      push(a.n - b.n, lcm(a.d, b.d));
      push(a.n * b.d + b.n * a.d, a.d * b.d); // added instead
      break;
    case "mul":
      push(a.n * b.d, a.d * b.n); // divided: multiplied across
      push(a.n * b.n, a.d + b.d);
      push(a.n * b.n, lcm(a.d, b.d)); // a Hauptnenner like for +
      break;
    case "div":
      push(a.n * b.n, a.d * b.d); // forgot the Kehrwert
      push(a.d * b.n, a.n * b.d); // took the Kehrwert of the first fraction
      push(a.n * b.n, a.d * b.n);
      break;
  }
  return out;
}

export function makeCalcQuestion(kind: CalcKind, random: Random): CalcQuestion {
  for (;;) {
    let a: Frac, b: Frac;
    if (kind === "mixed") {
      a = fromMixed(randomInt(random, 1, 3), properFrac(random, [2, 3, 4, 5, 6, 8]));
      b = fromMixed(randomInt(random, 1, 2), properFrac(random, [2, 3, 4, 5, 6, 8]));
    } else {
      a = properFrac(random);
      b = properFrac(random);
      if (kind === "sub" && value(a) <= value(b)) [a, b] = [b, a];
    }
    a = simplify(a).result;
    b = simplify(b).result;
    if ((kind === "add" || kind === "sub") && a.d === b.d && random() < 0.7) continue; // mostly different denominators
    const op = OP[kind];
    const right = resultOf(work(op, a, b));
    if (right.n <= 0 || right.d > 72) continue;
    const wrong: Frac[] = [];
    for (const w of [...mistakes(kind, a, b), fr(right.n + 1, right.d), fr(right.n, right.d + 1), fr(right.n + right.d, right.d)]) {
      const s = simplify(w).result;
      if (!sameValue(s, right) && !wrong.some((x) => sameValue(x, s))) wrong.push(s);
      if (wrong.length === 3) break;
    }
    const all = [right, ...wrong];
    for (let i = all.length - 1; i > 0; i--) {
      const j = randomInt(random, 0, i);
      [all[i], all[j]] = [all[j]!, all[i]!];
    }
    return { kind, op, a, b, mixed: kind === "mixed", choices: all, answer: all.indexOf(right) };
  }
}

/** Ten questions: two of each kind, shuffled. */
export function makeCalcRound(random: Random, kinds: readonly CalcKind[] = ["add", "sub", "mul", "div", "mixed"]): CalcQuestion[] {
  const out = Array.from({ length: 10 }, (_, i) => makeCalcQuestion(kinds[i % kinds.length]!, random));
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
