import { compile } from "./evaluate";
import { ExpressionError } from "./errors";
import { parse } from "./parse";

/** Value of the expression at x (default 0). */
const at = (text: string, x = 0) => compile(text)(x);

/** The error thrown for `text`, so tests can check message and index. */
function errorFor(text: string): ExpressionError {
  try {
    parse(text);
  } catch (e) {
    if (e instanceof ExpressionError) return e;
    throw e;
  }
  throw new Error(`expected "${text}" to fail`);
}

describe("parse: precedence", () => {
  it("does × and ÷ before + and −", () => {
    expect(at("1 + 2 * 3")).toBe(7);
    expect(at("10 - 6 / 2")).toBe(7);
  });
  it("does powers before ×", () => {
    expect(at("2 * 3^2")).toBe(18);
  });
  it("respects brackets", () => {
    expect(at("(1 + 2) * 3")).toBe(9);
  });
  it("reads −x^2 as −(x^2), like maths does", () => {
    expect(parse("-x^2")).toEqual({ type: "neg", arg: { type: "binary", op: "^", left: { type: "var" }, right: { type: "num", value: 2 } } });
    expect(at("-2^2")).toBe(-4);
    expect(at("(-2)^2")).toBe(4);
  });
});

describe("parse: associativity", () => {
  it("groups − and ÷ from the left", () => {
    expect(at("10 - 3 - 2")).toBe(5);
    expect(at("8 / 4 / 2")).toBe(1);
  });
  it("groups ^ from the right", () => {
    expect(at("2^3^2")).toBe(512);
  });
});

describe("parse: unary signs", () => {
  it("handles repeated and mixed signs", () => {
    expect(at("--x", 3)).toBe(3);
    expect(at("+x", 3)).toBe(3);
    expect(at("2 - -1")).toBe(3);
  });
  it("allows a negative power", () => {
    expect(at("2^-1")).toBe(0.5);
  });
});

describe("parse: implicit multiplication", () => {
  it("reads 2x, 3(x + 1) and (x + 1)(x − 1)", () => {
    expect(at("2x", 5)).toBe(10);
    expect(at("3(x + 1)", 1)).toBe(6);
    expect(at("(x + 1)(x - 1)", 3)).toBe(8);
  });
  it("reads 2sin(x) and 2pi", () => {
    expect(at("2sin(x)", Math.PI / 2)).toBe(2);
    expect(at("2pi")).toBeCloseTo(2 * Math.PI);
  });
  it("treats 1/2x as (1/2)·x, left to right", () => {
    expect(at("1/2x", 4)).toBe(2);
  });
  it("binds tighter than a power on the right: 2x^2 = 2·(x^2)", () => {
    expect(at("2x^2", 3)).toBe(18);
  });
});

describe("parse: functions and constants", () => {
  it("knows every listed function", () => {
    expect(at("sin(0) + cos(0) + tan(0)")).toBe(1);
    expect(at("asin(1)")).toBeCloseTo(Math.PI / 2);
    expect(at("acos(1) + atan(0)")).toBe(0);
    expect(at("exp(1)")).toBeCloseTo(Math.E);
    expect(at("ln(e)")).toBe(1);
    expect(at("log(1000) + log10(100)")).toBe(5);
    expect(at("sqrt(16) + abs(-3)")).toBe(7);
  });
  it("nests functions", () => {
    expect(at("sqrt(abs(-16))")).toBe(4);
  });
  it("ignores spaces", () => {
    expect(at("  sin ( x )  ", 0)).toBe(0);
  });
});

describe("parse: errors point at the problem", () => {
  it("empty input", () => {
    expect(errorFor("   ").message).toContain("Type an expression");
  });
  it("unmatched brackets", () => {
    const open = errorFor("x^2 + (3x");
    expect(open.message).toBe('The "(" at position 7 is never closed');
    expect(open.index).toBe(6); // points at the "(" itself

    const e = errorFor("x + 1)");
    expect(e.message).toContain('Unexpected ")" at position 6');
    expect(e.index).toBe(5);
  });
  it("empty brackets", () => {
    expect(errorFor("sin()").message).toBe("Empty brackets at position 4");
  });
  it("a function without brackets", () => {
    expect(errorFor("sin x").message).toBe("sin needs brackets, like sin(x)");
  });
  it("an unknown name", () => {
    expect(errorFor("y + 1").message).toContain('Unknown name "y" at position 1');
  });
  it("two operators in a row", () => {
    expect(errorFor("x * / 2").message).toBe('Expected a number, x or "(" at position 5, not "/"');
  });
  it("a missing operator between numbers", () => {
    expect(errorFor("2 3").message).toBe('Missing an operator before "3" at position 3');
    expect(errorFor("x 2").message).toContain('Missing an operator before "2"');
  });
  it("ending too early", () => {
    expect(errorFor("x +").message).toContain("ends too early");
  });
});
