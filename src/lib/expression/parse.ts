import type { Expr } from "./ast";
import { isConstantName, isFunctionName } from "./builtins";
import { ExpressionError } from "./errors";
import { tokenize, type Token } from "./tokenize";

/**
 * Recursive-descent parser. Each method handles one precedence level and calls the
 * next tighter one, so precedence comes from the call order:
 *
 *   expression  :=  term (("+" | "−") term)*
 *   term        :=  unary (("×" | "÷") unary  |  implicit-× power)*
 *   unary       :=  "−" unary  |  "+" unary  |  power
 *   power       :=  primary ("^" unary)?                  ← right side recurses: 2^3^2 = 2^(3^2)
 *   primary     :=  number | x | pi | e | name "(" expression ")" | "(" expression ")"
 *
 * Because unary sits above power, −x^2 means −(x^2), as in maths.
 */
class Parser {
  private i = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  private peek(): Token {
    return this.tokens[this.i]!;
  }

  private next(): Token {
    return this.tokens[this.i++]!;
  }

  expression(): Expr {
    let left = this.term();
    for (;;) {
      const t = this.peek();
      if (t.kind !== "op" || (t.op !== "+" && t.op !== "-")) return left;
      this.next();
      left = { type: "binary", op: t.op, left, right: this.term() };
    }
  }

  private term(): Expr {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (t.kind === "op" && (t.op === "*" || t.op === "/")) {
        this.next();
        left = { type: "binary", op: t.op, left, right: this.unary() };
      } else if (t.kind === "name" || t.kind === "(") {
        // Implicit multiplication: 2x, 3(x + 1), (x + 1)(x − 1), 2sin(x).
        // Same precedence as ×, left to right, so 1/2x means (1/2)·x.
        left = { type: "binary", op: "*", left, right: this.power(), implicit: true };
      } else {
        return left;
      }
    }
  }

  private unary(): Expr {
    const t = this.peek();
    if (t.kind === "op" && (t.op === "-" || t.op === "+")) {
      this.next();
      const arg = this.unary();
      return t.op === "-" ? { type: "neg", arg } : arg;
    }
    return this.power();
  }

  private power(): Expr {
    const base = this.primary();
    const t = this.peek();
    if (t.kind === "op" && t.op === "^") {
      this.next();
      return { type: "binary", op: "^", left: base, right: this.unary() };
    }
    return base;
  }

  private primary(): Expr {
    const t = this.next();
    switch (t.kind) {
      case "number": {
        const after = this.peek();
        if (after.kind === "number") {
          throw new ExpressionError(`Missing an operator before "${after.text}" at position ${after.pos + 1}`, after.pos, { kind: "missingOperator", before: after.text, at: after.pos + 1 });
        }
        return { type: "num", value: t.value };
      }
      case "name": {
        if (t.name === "x") return { type: "var" };
        if (isConstantName(t.name)) return { type: "const", name: t.name };
        if (isFunctionName(t.name)) {
          const open = this.next();
          if (open.kind !== "(") {
            throw new ExpressionError(`${t.name} needs brackets, like ${t.name}(x)`, open.pos, { kind: "needsBrackets", name: t.name });
          }
          const arg = this.bracketed(open.pos);
          return { type: "call", fn: t.name, arg };
        }
        throw new ExpressionError(
          `Unknown name "${t.name}" at position ${t.pos + 1}. Use x for the variable, pi or e, or a function like sin(x).`,
          t.pos,
          { kind: "unknownName", name: t.name, at: t.pos + 1 },
        );
      }
      case "(":
        return this.bracketed(t.pos);
      case ")":
        throw new ExpressionError(`Unexpected ")" at position ${t.pos + 1}`, t.pos, { kind: "unexpectedClose", at: t.pos + 1 });
      case "op":
        throw new ExpressionError(`Expected a number, x or "(" at position ${t.pos + 1}, not "${t.op}"`, t.pos, { kind: "expectedOperand", op: t.op, at: t.pos + 1 });
      case "end":
        throw new ExpressionError("The expression ends too early: something is missing at the end", t.pos, { kind: "endsEarly" });
    }
  }

  /** Reads "expression )" after an opening bracket at `openPos`. */
  private bracketed(openPos: number): Expr {
    if (this.peek().kind === ")") {
      throw new ExpressionError(`Empty brackets at position ${openPos + 1}`, openPos, { kind: "emptyBrackets", at: openPos + 1 });
    }
    const inner = this.expression();
    const close = this.next();
    if (close.kind !== ")") {
      throw new ExpressionError(`The "(" at position ${openPos + 1} is never closed`, openPos, { kind: "neverClosed", at: openPos + 1 });
    }
    return inner.type === "binary" ? { ...inner, paren: true } : inner;
  }

  /** After a full expression there must be nothing left. */
  end(): void {
    const t = this.peek();
    if (t.kind === "end") return;
    if (t.kind === ")") throw new ExpressionError(`Unexpected ")" at position ${t.pos + 1}, with no "(" to match it`, t.pos, { kind: "unmatchedClose", at: t.pos + 1 });
    if (t.kind === "number") {
      throw new ExpressionError(`Missing an operator before "${t.text}" at position ${t.pos + 1}`, t.pos, { kind: "missingOperator", before: t.text, at: t.pos + 1 });
    }
    throw new ExpressionError(`Unexpected input at position ${t.pos + 1}`, t.pos, { kind: "unexpectedInput", at: t.pos + 1 });
  }
}

/** Parses text like "x^2 + 3sin(x)" into an expression tree. Throws ExpressionError with a position. */
export function parse(text: string): Expr {
  if (text.trim() === "") throw new ExpressionError("Type an expression, like x^2 + 1", 0, { kind: "empty" });
  const parser = new Parser(tokenize(text));
  const tree = parser.expression();
  parser.end();
  return tree;
}
