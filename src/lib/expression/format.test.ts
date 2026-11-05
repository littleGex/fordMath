import { evaluate } from "./evaluate";
import { formatExpr } from "./format";
import { parse } from "./parse";

const show = (text: string) => formatExpr(parse(text));

describe("formatExpr", () => {
  it("shows how the input was understood", () => {
    expect(show("x^2+3sin(x)")).toBe("x^2 + 3·sin(x)");
    expect(show("2*x - pi")).toBe("2 · x − π");
  });
  it("drops brackets that change nothing", () => {
    expect(show("((x)) + (2*3)")).toBe("x + 2 · 3");
  });
  it("keeps brackets that matter", () => {
    expect(show("(1 + 2) * 3")).toBe("(1 + 2) · 3");
    expect(show("10 - (3 - 2)")).toBe("10 − (3 − 2)");
    expect(show("(2^3)^2")).toBe("(2^3)^2");
    expect(show("(-x)^2")).toBe("(−x)^2");
  });
  it("shows −x^2 without brackets, because that's how it was read", () => {
    expect(show("-x^2")).toBe("−x^2");
  });
  it("makes implicit multiplication visible", () => {
    expect(show("(x+1)(x-1)")).toBe("(x + 1)·(x − 1)");
  });
});

describe("formatExpr round trip", () => {
  const samples = ["x^2 - 4x + 4", "-x^2", "2^3^2", "1/2x", "10 - 3 - 2", "(x+1)(x-1)/(x+2)", "e^(-x^2)", "-(x - 1)^3", "sqrt(abs(sin(x)))"];
  it.each(samples)("reading the formatted %s back gives the same values", (text) => {
    const original = parse(text);
    const again = parse(formatExpr(original));
    for (const x of [-2.5, -1, 0.5, 3]) {
      expect(evaluate(again, x)).toBeCloseTo(evaluate(original, x), 12);
    }
  });
});
