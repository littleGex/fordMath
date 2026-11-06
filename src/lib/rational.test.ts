import { add, div, equals, isFiniteDecimal, mul, neg, parseRational, rat, sub, toNumber } from "./rational";

describe("Rational", () => {
  it("is always in lowest terms with the sign on top", () => {
    expect(rat(6, 8)).toEqual({ n: 3, d: 4 });
    expect(rat(3, -6)).toEqual({ n: -1, d: 2 });
    expect(rat(0, -5)).toEqual({ n: 0, d: 1 });
    expect(Object.is(rat(0, -5).n, 0)).toBe(true);
  });
  it("adds, subtracts, multiplies and divides exactly", () => {
    expect(add(rat(1, 3), rat(1, 6))).toEqual(rat(1, 2));
    expect(sub(rat(1, 10), rat(3, 10))).toEqual(rat(-1, 5));
    expect(mul(rat(-2, 3), rat(9, 4))).toEqual(rat(-3, 2));
    expect(div(rat(1, 2), rat(-1, 4))).toEqual(rat(-2));
    expect(neg(rat(5))).toEqual(rat(-5));
    expect(add(rat(1, 10), rat(2, 10))).toEqual(rat(3, 10)); // 0.1 + 0.2 is exactly 0.3 here
  });
  it("refuses division by zero", () => {
    expect(() => rat(1, 0)).toThrow("Division by zero");
    expect(() => div(rat(1), rat(0))).toThrow("Division by zero");
  });
  it("compares and converts", () => {
    expect(equals(rat(2, 4), rat(1, 2))).toBe(true);
    expect(toNumber(rat(3, 8))).toBe(0.375);
    expect(isFiniteDecimal(rat(3, 8))).toBe(true);
    expect(isFiniteDecimal(rat(1, 3))).toBe(false);
  });
});

describe("parseRational", () => {
  it.each([
    ["3", rat(3)], ["−4", rat(-4)], ["+2", rat(2)], ["1,5", rat(3, 2)], ["-0.25", rat(-1, 4)],
    [",5", rat(1, 2)], ["-3/4", rat(-3, 4)], ["6/8", rat(3, 4)], ["", rat(0)], ["  7 ", rat(7)],
  ])("reads %j", (text, value) => {
    expect(parseRational(text)).toEqual(value);
  });
  it.each(["x", "1/0", "1,2,3", "-", "+", "2/", "1e5", "1234567890123"])("rejects %j", (text) => {
    expect(parseRational(text)).toBeNull();
  });
});
