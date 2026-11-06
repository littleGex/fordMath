import { SPLIT_LEVELS, blanks, makeSplitTask, placeParts, splitDivide, splitMultiply } from "./partly-written";
import { seededRandom } from "./random";

describe("splitting", () => {
  it("by place value, leaving out zeros", () => {
    expect(placeParts(46)).toEqual([40, 6]);
    expect(placeParts(128)).toEqual([100, 20, 8]);
    expect(placeParts(405)).toEqual([400, 5]);
    expect(() => placeParts(0)).toThrow();
  });
  it("7 · 46 = 7 · 40 + 7 · 6 = 280 + 42 = 322", () => {
    expect(splitMultiply(46, 7)).toEqual({ kind: "multiply", a: 46, b: 7, parts: [40, 6], products: [280, 42], result: 322 });
  });
  it("divides into easy multiples of the divisor", () => {
    expect(splitDivide(84, 4)).toMatchObject({ parts: [80, 4], quotients: [20, 1], rest: 0, result: 21 });
    expect(splitDivide(96, 4)).toMatchObject({ parts: [80, 16], quotients: [20, 4], rest: 0, result: 24 });
    expect(splitDivide(852, 6)).toMatchObject({ parts: [600, 240, 12], quotients: [100, 40, 2], result: 142 });
    expect(splitDivide(87, 4)).toMatchObject({ parts: [80, 4], quotients: [20, 1], rest: 3, result: 21 });
  });
  it("refuses nonsense", () => {
    expect(() => splitDivide(10, 1)).toThrow();
    expect(() => splitMultiply(10, 0)).toThrow();
  });
});

describe("tasks", () => {
  it.each(SPLIT_LEVELS)("level %i: the parts add up and the answers are right", (level) => {
    const r = seededRandom(level * 31);
    let rests = 0;
    for (let i = 0; i < 400; i++) {
      const t = makeSplitTask(level, r);
      expect(t.parts.length).toBeGreaterThanOrEqual(2);
      if (t.kind === "multiply") {
        expect(t.parts.reduce((s, p) => s + p, 0)).toBe(t.a);
        expect(t.result).toBe(t.a * t.b);
        expect(t.products.reduce((s, p) => s + p, 0)).toBe(t.result);
      } else {
        expect(t.parts.reduce((s, p) => s + p, 0) + t.rest).toBe(t.dividend);
        expect(t.result * t.divisor + t.rest).toBe(t.dividend);
        expect(t.rest).toBeLessThan(t.divisor);
        for (const [i, p] of t.parts.entries()) expect(p / t.divisor).toBe(t.quotients[i]);
        if (t.rest) rests++;
        expect(t.rest > 0).toBe(level === 3);
      }
      expect(blanks(t).every((n) => Number.isInteger(n) && n > 0)).toBe(true);
    }
    if (level === 3) expect(rests).toBeGreaterThan(0);
  });
});
