import { solveQuadratic, type Complex, type QuadraticRoots, type QuadraticSolution } from "../lib";
import { prettyNumber as n } from "../parse";
import type { ExplainSection } from "./types";

/** Wraps negatives in brackets, for substituting into a formula: (−5)². */
const p = (x: number): string => (x < 0 ? `(${n(x)})` : n(x));

/** "ax² + bx + c = 0" with the real numbers, skipping zero terms and 1s: x² − 5x + 6 = 0 */
export function formatEquation(a: number, b: number, c: number): string {
  const terms: string[] = [];
  for (const [coef, variable] of [[a, "x²"], [b, "x"], [c, ""]] as const) {
    if (coef === 0) continue;
    const size = Math.abs(coef) === 1 && variable ? "" : n(Math.abs(coef));
    const sign = coef < 0 ? (terms.length ? " − " : "−") : terms.length ? " + " : "";
    terms.push(sign + size + variable);
  }
  return `${terms.join("") || "0"} = 0`;
}

export function formatComplex({ re, im }: Complex): string {
  const imag = Math.abs(im) === 1 ? "i" : `${n(Math.abs(im))}i`;
  if (re === 0) return im < 0 ? `−${imag}` : imag;
  return `${n(re)} ${im < 0 ? "−" : "+"} ${imag}`;
}

/** Short answer for a results tile. */
export function formatRoots(roots: QuadraticRoots): string {
  switch (roots.kind) {
    case "two-real":
      return `x = ${n(roots.roots[0])} or x = ${n(roots.roots[1])}`;
    case "repeated":
      return `x = ${n(roots.root)} (twice)`;
    case "complex":
      return `x = ${formatComplex(roots.roots[0])} or ${formatComplex(roots.roots[1])}`;
    case "linear":
      return `x = ${n(roots.root)}`;
    case "no-solution":
      return "No solution";
    case "every-x":
      return "Every x works";
    default: {
      // If a new kind is added to QuadraticRoots and not handled above, this line stops compiling.
      const unreachable: never = roots;
      return unreachable;
    }
  }
}

/** (x − 3), (x + 2), or x for a root of 0. */
const factor = (r: number): string => (r === 0 ? "x" : r < 0 ? `(x + ${n(-r)})` : `(x − ${n(r)})`);
const leading = (a: number): string => (a === 1 ? "" : a === -1 ? "−" : n(a));

function solvingSteps(s: QuadraticSolution): string[] {
  const { a, b, c, roots } = s;

  if (a === 0) {
    const steps = ["a = 0, so there is no x² term. This is a straight line, not a quadratic."];
    if (roots.kind === "linear") {
      steps.push(
        `Solve ${formatEquation(0, b, c)}: move c to the other side to get ${n(b)}x = ${n(-c)}, then divide by ${p(b)}: x = ${n(roots.root)}`,
      );
    } else if (roots.kind === "no-solution") {
      steps.push(`With b = 0 too, the equation says ${n(c)} = 0, which is never true, so there is no solution.`);
    } else {
      steps.push("Every coefficient is 0, so the equation says 0 = 0, which is true for every x.");
    }
    return steps;
  }

  const D = s.discriminant!;
  const steps = [
    `Compare with ax² + bx + c = 0: a = ${n(a)}, b = ${n(b)}, c = ${n(c)}`,
    `Work out the discriminant: D = b² − 4ac = ${p(b)}² − 4 × ${p(a)} × ${p(c)} = ${n(b * b)} − ${p(4 * a * c)} = ${n(D)}`,
  ];

  if (roots.kind === "two-real") {
    const sqrtD = Math.sqrt(D);
    const root = Number.isInteger(sqrtD) ? n(sqrtD) : `√${n(D)}`;
    // Match the textbook "+" and "−" answers to the accurately computed roots.
    const naivePlus = (-b + sqrtD) / (2 * a);
    const [r1, r2] = roots.roots;
    const [plus, minus] = Math.abs(naivePlus - r1) < Math.abs(naivePlus - r2) ? [r1, r2] : [r2, r1];
    steps.push(
      "D is positive, so the graph crosses the x-axis at two points: there are two different roots.",
      `Use the quadratic formula: x = (−b ± √D) ÷ 2a = (${n(-b)} ± ${root}) ÷ ${p(2 * a)}` +
        (Number.isInteger(sqrtD) ? "" : ` = (${n(-b)} ± ${n(sqrtD)}) ÷ ${p(2 * a)}`),
      `Taking + gives x = ${n(plus)}; taking − gives x = ${n(minus)}`,
    );
    if (c !== 0 && b * b > 1e6 * Math.abs(4 * a * c)) {
      steps.push(
        "Because b² is much bigger than 4ac, −b and √D are almost equal, and subtracting nearly equal numbers on a computer loses accuracy. So the smaller root is worked out from x₁ × x₂ = c ÷ a instead.",
      );
    }
    steps.push(
      `Factorised: ${leading(a)}${factor(r1)}${factor(r2)} = 0`,
      `Check: the roots should add up to −b ÷ a = ${n(-b / a)} and multiply to c ÷ a = ${n(c / a)}. They do: ${n(r1)} + ${p(r2)} = ${n(r1 + r2)} and ${p(r1)} × ${p(r2)} = ${n(r1 * r2)}`,
    );
  } else if (roots.kind === "repeated") {
    steps.push(
      "D is zero, so the graph just touches the x-axis: there is one repeated root.",
      `With D = 0 the ± part disappears: x = −b ÷ 2a = ${n(-b)} ÷ ${p(2 * a)} = ${n(roots.root)}`,
      `Factorised: ${leading(a)}${factor(roots.root)}² = 0`,
    );
  } else if (roots.kind === "complex") {
    const im = Math.sqrt(-D);
    steps.push(
      "D is negative, so the graph never reaches the x-axis: there are no real roots.",
      `Square roots of negative numbers use i, where i² = −1: √D = √(${n(D)}) = ${n(im)}i`,
      `x = (−b ± √D) ÷ 2a = (${n(-b)} ± ${n(im)}i) ÷ ${p(2 * a)}, so x = ${formatComplex(roots.roots[0])} or x = ${formatComplex(roots.roots[1])}`,
      "These are complex numbers: a real part plus or minus an imaginary part. They always come as a pair like this.",
    );
  }
  return steps;
}

function graphSteps(s: QuadraticSolution): string[] {
  const { a, b, c } = s;
  if (!s.parabola) {
    return s.roots.kind === "linear"
      ? [`The graph y = ${formatEquation(0, b, c).replace(" = 0", "")} is a straight line with slope ${n(b)}, crossing the y-axis at y = ${n(c)}.`]
      : [`The graph is the flat line y = ${n(c)}.`];
  }
  const { vertex, opens } = s.parabola;
  const steps = [
    `The turning point (vertex) is at x = −b ÷ 2a = ${n(-b)} ÷ ${p(2 * a)} = ${n(vertex.x)}`,
    `Put that back in: y = ${n(a)} × ${p(vertex.x)}² + ${p(b)} × ${p(vertex.x)} + ${p(c)} = ${n(vertex.y)}, so the vertex is (${n(vertex.x)}, ${n(vertex.y)})`,
    `The graph is symmetric about the line x = ${n(vertex.x)}` +
      (s.roots.kind === "two-real" ? ", so the two roots are the same distance either side of it." : "."),
    opens === "up"
      ? `a is positive, so the parabola opens upwards (∪) and the vertex is its lowest point: y never goes below ${n(vertex.y)}.`
      : `a is negative, so the parabola opens downwards (∩) and the vertex is its highest point: y never goes above ${n(vertex.y)}.`,
    `It crosses the y-axis where x = 0, at y = c = ${n(c)}.`,
  ];
  return steps;
}

/** Step-by-step working for ax² + bx + c = 0, using the user's numbers. */
export function explainQuadratic(a: number, b: number, c: number): ExplainSection[] {
  const s = solveQuadratic(a, b, c);
  return [
    { title: "Solving it", steps: solvingSteps(s) },
    { title: "The graph", steps: graphSteps(s) },
  ];
}
