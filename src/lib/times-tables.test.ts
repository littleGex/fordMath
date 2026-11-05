import { seededRandom } from "./random";
import {
  answerOf, isCorrect, makeRound, questionsFor, record, starsFor, strategyFor, trickyPool, weightOf,
  type Mastery, type Question,
} from "./times-tables";

describe("questionsFor", () => {
  it("makes 1·7 … 10·7 for the 7 times table", () => {
    const qs = questionsFor([7], "multiply");
    expect(qs).toHaveLength(10);
    expect(qs.map(answerOf)).toEqual([7, 14, 21, 28, 35, 42, 49, 56, 63, 70]);
  });
  it("makes division facts with whole answers", () => {
    const qs = questionsFor([8], "divide");
    expect(qs).toHaveLength(10);
    for (const q of qs) {
      if (q.kind !== "divide") throw new Error("expected division");
      expect(q.divisor).toBe(8);
      expect(Number.isInteger(answerOf(q))).toBe(true);
    }
    expect(qs.map(answerOf)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it("mixes both, and ignores a table chosen twice", () => {
    expect(questionsFor([3, 3, 4], "mixed")).toHaveLength(40);
  });
  it("rejects no tables and impossible tables", () => {
    expect(() => questionsFor([], "mixed")).toThrow("at least one");
    expect(() => questionsFor([11], "mixed")).toThrow("11 isn't");
    expect(() => questionsFor([2.5], "mixed")).toThrow();
  });
});

describe("isCorrect", () => {
  it("checks the answer", () => {
    const q: Question = { kind: "multiply", a: 7, b: 8, key: "m:7x8" };
    expect(isCorrect(q, 56)).toBe(true);
    expect(isCorrect(q, 54)).toBe(false);
  });
});

describe("makeRound", () => {
  const pool = questionsFor([2, 3, 4], "mixed");

  it("gives 10 questions from the chosen tables, none repeated", () => {
    const round = makeRound(pool, {}, seededRandom(1));
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.key)).size).toBe(10);
    for (const q of round) expect(pool.some((p) => p.key === q.key)).toBe(true);
  });
  it("is the same for the same seed", () => {
    expect(makeRound(pool, {}, seededRandom(5))).toEqual(makeRound(pool, {}, seededRandom(5)));
  });
  it("sometimes shows a multiplication the other way round, with the same answer", () => {
    const round = makeRound(questionsFor([7], "multiply"), {}, seededRandom(2));
    expect(round.some((q) => q.kind === "multiply" && q.b !== 7)).toBe(true);
    for (const q of round) expect(answerOf(q) % 7).toBe(0);
  });
  it("repeats only when the pool is smaller than the round, never twice in a row", () => {
    const tiny = questionsFor([1], "multiply").slice(0, 3);
    const round = makeRound(tiny, {}, seededRandom(4));
    expect(round).toHaveLength(10);
    for (let i = 1; i < round.length; i++) expect(round[i]!.key).not.toBe(round[i - 1]!.key);
  });
  it("brings back facts that keep going wrong much more often", () => {
    const sevens = questionsFor([7], "multiply");
    const mastery: Mastery = Object.fromEntries(sevens.map((q) => [q.key, { box: 4, seen: 5, wrong: 0 }]));
    mastery["m:8x7"] = { box: 0, seen: 5, wrong: 4 };
    const r = seededRandom(11);
    let firsts = 0;
    for (let i = 0; i < 300; i++) if (makeRound(sevens, mastery, r, 1)[0]!.key === "m:8x7") firsts++;
    // weight 16 against nine facts of weight 1: about 16/25 of the time
    expect(firsts / 300).toBeGreaterThan(0.5);
  });
});

describe("record", () => {
  it("moves a fact up a box when right, back to 0 when wrong", () => {
    let m: Mastery = {};
    m = record(m, "m:7x8", true);
    expect(m["m:7x8"]).toEqual({ box: 3, seen: 1, wrong: 0 });
    m = record(m, "m:7x8", true);
    m = record(m, "m:7x8", true);
    expect(m["m:7x8"]!.box).toBe(4);
    m = record(m, "m:7x8", false);
    expect(m["m:7x8"]).toEqual({ box: 0, seen: 4, wrong: 1 });
  });
  it("doesn't change the object it was given", () => {
    const before: Mastery = { "m:2x2": { box: 2, seen: 1, wrong: 0 } };
    record(before, "m:2x2", false);
    expect(before["m:2x2"]!.box).toBe(2);
  });
});

describe("weightOf", () => {
  it("weights weak facts most and known facts least", () => {
    expect(weightOf({ box: 0, seen: 1, wrong: 1 })).toBe(16);
    expect(weightOf(undefined)).toBe(4);
    expect(weightOf({ box: 4, seen: 9, wrong: 0 })).toBe(1);
  });
});

describe("trickyPool", () => {
  it("keeps facts that went wrong and aren't learnt yet", () => {
    const pool = questionsFor([6], "multiply");
    const m: Mastery = {
      "m:7x6": { box: 0, seen: 2, wrong: 2 },
      "m:8x6": { box: 3, seen: 4, wrong: 1 }, // wrong once, but learnt since
      "m:9x6": { box: 1, seen: 1, wrong: 0 },
    };
    expect(trickyPool(pool, m).map((q) => q.key)).toEqual(["m:7x6"]);
  });
});

describe("starsFor", () => {
  it.each([[10, 3], [9, 2], [8, 2], [7, 1], [5, 1], [4, 0], [0, 0]] as const)("%i out of 10 gives %i stars", (right, stars) => {
    expect(starsFor(right, 10)).toBe(stars);
  });
});

describe("strategyFor", () => {
  it("uses the Kernaufgaben", () => {
    expect(strategyFor(7)).toEqual({ kind: "plus", first: 5, second: 2 });
    expect(strategyFor(4)).toEqual({ kind: "double", half: 2 });
    expect(strategyFor(9)).toEqual({ kind: "minus", from: 10, take: 1 });
    expect(strategyFor(5)).toEqual({ kind: "core" });
  });
  it("every strategy really gives the right answer", () => {
    for (let a = 1; a <= 10; a++) {
      for (let b = 1; b <= 10; b++) {
        const s = strategyFor(a);
        const value =
          s.kind === "plus" ? s.first * b + s.second * b
          : s.kind === "double" ? 2 * (s.half * b)
          : s.kind === "minus" ? s.from * b - s.take * b
          : a * b;
        expect(value).toBe(a * b);
      }
    }
  });
});
