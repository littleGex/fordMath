import { randomInt, type Random } from "./random";
import { add, div, equals, isZero, mul, rat, sub, type Rational } from "./rational";

/** One equation a·x + b·y = c. */
export interface Equation {
  a: Rational;
  b: Rational;
  c: Rational;
}

export type Var = "x" | "y";

/**
 * What a system of two equations can have, like QuadraticRoots:
 * - unique:   the lines cross at one point
 * - none:     parallel lines, or an equation like 0 = 5 that can never be true
 * - infinite: the same line twice (or one equation is 0 = 0): every point on `line` works
 * - all:      both equations are 0 = 0, so every pair (x | y) works
 */
export type SystemSolution =
  | { kind: "unique"; x: Rational; y: Rational }
  | { kind: "none"; why: "parallel" | "contradiction" }
  | { kind: "infinite"; line: Equation }
  | { kind: "all" };

export const eq = (a: number | Rational, b: number | Rational, c: number | Rational): Equation => {
  const r = (v: number | Rational) => (typeof v === "number" ? rat(v) : v);
  return { a: r(a), b: r(b), c: r(c) };
};

export const coef = (e: Equation, v: Var): Rational => (v === "x" ? e.a : e.b);
export const other = (v: Var): Var => (v === "x" ? "y" : "x");

/** An equation with no x and no y: 0 = c. */
export const isEmpty = (e: Equation): boolean => isZero(e.a) && isZero(e.b);

/** Does (x | y) make the equation true? */
export const satisfies = (e: Equation, x: Rational, y: Rational): boolean => equals(add(mul(e.a, x), mul(e.b, y)), e.c);

export function solveSystem(e1: Equation, e2: Equation): SystemSolution {
  const det = sub(mul(e1.a, e2.b), mul(e2.a, e1.b));
  if (!isZero(det)) {
    // Cramer's rule; exact, because Rational never rounds.
    return {
      kind: "unique",
      x: div(sub(mul(e1.c, e2.b), mul(e2.c, e1.b)), det),
      y: div(sub(mul(e1.a, e2.c), mul(e2.a, e1.c)), det),
    };
  }
  const empty1 = isEmpty(e1);
  const empty2 = isEmpty(e2);
  if ((empty1 && !isZero(e1.c)) || (empty2 && !isZero(e2.c))) return { kind: "none", why: "contradiction" };
  if (empty1 && empty2) return { kind: "all" };
  if (empty1) return { kind: "infinite", line: e2 };
  if (empty2) return { kind: "infinite", line: e1 };
  // Same direction (det = 0). The same line if the c's are in the same ratio as the a's and b's.
  const sameLine = isZero(sub(mul(e1.a, e2.c), mul(e2.a, e1.c))) && isZero(sub(mul(e1.b, e2.c), mul(e2.b, e1.c)));
  return sameLine ? { kind: "infinite", line: e1 } : { kind: "none", why: "parallel" };
}

/**
 * A practice system with whole-number coefficients and a whole-number solution, like in the book.
 * Every coefficient is from −5 to 5 and not 0, and the two lines always cross.
 */
export function makeSystem(random: Random): { e1: Equation; e2: Equation; x: number; y: number } {
  const coefficient = () => (random() < 0.5 ? -1 : 1) * randomInt(random, 1, 5);
  for (;;) {
    const x = randomInt(random, -6, 6);
    const y = randomInt(random, -6, 6);
    const [a1, b1, a2, b2] = [coefficient(), coefficient(), coefficient(), coefficient()];
    if (a1 * b2 - a2 * b1 === 0) continue;
    return { e1: eq(a1, b1, a1 * x + b1 * y), e2: eq(a2, b2, a2 * x + b2 * y), x, y };
  }
}
