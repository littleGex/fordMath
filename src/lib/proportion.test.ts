import { answer, classify, makeProportionQuestion, makeProportionRound, perOne, STORIES, yFor, type Row } from "./proportion";
import { seededRandom } from "./random";
import { div, mul, rat } from "./rational";

const rows = (...pairs: Array<[number, number]>): Row[] => pairs.map(([x, y]) => [rat(x), rat(y)] as const);

describe("Zuordnungen", () => {
  it("tells proportional, antiproportional and neither apart", () => {
    expect(classify(rows([1, 3], [2, 6], [5, 15]))).toBe("proportional");
    expect(classify(rows([2, 12], [3, 8], [6, 4]))).toBe("inverse");
    // A taxi: 3 € to get in plus 2 € per km grows, but isn't proportional.
    expect(classify(rows([1, 5], [2, 7], [3, 9]))).toBe("neither");
  });
  it("works with decimals exactly", () => {
    expect(classify([[rat(3), rat(9, 2)], [rat(5), rat(15, 2)]])).toBe("proportional");
  });
  it("refuses tables it can't judge", () => {
    expect(() => classify(rows([1, 2]))).toThrow();
    expect(() => classify(rows([0, 2], [1, 3]))).toThrow();
  });
  it("fills in a missing value", () => {
    expect(yFor("proportional", [rat(3), rat(9, 2)], rat(5))).toEqual(rat(15, 2));
    expect(yFor("inverse", [rat(4), rat(6)], rat(3))).toEqual(rat(8));
  });
  it("does the Dreisatz both ways", () => {
    // 3 kg Äpfel kosten 4,50 €: 1 kg 1,50 €, 5 kg 7,50 €
    const apples = { kind: "proportional" as const, a: rat(3), b: rat(9, 2), c: rat(5) };
    expect(perOne(apples)).toEqual(rat(3, 2));
    expect(answer(apples)).toEqual(rat(15, 2));
    // 4 Pumpen brauchen 6 Stunden: 1 Pumpe 24 Stunden, 3 Pumpen 8 Stunden
    const pumps = { kind: "inverse" as const, a: rat(4), b: rat(6), c: rat(3) };
    expect(perOne(pumps)).toEqual(rat(24));
    expect(answer(pumps)).toEqual(rat(8));
  });
  it("every quiz question has exactly one right answer", () => {
    const r = seededRandom(33);
    for (let i = 0; i < 600; i++) {
      const q = makeProportionQuestion(r);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      if (q.kind === "classify") {
        expect(classify(q.xs.map((x, k) => [rat(x), rat(q.ys[k]!)] as const))).toBe(q.choices[q.answer]);
        continue;
      }
      expect(q.choices).toHaveLength(4);
      for (const c of q.choices) expect(Number(c)).toBeGreaterThan(0);
      if (q.kind === "story") {
        const right = answer({ kind: STORIES[q.story], a: rat(q.a), b: rat(Math.round(q.b * 100), 100), c: rat(q.c) });
        expect(Number(q.choices[q.answer])).toBeCloseTo(right.n / right.d, 9);
        expect(right.d === 1 || [2, 4, 5, 10, 20, 25, 50, 100].includes(right.d)).toBe(true);
      } else {
        const known = q.ys.findIndex((y) => y !== null);
        const missing = q.ys.indexOf(null);
        const right = yFor(q.relation, [rat(q.xs[known]!), rat(q.ys[known]!)], rat(q.xs[missing]!));
        expect(Number(q.choices[q.answer])).toBe(right.n / right.d);
        // and the table really is that kind
        const full = q.xs.map((x, k) => [rat(x), k === missing ? right : rat(q.ys[k]!)] as const);
        expect(classify(full)).toBe(q.relation);
      }
    }
  });
  it("a round has 10 questions, with all three kinds of table to sort", () => {
    const round = makeProportionRound(seededRandom(7));
    expect(round).toHaveLength(10);
    const sorts = round.flatMap((q) => (q.kind === "classify" ? [q.relation] : []));
    expect(new Set(sorts)).toEqual(new Set(["proportional", "inverse", "neither"]));
  });
  it("inverse stories keep the product the same", () => {
    const r = seededRandom(1);
    for (let i = 0; i < 200; i++) {
      const q = makeProportionQuestion(r, "story");
      if (q.kind !== "story" || STORIES[q.story] !== "inverse") continue;
      const right = Number(q.choices[q.answer]);
      expect(q.a * q.b).toBeCloseTo(q.c * right, 9);
      expect(div(mul(rat(q.a), rat(q.b)), rat(q.c)).d).toBe(1);
    }
  });
});
