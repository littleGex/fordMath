import { compile, evaluate } from "./evaluate";
import { parse } from "./parse";

describe("evaluate", () => {
  it("evaluates the same tree at many x values", () => {
    const tree = parse("x^2 - 4");
    expect([-2, 0, 3].map((x) => evaluate(tree, x))).toEqual([0, -4, 5]);
  });
  it("follows JavaScript number rules at the edges", () => {
    expect(compile("1/x")(0)).toBe(Infinity);
    expect(compile("sqrt(x)")(-1)).toBeNaN();
    expect(compile("ln(x)")(0)).toBe(-Infinity);
  });
  it("works with floats", () => {
    expect(compile("0.1x + 0.2")(1)).toBeCloseTo(0.3);
  });
});

describe("compile", () => {
  it("returns a reusable function", () => {
    const f = compile("x^2 + 3sin(x)");
    expect(f(0)).toBe(0);
    expect(f(2)).toBeCloseTo(4 + 3 * Math.sin(2));
  });
  it("throws for bad input when compiling, not when called", () => {
    expect(() => compile("x +")).toThrow();
  });
});

describe("safety: input is never run as code", () => {
  it.each(["alert(1)", "constructor", "toString(x)", "valueOf(x)", "__proto__", "window", "x.constructor", "process"])(
    "rejects %s",
    (text) => {
      expect(() => compile(text)).toThrow();
    },
  );
});
