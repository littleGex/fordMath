import type { Expr } from "./ast";
import { CONSTANTS, FUNCTIONS } from "./builtins";
import { parse } from "./parse";

/**
 * Works out the value of a tree at one x. Pure recursion over the union: the
 * `never` line makes the compiler complain if a new node type is added and forgotten.
 *
 * Follows JavaScript number rules: 1/0 is Infinity, sqrt(−1) and (−8)^(1/3) are NaN.
 * Callers decide what to do with those (Number.isFinite).
 */
export function evaluate(expr: Expr, x: number): number {
  switch (expr.type) {
    case "num":
      return expr.value;
    case "var":
      return x;
    case "const":
      return CONSTANTS[expr.name];
    case "neg":
      return -evaluate(expr.arg, x);
    case "call":
      return FUNCTIONS[expr.fn](evaluate(expr.arg, x));
    case "binary": {
      const l = evaluate(expr.left, x);
      const r = evaluate(expr.right, x);
      switch (expr.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return l / r;
        case "^": return l ** r;
      }
    }
    default: {
      const unreachable: never = expr;
      return unreachable;
    }
  }
}

/**
 * Parses once and returns a fast f(x). Safe: the text is never run as JavaScript,
 * so input like "alert(1)" or "constructor" is just an unknown name.
 */
export function compile(text: string): (x: number) => number {
  const tree = parse(text);
  return (x: number) => evaluate(tree, x);
}
