/**
 * What went wrong, as data. The English message is built here; the page can say the same thing in
 * another language from these details (see explain/expression.ts). `at` is the 1-based position.
 */
export type ExpressionProblem =
  | { kind: "empty" }
  | { kind: "unexpectedChar"; ch: string; at: number }
  | { kind: "missingOperator"; before: string; at: number }
  | { kind: "needsBrackets"; name: string }
  | { kind: "unknownName"; name: string; at: number }
  | { kind: "unexpectedClose"; at: number }
  | { kind: "unmatchedClose"; at: number }
  | { kind: "expectedOperand"; op: string; at: number }
  | { kind: "endsEarly" }
  | { kind: "emptyBrackets"; at: number }
  | { kind: "neverClosed"; at: number }
  | { kind: "unexpectedInput"; at: number };

/** A problem in the typed expression. `index` is the 0-based character position, for pointing at it. */
export class ExpressionError extends Error {
  constructor(
    message: string,
    public readonly index: number,
    public readonly problem: ExpressionProblem,
  ) {
    super(message);
    this.name = "ExpressionError";
  }
}
