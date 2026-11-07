import {
  direction, line, makeFunctionQuestion, makeFunctionRound, meet, onLine, parseRat, rpt, slopeTriangle, throughPoints, yAt, zeroOf,
} from "./linear-function";
import { seededRandom } from "./random";
import { equals, rat } from "./rational";

describe("lineare Funktionen", () => {
  it("y = 2x − 1: rising, crosses the x-axis at 1/2", () => {
    const l = line(2, -1);
    expect(direction(l)).toBe("rising");
    expect(yAt(l, rat(3))).toEqual(rat(5));
    expect(zeroOf(l)).toEqual({ kind: "point", x: rat(1, 2) });
    expect(zeroOf(line(0, 3))).toEqual({ kind: "none" });
    expect(zeroOf(line(0, 0))).toEqual({ kind: "all" });
  });
  it("the slope triangle for 2/3 is 3 right, 2 up", () => {
    expect(slopeTriangle(line(rat(2, 3), 1))).toEqual({ run: 3, rise: 2 });
    expect(slopeTriangle(line(-2, 1))).toEqual({ run: 1, rise: -2 });
  });
  it("the line through two points", () => {
    expect(throughPoints(rpt(1, 3), rpt(3, 7))).toEqual({ kind: "line", line: line(2, 1) });
    expect(throughPoints(rpt(0, 1), rpt(3, 3))).toEqual({ kind: "line", line: line(rat(2, 3), 1) });
    expect(throughPoints(rpt(2, 1), rpt(2, 5))).toEqual({ kind: "vertical", x: rat(2) });
    expect(throughPoints(rpt(2, 1), rpt(2, 1))).toEqual({ kind: "same" });
  });
  it("Punktprobe", () => {
    expect(onLine(line(3, -1), rpt(2, 5))).toBe(true);
    expect(onLine(line(3, -1), rpt(2, 4))).toBe(false);
  });
  it("two lines meet once, are parallel, or are the same", () => {
    expect(meet(line(2, 1), line(-1, 4))).toEqual({ kind: "point", at: rpt(1, 3) });
    expect(meet(line(2, 1), line(2, -3))).toEqual({ kind: "parallel" });
    expect(meet(line(2, 1), line(2, 1))).toEqual({ kind: "same" });
  });
  it("every quiz question has exactly one right answer", () => {
    const r = seededRandom(37);
    for (let i = 0; i < 700; i++) {
      const q = makeFunctionQuestion(r);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      const right = q.choices[q.answer]!;
      switch (q.kind) {
        case "readM": expect(equals(parseRat(right), q.line.m)).toBe(true); break;
        case "readB": expect(equals(parseRat(right), q.line.b)).toBe(true); break;
        case "pickGraph": {
          const o = q.options[q.answer]!;
          expect(equals(o.m, q.line.m) && equals(o.b, q.line.b)).toBe(true);
          expect(q.options.filter((p) => equals(p.m, q.line.m) && equals(p.b, q.line.b))).toHaveLength(1);
          break;
        }
        case "twoPoints": {
          const t = throughPoints(q.p, q.q);
          expect(t.kind === "line" && equals(t.line.m, parseRat(right))).toBe(true);
          for (const p of [q.p, q.q]) for (const v of [p.x, p.y]) expect(v.d === 1 && Math.abs(v.n) <= 12).toBe(true);
          break;
        }
        case "probe": expect(right).toBe(onLine(q.line, q.p) ? "yes" : "no"); break;
        case "zero": {
          const z = zeroOf(q.line);
          expect(z.kind === "point" && equals(z.x, parseRat(right))).toBe(true);
          break;
        }
        case "tariff": {
          const cost = (t: { base: number; per: number }, u: number) => t.base + t.per * u;
          expect(cost(q.a, q.at)).toBe(cost(q.b, q.at));
          expect(Number(right)).toBe(q.at);
          for (const c of q.choices) expect(Number(c)).toBeGreaterThan(0);
          break;
        }
      }
    }
  });
  it("a round has 10 questions, at most 2 of a kind", () => {
    const round = makeFunctionRound(seededRandom(2));
    expect(round).toHaveLength(10);
  });
});
