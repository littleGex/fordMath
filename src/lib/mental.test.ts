import { seededRandom } from "./random";
import {
  LEARNT, MAX, MENTAL_LEVELS, answerOf, keyOf, makeQuestion, makeRound, planOf, recordAnswer, type MentalQuestion,
} from "./mental";

const many = (level: (typeof MENTAL_LEVELS)[number], n = 400, seed = level * 7): MentalQuestion[] => {
  const r = seededRandom(seed);
  return Array.from({ length: n }, () => makeQuestion(level, r));
};
const end = (q: MentalQuestion) => planOf(q).jumps.reduce((x, j) => x + j, planOf(q).start);

describe("every level", () => {
  it.each(MENTAL_LEVELS)("level %i: whole numbers from 0 to 1 000 that add up, and one answer", (level) => {
    for (const q of many(level)) {
      expect(q.op === "+" ? q.a + q.b : q.a - q.b).toBe(q.c);
      for (const v of [q.a, q.b, q.c]) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(MAX);
      }
      expect(q.b).toBeGreaterThan(0);
      expect(q.c).toBeGreaterThan(0);
      expect(q.level).toBe(level);
    }
  });
});

describe("what each level practises", () => {
  it("1: only whole tens or hundreds, without crossing a hundred for tens", () => {
    for (const q of many(1)) {
      expect(q.a % 10 + q.b % 10).toBe(0);
      if (q.b < 100) expect(Math.floor(q.a / 100)).toBe(Math.floor(q.c / 100));
    }
  });
  it("2: crosses a ten with a single digit", () => {
    for (const q of many(2)) {
      expect(q.b).toBeLessThan(10);
      expect(Math.floor(q.a / 10)).not.toBe(Math.floor(q.c / 10));
      expect(q.c % 10).not.toBe(0);
    }
  });
  it("3: two two-digit numbers, at most 100", () => {
    for (const q of many(3)) {
      expect(q.a).toBeLessThan(100);
      expect(q.b).toBeGreaterThanOrEqual(10);
      expect(q.b).toBeLessThan(100);
      expect(Math.max(q.a, q.c)).toBeLessThanOrEqual(100);
    }
  });
  it("4: crosses a hundred", () => {
    for (const q of many(4)) expect(Math.floor(q.a / 100)).not.toBe(Math.floor((q.c - (q.op === "-" ? 0 : 0)) / 100));
  });
  it("5: hides a or b, never the result", () => {
    const qs = many(5);
    for (const q of qs) expect(q.missing).not.toBe("c");
    expect(new Set(qs.map((q) => `${q.op}${q.missing}`)).size).toBeGreaterThanOrEqual(3);
  });
});

describe("planOf: the school strategy as jumps", () => {
  it("to the next ten first: 47 + 8 = 47 + 3 + 5", () => {
    expect(planOf({ level: 2, op: "+", a: 47, b: 8, c: 55, missing: "c" })).toEqual({ kind: "toTen", start: 47, jumps: [3, 5] });
    expect(planOf({ level: 2, op: "-", a: 63, b: 7, c: 56, missing: "c" })).toEqual({ kind: "toTen", start: 63, jumps: [-3, -4] });
  });
  it("step by step: 46 + 37 = 46 + 30 + 7", () => {
    expect(planOf({ level: 3, op: "+", a: 46, b: 37, c: 83, missing: "c" })).toEqual({ kind: "stepwise", start: 46, jumps: [30, 7] });
  });
  it("to the next hundred: 380 + 45 = 380 + 20 + 25, 512 − 36 = 512 − 12 − 24", () => {
    expect(planOf({ level: 4, op: "+", a: 380, b: 45, c: 425, missing: "c" }).jumps).toEqual([20, 25]);
    expect(planOf({ level: 4, op: "-", a: 512, b: 36, c: 476, missing: "c" }).jumps).toEqual([-12, -24]);
  });
  it("Ergänzen and the Umkehraufgabe", () => {
    expect(planOf({ level: 5, op: "+", a: 460, b: 40, c: 500, missing: "b" })).toEqual({ kind: "fill", start: 460, jumps: [40] });
    expect(planOf({ level: 5, op: "+", a: 347, b: 53, c: 400, missing: "b" })).toEqual({ kind: "fill", start: 347, jumps: [3, 50] });
    expect(planOf({ level: 5, op: "-", a: 100, b: 25, c: 75, missing: "a" })).toMatchObject({ kind: "reverse", start: 75 });
  });
  it.each(MENTAL_LEVELS)("level %i: the jumps always land on the answer", (level) => {
    for (const q of many(level)) {
      const p = planOf(q);
      if (p.kind === "fill") expect(p.jumps.reduce((x, j) => x + j, 0)).toBe(answerOf(q));
      else expect(end(q)).toBe(p.kind === "reverse" ? answerOf(q) : q.c);
      expect(p.jumps.length).toBeLessThanOrEqual(2);
      for (const j of p.jumps) expect(j).not.toBe(0);
    }
  });
  it("a first jump to a round number really lands on one", () => {
    for (const level of [2, 4] as const) {
      for (const q of many(level)) {
        const p = planOf(q);
        if (p.jumps.length === 2 && (p.kind === "toTen" || p.kind === "toHundred")) {
          expect((p.start + p.jumps[0]!) % (p.kind === "toTen" ? 10 : 100)).toBe(0);
        }
      }
    }
  });
});

describe("rounds and missed questions", () => {
  const q47: MentalQuestion = { level: 2, op: "+", a: 47, b: 8, c: 55, missing: "c" };
  it("ten different questions", () => {
    const round = makeRound(3, seededRandom(1));
    expect(round).toHaveLength(10);
    expect(new Set(round.map(keyOf)).size).toBe(10);
    expect(round.every((q) => q.level === 3)).toBe(true);
  });
  it("mixes the levels", () => {
    expect(new Set(makeRound("mixed", seededRandom(2), [], 40).map((q) => q.level)).size).toBe(5);
  });
  it("a missed question comes back, and leaves once it's learnt", () => {
    let retries = recordAnswer([], q47, false);
    expect(makeRound(2, seededRandom(3), retries).map(keyOf)).toContain(keyOf(q47));
    expect(makeRound(4, seededRandom(3), retries).map(keyOf)).not.toContain(keyOf(q47));
    for (let i = 0; i < LEARNT - 1; i++) {
      retries = recordAnswer(retries, q47, true);
      expect(retries).toHaveLength(1);
    }
    expect(recordAnswer(retries, q47, true)).toEqual([]);
  });
  it("wrong again goes back to box 0", () => {
    const once = recordAnswer(recordAnswer([], q47, false), q47, true);
    expect(recordAnswer(once, q47, false)).toEqual([{ q: q47, box: 0 }]);
  });
  it("a right answer to a new question changes nothing", () => {
    expect(recordAnswer([], q47, true)).toEqual([]);
  });
});
