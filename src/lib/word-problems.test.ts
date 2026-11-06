import { compare, toNumber } from "./decimal";
import { evaluate, parse } from "./expression";
import { seededRandom } from "./random";
import { TEMPLATES, checkNumbers, makeProblem, makeProblemRound, templatesFor, type TemplateId } from "./word-problems";

const value = (calc: string) => evaluate(parse(calc), 0);

describe("every kind of story", () => {
  it.each(Object.keys(TEMPLATES) as TemplateId[])("%s: the calculation gives the answer, and the wrong ones don't", (id) => {
    const r = seededRandom(id.length * 13);
    for (let i = 0; i < 300; i++) {
      const p = makeProblem(id, r);
      expect(value(p.calc)).toBeCloseTo(toNumber(p.answer), 9);
      expect(p.answer.n).toBeGreaterThan(0);
      expect(compare(p.answer, p.wrongAnswer)).not.toBe(0);
      expect(p.wrongCalcs.length).toBeGreaterThanOrEqual(2);
      const values = [value(p.calc), ...p.wrongCalcs.map(value)];
      for (let a = 0; a < values.length; a++) for (let b = a + 1; b < values.length; b++) expect(Math.abs(values[a]! - values[b]!)).toBeGreaterThan(1e-9);
      // At least one number in the story isn't needed, and every needed one is in the story.
      expect(Object.keys(p.n).length).toBeGreaterThan(p.needed.length);
      for (const k of p.needed) expect(p.n[k]).toBeDefined();
      // Every needed number appears in the calculation.
      for (const k of p.needed) expect(p.calc).toContain(p.n[k]!.places ? toNumber(p.n[k]!).toFixed(p.n[k]!.places) : String(p.n[k]!.n));
    }
  });
});

describe("levels and rounds", () => {
  it("Grundschule stays whole and up to 1 000", () => {
    const r = seededRandom(3);
    for (const id of templatesFor("grundschule")) {
      for (let i = 0; i < 200; i++) {
        const p = makeProblem(id, r);
        for (const d of [...Object.values(p.n), p.answer]) {
          expect(d.places).toBe(0);
          expect(d.n).toBeLessThanOrEqual(1000);
        }
      }
    }
  });
  it("a round has five different kinds", () => {
    const round = makeProblemRound("sek1", seededRandom(1), 4);
    expect(new Set(round.map((p) => p.template)).size).toBe(4);
    expect(round.every((p) => p.level === "sek1")).toBe(true);
  });
});

describe("checkNumbers", () => {
  it("names what's missing and what's extra", () => {
    const p = makeProblem("change", seededRandom(2));
    expect(checkNumbers(p, ["a", "b", "c"]).ok).toBe(true);
    expect(checkNumbers(p, ["c", "a", "b"]).ok).toBe(true);
    expect(checkNumbers(p, ["a", "c", "age"])).toEqual({ missing: ["b"], extra: ["age"], ok: false });
  });
});
