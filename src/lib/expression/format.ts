import type { Expr } from "./ast";
import type { Operator } from "./tokenize";

/** Higher binds tighter. */
const PRECEDENCE: Record<Operator, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 4 };
const NEG = 3;
const ATOM = 5;
const SYMBOL: Record<Operator, string> = { "+": "+", "-": "−", "*": "·", "/": "/", "^": "^" };

function precedenceOf(e: Expr): number {
  if (e.type === "binary") return PRECEDENCE[e.op];
  if (e.type === "neg") return NEG;
  return ATOM;
}

function wrap(text: string, needed: boolean): string {
  return needed ? `(${text})` : text;
}

/**
 * Writes a tree back as text, with only the brackets it needs: what the parser
 * understood. Typing the result in again gives the same tree's values.
 */
export function formatExpr(e: Expr): string {
  switch (e.type) {
    case "num":
      return String(e.value);
    case "var":
      return "x";
    case "const":
      return e.name === "pi" ? "π" : "e";
    case "neg":
      return `−${wrap(formatExpr(e.arg), precedenceOf(e.arg) < NEG)}`;
    case "call":
      return `${e.fn}(${formatExpr(e.arg)})`;
    case "binary": {
      const p = PRECEDENCE[e.op];
      const rightAssoc = e.op === "^";
      // Equal precedence needs brackets on the side the operator doesn't group from:
      // a − (b − c) on the right for − and /, (a^b)^c on the left for ^.
      const left = wrap(formatExpr(e.left), precedenceOf(e.left) < p || (rightAssoc && precedenceOf(e.left) === p));
      const right = wrap(formatExpr(e.right), precedenceOf(e.right) < p || (!rightAssoc && precedenceOf(e.right) === p));
      if (e.op === "^") return `${left}^${right}`;
      // Typed as 3sin(x): keep it tight, but show the · so the multiplication is visible.
      if (e.implicit) return `${left}·${right}`;
      return `${left} ${SYMBOL[e.op]} ${right}`;
    }
  }
}
