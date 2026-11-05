import { seededRandom } from "./random";
import {
  LEVELS, add, commonDenominator, compare, equals, expand, fraction, isSimplified, makeFractionRound, makeQuestion,
  simplify, toDecimal, toText, withDenominator, type Choice, type FractionQuestion,
} from "./fraction";

describe("fraction", () => {
  it("keeps the sign on top and rejects a 0 denominator", () => {
    expect(toText(fraction(3, -4))).toBe("-3/4");
    expect(() => fraction(1, 0)).toThrow("can't be 0");
    expect(() => fraction(1.5, 2)).toThrow("whole numbers");
  });
  it("is not simplified automatically", () => {
    expect(toText(fraction(2, 4))).toBe("2/4");
  });
});

describe("simplify, expand, equals", () => {
  it("simplifies as far as possible", () => {
    expect(toText(simplify(fraction(6, 8)))).toBe("3/4");
    expect(toText(simplify(fraction(12, 16)))).toBe("3/4");
    expect(toText(simplify(fraction(0, 5)))).toBe("0/1");
    expect(isSimplified(fraction(3, 4))).toBe(true);
    expect(isSimplified(fraction(6, 8))).toBe(false);
  });
  it("expands", () => {
    expect(toText(expand(fraction(1, 2), 3))).toBe("3/6");
  });
  it("sees the same amount written differently", () => {
    expect(equals(fraction(1, 2), fraction(3, 6))).toBe(true);
    expect(equals(fraction(1, 2), fraction(2, 3))).toBe(false);
  });
});

describe("compare and add", () => {
  it("compares", () => {
    expect(compare(fraction(2, 3), fraction(3, 4))).toBe(-1);
    expect(compare(fraction(2, 4), fraction(1, 2))).toBe(0);
    expect(compare(fraction(5, 6), fraction(4, 5))).toBe(1);
  });
  it("finds the common denominator", () => {
    expect(commonDenominator(fraction(1, 4), fraction(1, 6))).toBe(12);
    expect(toText(withDenominator(fraction(3, 4), 12))).toBe("9/12");
  });
  it("adds over the common denominator without simplifying", () => {
    expect(toText(add(fraction(1, 2), fraction(1, 4)))).toBe("3/4");
    expect(toText(add(fraction(1, 4), fraction(1, 4)))).toBe("2/4");
    expect(toText(add(fraction(1, 3), fraction(1, 2)))).toBe("5/6");
  });
  it("adds correctly for many random pairs", () => {
    const r = seededRandom(5);
    for (let i = 0; i < 300; i++) {
      const a = fraction(Math.floor(r() * 20), 1 + Math.floor(r() * 12));
      const b = fraction(Math.floor(r() * 20), 1 + Math.floor(r() * 12));
      expect(toDecimal(add(a, b))).toBeCloseTo(toDecimal(a) + toDecimal(b), 10);
    }
  });
});

/** True if the choice is a right answer for the question. */
function isRight(q: FractionQuestion, c: Choice): boolean {
  switch (q.kind) {
    case "name-picture": return c.kind === "fraction" && equals(c.value, q.shown);
    case "equivalent": return c.kind === "fraction" && equals(c.value, q.given);
    case "simplify": return c.kind === "fraction" && equals(c.value, q.given) && isSimplified(c.value);
    case "compare": {
      const cmp = compare(q.left, q.right);
      return cmp === 0 ? c.kind === "equal" : c.kind === "fraction" && c.value === (cmp === 1 ? q.left : q.right);
    }
    case "add-same":
    case "add-different": return c.kind === "fraction" && equals(c.value, add(q.left, q.right));
  }
}

describe("question generator", () => {
  it.each(LEVELS)("level %i always has exactly one right answer, at `answer`", (level) => {
    const r = seededRandom(100 + level);
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion(level, r);
      const right = q.choices.map((c) => isRight(q, c));
      expect(right.filter(Boolean)).toHaveLength(1);
      expect(right[q.answer]).toBe(true);
      const texts = q.choices.map((c) => (c.kind === "fraction" ? toText(c.value) : "="));
      expect(new Set(texts).size).toBe(texts.length); // no two choices look the same
      for (const c of q.choices) if (c.kind === "fraction") expect(c.value.num).toBeGreaterThan(0);
    }
  });
  it("keeps level 1 to friendly denominators and level 5/6 answers to at most one whole", () => {
    const r = seededRandom(3);
    for (let i = 0; i < 200; i++) {
      const q1 = makeQuestion(1, r);
      if (q1.kind === "name-picture") expect([2, 3, 4, 5, 6, 8]).toContain(q1.shown.den);
      for (const level of [5, 6] as const) {
        const q = makeQuestion(level, r);
        if (q.kind === "add-same" || q.kind === "add-different") expect(toDecimal(add(q.left, q.right))).toBeLessThanOrEqual(1);
      }
    }
  });
  it("makes the same round from the same seed", () => {
    expect(makeFractionRound(4, seededRandom(1))).toEqual(makeFractionRound(4, seededRandom(1)));
    expect(makeFractionRound(4, seededRandom(1))).toHaveLength(10);
  });
});
