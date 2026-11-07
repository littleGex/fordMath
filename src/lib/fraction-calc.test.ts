import { fr, makeCalcQuestion, makeCalcRound, readFrac, resultOf, sameValue, simplify, toMixed, value, work, type CalcKind, type Frac } from "./fraction-calc";
import { seededRandom } from "./random";

const exact = (op: "+" | "-" | "*" | ":", a: Frac, b: Frac) =>
  op === "+" ? value(a) + value(b) : op === "-" ? value(a) - value(b) : op === "*" ? value(a) * value(b) : value(a) / value(b);

describe("Bruchrechnen", () => {
  it("adds with the Hauptnenner: 3/4 + 1/6 = 9/12 + 2/12 = 11/12", () => {
    const w = work("+", fr(3, 4), fr(1, 6));
    expect(w).toMatchObject({ common: 12, ka: 3, kb: 2, ea: fr(9, 12), eb: fr(2, 12), raw: fr(11, 12), result: fr(11, 12), by: 1 });
  });
  it("kürzt at the end: 1/6 + 1/3 = 3/6 = 1/2", () => {
    expect(work("+", fr(1, 6), fr(1, 3))).toMatchObject({ raw: fr(3, 6), result: fr(1, 2), by: 3 });
  });
  it("multiplies after kürzen über Kreuz: 4/9 · 3/8 = 1/3 · 1/2 = 1/6", () => {
    expect(work("*", fr(4, 9), fr(3, 8))).toMatchObject({ cross: [4, 3], ca: fr(1, 3), cb: fr(1, 2), raw: fr(1, 6), result: fr(1, 6) });
  });
  it("divides with the Kehrwert: 3/4 : 2/5 = 3/4 · 5/2 = 15/8", () => {
    const w = work(":", fr(3, 4), fr(2, 5));
    expect(w.op === ":" && w.flipped).toEqual(fr(5, 2));
    expect(resultOf(w)).toEqual(fr(15, 8));
  });
  it("mixed numbers both ways", () => {
    expect(toMixed(fr(15, 8))).toEqual({ whole: 1, part: fr(7, 8) });
    expect(toMixed(fr(6, 3))).toEqual({ whole: 2, part: fr(0, 1) });
    expect(readFrac("2 1/3")).toEqual(fr(7, 3));
    expect(readFrac("3/4")).toEqual(fr(3, 4));
    expect(readFrac("1,5")).toEqual(fr(15, 10));
    expect(readFrac("-1/2")).toEqual(fr(-1, 2));
    expect(readFrac("1/0")).toBeNull();
    expect(readFrac("abc")).toBeNull();
  });
  it("the working always gives the right value, gekürzt", () => {
    const r = seededRandom(35);
    for (let i = 0; i < 500; i++) {
      const a = fr(Math.floor(r() * 20) - 5, Math.floor(r() * 11) + 1);
      const b = fr(Math.floor(r() * 20) + 1, Math.floor(r() * 11) + 1);
      for (const op of ["+", "-", "*", ":"] as const) {
        const res = resultOf(work(op, a, b));
        expect(res.n / res.d).toBeCloseTo(exact(op, a, b), 9);
        expect(simplify(res).by).toBe(1);
      }
    }
  });
  it("every quiz question has exactly one right answer, and the mistakes are wrong", () => {
    const r = seededRandom(6);
    for (const kind of ["add", "sub", "mul", "div", "mixed"] as CalcKind[]) {
      for (let i = 0; i < 200; i++) {
        const q = makeCalcQuestion(kind, r);
        expect(q.choices).toHaveLength(4);
        const right = exact(q.op, q.a, q.b);
        expect(q.choices.filter((c) => Math.abs(value(c) - right) < 1e-12)).toHaveLength(1);
        expect(value(q.choices[q.answer]!)).toBeCloseTo(right, 12);
        for (const c of q.choices) {
          expect(c.n).toBeGreaterThan(0);
          expect(simplify(c).by).toBe(1);
        }
        q.choices.forEach((c, j) => q.choices.forEach((d, k) => j !== k && expect(sameValue(c, d)).toBe(false)));
      }
    }
  });
  it("a round has two of each kind", () => {
    const round = makeCalcRound(seededRandom(1));
    expect(round).toHaveLength(10);
    for (const kind of ["add", "sub", "mul", "div", "mixed"]) expect(round.filter((q) => q.kind === kind)).toHaveLength(2);
  });
});
