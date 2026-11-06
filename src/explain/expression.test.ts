import { ExpressionError, parse } from "../lib/expression";
import { explainExpression, problemText } from "./expression";

const section = (text: string, x: number, i: number) => explainExpression(text, x)[i]!.steps;

describe("explainExpression", () => {
  it("shows how the input was read", () => {
    expect(section("x^2+3sin(x)", 2, 0)[0]).toBe("Read as: f(x) = x^2 + 3·sin(x)");
  });
  it("works inside out in the order of operations", () => {
    expect(section("x^2 + 3sin(x)", 2, 1)).toEqual([
      "Put x = 2 in, then work from the inside out: brackets and functions first, then powers, then × and ÷, then + and −.",
      "x^2 = 2 ^ 2 = 4",
      "sin(x) = sin(2) = 0.909297",
      "3·sin(x) = 3 × 0.909297 = 2.727892",
      "x^2 + 3·sin(x) = 4 + 2.727892 = 6.727892",
      "So f(2) = 6.727892",
    ]);
  });
  it("brackets negative values", () => {
    expect(section("3x", -2, 1)[1]).toBe("3·x = 3 × (−2) = −6");
  });
  it("explains −x^2", () => {
    expect(section("-x^2", 3, 1).slice(1, 3)).toEqual(["x^2 = 3 ^ 2 = 9", "−x^2 = −9 = −9"]);
  });
  it("says when the answer isn't a real number", () => {
    expect(section("sqrt(x)", -4, 1).at(-1)).toBe("So f(−4) = undefined (not a real number)");
    expect(section("1/x", 0, 1).at(-1)).toContain("∞");
  });
  it("handles an expression with nothing to work out", () => {
    expect(section("x", 7, 1)[1]).toBe("There's nothing to work out: f(7) = 7");
  });
  it("shortens very long working", () => {
    const long = Array.from({ length: 20 }, () => "x").join(" + ");
    const steps = section(long, 1, 1);
    expect(steps.some((s) => s.includes("more steps"))).toBe(true);
    expect(steps.at(-1)).toBe("So f(1) = 20");
  });
});

describe("auf Deutsch", () => {
  it("works out f(x) with German signs and a decimal comma", () => {
    const [read, working] = explainExpression("x/4 - 1", 2, "de");
    expect(read!.steps[0]).toBe("Gelesen als: f(x) = x / 4 − 1");
    expect(working!.steps).toContain("x / 4 = 2 : 4 = 0,5");
    expect(working!.steps.at(-1)).toBe("Also ist f(2) = −0,5");
  });
  it("says every parse problem in German", () => {
    for (const text of ["", "x $", "2 3", "sin x", "y + 1", ")", "x + *", "x +", "()", "(x", "x)", "x 2"]) {
      try {
        parse(text);
        throw new Error(`"${text}" should not parse`);
      } catch (e) {
        if (!(e instanceof ExpressionError)) throw e;
        const de = problemText(e.problem, "de", e.message);
        expect(de).not.toBe(e.message);
        expect(de).not.toMatch(/undefined/);
        expect(problemText(e.problem, "en", e.message)).toBe(e.message);
      }
    }
  });
});
