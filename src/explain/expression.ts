import { evaluate, formatExpr, parse, type Expr } from "../lib/expression";
import { prettyNumber as n } from "../parse";
import type { ExplainSection } from "./types";

const MAX_STEPS = 14;
const OP_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" } as const;

/** A value, bracketed when negative so "3 × (−2)" reads correctly. */
const v = (x: number): string => (Number.isNaN(x) ? "undefined" : x < 0 ? `(${n(x)})` : n(x));

/**
 * Walks the tree children-first (post-order). That order is exactly
 * "brackets and functions, then powers, then × ÷, then + −", so each step
 * only uses values already worked out.
 */
function collectSteps(e: Expr, x: number, out: string[]): number {
  switch (e.type) {
    case "num":
      return e.value;
    case "var":
      return x;
    case "const":
      return evaluate(e, x);
    case "neg": {
      const a = collectSteps(e.arg, x, out);
      const r = -a;
      if (e.arg.type !== "num") out.push(`${formatExpr(e)} = −${v(a)} = ${n(r)}`);
      return r;
    }
    case "call": {
      const a = collectSteps(e.arg, x, out);
      const r = evaluate(e, x);
      out.push(`${formatExpr(e)} = ${e.fn}(${n(a)}) = ${describe(r)}`);
      return r;
    }
    case "binary": {
      const l = collectSteps(e.left, x, out);
      const r = collectSteps(e.right, x, out);
      const result = evaluate(e, x);
      out.push(`${formatExpr(e)} = ${v(l)} ${OP_SYMBOL[e.op]} ${v(r)} = ${describe(result)}`);
      return result;
    }
  }
}

function describe(r: number): string {
  if (Number.isNaN(r)) return "undefined (not a real number)";
  if (r === Infinity || r === -Infinity) return `${r > 0 ? "" : "−"}∞ (division by zero or overflow)`;
  return n(r);
}

/** How the text was read, and f(x) worked out step by step for one x. */
export function explainExpression(text: string, x: number): ExplainSection[] {
  const tree = parse(text);
  const read = formatExpr(tree);
  const steps: string[] = [];
  const result = collectSteps(tree, x, steps);

  const reading = [`Read as: f(x) = ${read}`];
  if (/·/.test(read)) reading.push("A · marks a multiplication you typed without a sign, like 2x or 3(x + 1).");
  if (read !== text.replace(/\s+/g, " ").trim()) {
    reading.push("Brackets that don't change the answer are left out, and ones that do are kept.");
  }

  const working = [
    `Put x = ${n(x)} in, then work from the inside out: brackets and functions first, then powers, then × and ÷, then + and −.`,
  ];
  if (steps.length === 0) {
    working.push(`There's nothing to work out: f(${n(x)}) = ${describe(result)}`);
  } else if (steps.length > MAX_STEPS) {
    working.push(...steps.slice(0, MAX_STEPS - 1), `… ${steps.length - MAX_STEPS + 1} more steps …`, steps[steps.length - 1]!);
  } else {
    working.push(...steps);
  }
  working.push(`So f(${n(x)}) = ${describe(result)}`);

  return [
    { title: "How it was read", steps: reading },
    { title: `Working out f(${n(x)})`, steps: working },
  ];
}
