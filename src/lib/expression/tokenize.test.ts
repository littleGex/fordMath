import { ExpressionError } from "./errors";
import { tokenize, type Token } from "./tokenize";

/** Drops positions so tests can compare just the meaning. */
const kinds = (text: string) =>
  tokenize(text).map((t: Token) =>
    t.kind === "number" ? t.value : t.kind === "name" ? t.name : t.kind === "op" ? t.op : t.kind,
  );

describe("tokenize", () => {
  it("reads numbers: ints, floats, leading dot, exponents", () => {
    expect(kinds("12 3.5 .5 1e3 2.5E-2")).toEqual([12, 3.5, 0.5, 1000, 0.025, "end"]);
  });
  it("reads 2e as 2 then the constant e", () => {
    expect(kinds("2e")).toEqual([2, "e", "end"]);
  });
  it("reads names in lower case (phones like to capitalise)", () => {
    expect(kinds("Sin(X)")).toEqual(["sin", "(", "x", ")", "end"]);
  });
  it("keeps digits that are part of a name", () => {
    expect(kinds("log10(x)")).toEqual(["log10", "(", "x", ")", "end"]);
  });
  it("accepts operator look-alikes", () => {
    expect(kinds("a × b ÷ c · d − e ** f")).toEqual(["a", "*", "b", "/", "c", "*", "d", "-", "e", "^", "f", "end"]);
  });
  it("reads : as division, as in German schools", () => {
    expect(kinds("12 : 3")).toEqual([12, "/", 3, "end"]);
  });
  it("reads x² and x³ as powers", () => {
    expect(kinds("x²+x³")).toEqual(["x", "^", 2, "+", "x", "^", 3, "end"]);
  });
  it("reads π as pi", () => {
    expect(kinds("2π")).toEqual([2, "pi", "end"]);
  });
  it("records where each token starts", () => {
    expect(tokenize("x + 10").map((t) => t.pos)).toEqual([0, 2, 4, 6]);
  });
  it("rejects unknown characters with their position", () => {
    expect(() => tokenize("x + $")).toThrow('Unexpected "$" at position 5');
    try {
      tokenize("x_1");
    } catch (e) {
      expect(e).toBeInstanceOf(ExpressionError);
      expect((e as ExpressionError).index).toBe(1);
    }
  });
});
