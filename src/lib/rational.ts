/**
 * Exact fractions for algebra: every Rational is kept in lowest terms with a positive denominator,
 * so two equal values always look the same (and `equals` is just comparing two numbers).
 * Unlike `Fraction` in fraction.ts, which keeps 2/4 as 2/4 on purpose for the Kürzen game,
 * a Rational simplifies itself straight away.
 */
export interface Rational {
  readonly n: number;
  readonly d: number;
}

const gcdOf = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

export function rat(n: number, d = 1): Rational {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) throw new Error("The numbers got too big to keep exact");
  if (d === 0) throw new Error("Division by zero");
  const g = gcdOf(n, d) || 1;
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g + 0, d: (sign * d) / g }; // + 0 turns −0 into 0
}

export const ZERO = rat(0);
export const ONE = rat(1);

export const add = (a: Rational, b: Rational): Rational => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const neg = (a: Rational): Rational => rat(-a.n, a.d);
export const sub = (a: Rational, b: Rational): Rational => add(a, neg(b));
export const mul = (a: Rational, b: Rational): Rational => rat(a.n * b.n, a.d * b.d);
export function div(a: Rational, b: Rational): Rational {
  if (b.n === 0) throw new Error("Division by zero");
  return rat(a.n * b.d, a.d * b.n);
}

export const isZero = (a: Rational): boolean => a.n === 0;
export const isInteger = (a: Rational): boolean => a.d === 1;
export const equals = (a: Rational, b: Rational): boolean => a.n === b.n && a.d === b.d;
export const sign = (a: Rational): -1 | 0 | 1 => (a.n < 0 ? -1 : a.n > 0 ? 1 : 0);
export const abs = (a: Rational): Rational => rat(Math.abs(a.n), a.d);
export const toNumber = (a: Rational): number => a.n / a.d;

/** True when the value is also an exact, finite decimal (denominator made only of 2s and 5s): 3/8 = 0.375. */
export function isFiniteDecimal(a: Rational): boolean {
  let d = a.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}

/**
 * Reads what a child types into a box: "3", "−4", "+2", "1,5" or "1.5", "-3/4", "".
 * An empty box counts as 0. Returns null for anything else.
 */
export function parseRational(text: string): Rational | null {
  const t = text.trim().replace(/[−–]/g, "-").replace(/\s+/g, "");
  if (t === "") return ZERO;
  let m = /^([+-]?)(\d+)\/(\d+)$/.exec(t);
  if (m) {
    const den = Number(m[3]);
    if (den === 0) return null;
    return rat((m[1] === "-" ? -1 : 1) * Number(m[2]), den);
  }
  m = /^([+-]?)(\d*)(?:[.,](\d+))?$/.exec(t);
  if (!m || (m[2] === "" && m[3] === undefined)) return null;
  const decimals = m[3] ?? "";
  if (m[2]!.length + decimals.length > 12) return null; // keeps every step exact
  return rat((m[1] === "-" ? -1 : 1) * Number((m[2] || "0") + decimals), 10 ** decimals.length);
}
