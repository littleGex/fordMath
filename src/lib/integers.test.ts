import { distanceFromZero, intAnswer, makeIntQuestion, makeIntRound, makeStory, move, opposite, storyMove } from "./integers";
import { seededRandom } from "./random";

describe("moves on the number line", () => {
  it.each([
    [-3, "+", 5, "plus-pos", 5, 2],
    [-3, "+", -5, "plus-neg", -5, -8],
    [4, "-", 6, "minus-pos", -6, -2],
    [4, "-", -3, "minus-neg", 3, 7],
    [-2, "-", -2, "minus-neg", 2, 0],
  ] as const)("%i %s %i", (a, op, b, rule, step, end) => {
    expect(move(a, op, b)).toMatchObject({ rule, step, end });
  });
  it("knows when it crosses zero", () => {
    expect(move(-3, "+", 5).crossesZero).toBe(true);
    expect(move(-3, "+", 3).crossesZero).toBe(false); // lands on 0
    expect(move(-3, "-", 2).crossesZero).toBe(false);
  });
  it("never gives −0", () => {
    expect(Object.is(move(2, "-", 2).end, 0)).toBe(true);
    expect(Object.is(opposite(0), 0)).toBe(true);
  });
  it("Gegenzahl and Betrag", () => {
    expect(opposite(-7)).toBe(7);
    expect(opposite(4)).toBe(-4);
    expect(distanceFromZero(-7)).toBe(7);
  });
  it("whole numbers only", () => {
    expect(() => move(1.5, "+", 1)).toThrow();
  });
});

describe("stories", () => {
  it("always cross zero or stay below it, and lifts stay in the building", () => {
    const r = seededRandom(22);
    for (let i = 0; i < 300; i++) {
      const s = makeStory(r);
      const m = storyMove(s);
      expect(m.start < 0 || m.end < 0).toBe(true);
      expect(m.step).toBe(s.change);
      if (s.kind === "lift") {
        expect(m.end).toBeGreaterThanOrEqual(-4);
        expect(m.end).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe("the quiz", () => {
  it("every question has exactly one right choice", () => {
    const r = seededRandom(6);
    for (let i = 0; i < 800; i++) {
      const q = makeIntQuestion(r);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.choices[q.answer]).toBe(intAnswer(q));
      expect(q.choices.filter((c) => c === intAnswer(q))).toHaveLength(1);
      for (const c of q.choices) expect(Object.is(c, -0)).toBe(false);
    }
  });
  it("compare questions are mostly two negatives", () => {
    const r = seededRandom(1);
    const qs = Array.from({ length: 400 }, () => makeIntQuestion(r)).filter((q) => q.kind === "compare");
    const bothNegative = qs.filter((q) => q.kind === "compare" && q.a < 0 && q.b < 0).length;
    expect(bothNegative / qs.length).toBeGreaterThan(0.5);
  });
  it("a round mixes the kinds", () => {
    expect(new Set(makeIntRound(seededRandom(3)).map((q) => q.kind)).size).toBeGreaterThanOrEqual(5);
  });
});
