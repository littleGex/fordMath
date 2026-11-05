/** A complex number re + im·i. */
export interface Complex {
  re: number;
  im: number;
}

/**
 * Every possible answer to ax² + bx + c = 0.
 * A discriminated union: check `kind` and TypeScript knows which other fields exist.
 */
export type QuadraticRoots =
  | { kind: "two-real"; roots: [number, number] } // smallest first
  | { kind: "repeated"; root: number }
  | { kind: "complex"; roots: [Complex, Complex] } // re + im·i, then re − im·i
  | { kind: "linear"; root: number } // a = 0, b ≠ 0
  | { kind: "no-solution" } // a = b = 0, c ≠ 0
  | { kind: "every-x" }; // a = b = c = 0

export interface Parabola {
  /** Turning point (h, k). */
  vertex: { x: number; y: number };
  opens: "up" | "down";
  yIntercept: number;
}

export interface QuadraticSolution {
  a: number;
  b: number;
  c: number;
  /** b² − 4ac, or null when a = 0. */
  discriminant: number | null;
  roots: QuadraticRoots;
  /** null when a = 0 (the graph is a straight line). */
  parabola: Parabola | null;
}

/**
 * Relative size below which the discriminant counts as exactly 0.
 * Without it (x − 0.1)² = x² − 0.2x + 0.01 would report two roots, because
 * 0.2² is 0.04000000000000001 in floating point.
 */
const DISCRIMINANT_TOLERANCE = 1e-12;

/** Turns −0 into 0, so results print and compare cleanly. */
const clean = (n: number): number => n + 0;

export function assertCoefficients(a: number, b: number, c: number): void {
  for (const [name, v] of [["a", a], ["b", b], ["c", c]] as const) {
    if (!Number.isFinite(v)) throw new Error(`${name} must be a finite number`);
  }
}

/** @internal Assumes finite coefficients. */
export function discriminantUnchecked(a: number, b: number, c: number): number {
  const d = b * b - 4 * a * c;
  if (!Number.isFinite(d)) return d; // overflow: let the caller report it, don't snap Infinity to 0
  const scale = Math.max(b * b, Math.abs(4 * a * c));
  return Math.abs(d) <= DISCRIMINANT_TOLERANCE * scale ? 0 : d;
}

/** b² − 4ac: positive means two real roots, 0 means one repeated root, negative means complex roots. */
export function discriminant(a: number, b: number, c: number): number {
  assertCoefficients(a, b, c);
  return discriminantUnchecked(a, b, c);
}

/** f(x) = ax² + bx + c, using Horner's form (one fewer multiplication, slightly more accurate). */
export function evaluateQuadratic(a: number, b: number, c: number, x: number): number {
  return (a * x + b) * x + c;
}

function linearRoots(b: number, c: number): QuadraticRoots {
  if (b !== 0) return { kind: "linear", root: clean(-c / b) };
  return c !== 0 ? { kind: "no-solution" } : { kind: "every-x" };
}

/**
 * Solves ax² + bx + c = 0.
 *
 * Uses the numerically stable form of the quadratic formula:
 *   q = −½(b + sign(b)·√D),  x₁ = q / a,  x₂ = c / q
 * The textbook (−b ± √D) / 2a subtracts two nearly equal numbers when b² ≫ 4ac,
 * which loses most of the digits of the smaller root.
 */
export function solveQuadratic(a: number, b: number, c: number): QuadraticSolution {
  assertCoefficients(a, b, c);
  if (a === 0) {
    return { a, b, c, discriminant: null, roots: linearRoots(b, c), parabola: null };
  }

  const D = discriminantUnchecked(a, b, c);
  if (!Number.isFinite(D)) throw new Error("The coefficients are too large to square safely");

  let roots: QuadraticRoots;
  if (D > 0) {
    const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(D));
    const x1 = q / a;
    const x2 = c / q;
    roots = { kind: "two-real", roots: [clean(Math.min(x1, x2)), clean(Math.max(x1, x2))] };
  } else if (D === 0) {
    roots = { kind: "repeated", root: clean(-b / (2 * a)) };
  } else {
    const re = clean(-b / (2 * a));
    const im = Math.sqrt(-D) / (2 * Math.abs(a));
    roots = { kind: "complex", roots: [{ re, im }, { re, im: -im }] };
  }

  return {
    a, b, c,
    discriminant: D,
    roots,
    parabola: {
      vertex: { x: clean(-b / (2 * a)), y: clean(-D / (4 * a)) },
      opens: a > 0 ? "up" : "down",
      yIntercept: c,
    },
  };
}
