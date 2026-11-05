/** A problem in the typed expression. `index` is the 0-based character position, for pointing at it. */
export class ExpressionError extends Error {
  constructor(
    message: string,
    public readonly index: number,
  ) {
    super(message);
    this.name = "ExpressionError";
  }
}
