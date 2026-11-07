import {
  apply, bestOperation, bracketSide, choicesFor, LEVELS, makeTask, outcome, readEquation, side, solveAll, valueAt, type LinearEquation,
} from "./linear-equation";
import { seededRandom } from "./random";
import { equals, rat } from "./rational";

const eqn = (left: ReturnType<typeof side>, right: ReturnType<typeof side>): LinearEquation => ({ left, right });

describe("lineare Gleichungen", () => {
  it("solves 3x + 2 = 11 in two steps: | − 2, | : 3", () => {
    const s = solveAll(eqn(side(3, 2), side(0, 11)));
    expect(s.ops).toEqual([{ kind: "add", x: rat(0), c: rat(-2) }, { kind: "mul", f: rat(1, 3) }]);
    expect(s.result).toEqual({ kind: "value", x: rat(3) });
  });
  it("brackets first, then x to the left, numbers to the right: 4(x − 1) = 2x + 6", () => {
    const s = solveAll(eqn(bracketSide(4, 1, -1), side(2, 6)));
    expect(s.ops.map((o) => o.kind)).toEqual(["expand", "add", "add", "mul"]);
    expect(s.result).toEqual({ kind: "value", x: rat(5) });
  });
  it("no solution and every number", () => {
    expect(solveAll(eqn(bracketSide(2, 1, 3), side(2, 1))).result).toEqual({ kind: "none" });
    expect(solveAll(eqn(bracketSide(3, 1, -2), side(3, -6))).result).toEqual({ kind: "all" });
  });
  it("x only on the right, and a negative x", () => {
    expect(solveAll(eqn(side(0, 5), side(2, 1))).result).toEqual({ kind: "value", x: rat(2) });
    expect(solveAll(eqn(side(-1, 4), side(0, 1))).result).toEqual({ kind: "value", x: rat(3) });
  });
  it("x/2 + 3 = 7 multiplies by 2", () => {
    const s = solveAll(eqn(side(rat(1, 2), 3), side(0, 7)));
    expect(s.ops.at(-1)).toEqual({ kind: "mul", f: rat(2) });
    expect(s.result).toEqual({ kind: "value", x: rat(8) });
  });
  it("offers the best step and explains the tempting wrong ones", () => {
    const r = seededRandom(1);
    const kinds = (e: LinearEquation) => Object.fromEntries(choicesFor(e, r).map((c) => [c.verdict, c.op]));
    expect(kinds(eqn(bracketSide(4, 1, -1), side(2, 6)))).toMatchObject({ best: { kind: "expand" }, insideBracket: { kind: "add", c: rat(1) } });
    expect(kinds(eqn(side(3, 2), side(0, 11)))).toMatchObject({ wrongSign: { kind: "add", c: rat(2) }, divideEarly: { kind: "mul", f: rat(1, 3) } });
    expect(kinds(eqn(side(3, 0), side(0, 12)))).toMatchObject({ subtractCoef: { kind: "add", c: rat(-3) }, wrongDivisor: { kind: "mul", f: rat(1, 12) }, multiplyCoef: { kind: "mul", f: rat(3) } });
  });
  it("every generated task: the answer fits, and each step has one best choice", () => {
    const r = seededRandom(34);
    for (const level of LEVELS) {
      for (let i = 0; i < 150; i++) {
        const e = makeTask(level, r);
        const s = solveAll(e);
        if (s.result.kind === "value") {
          expect(equals(valueAt(e.left, s.result.x), valueAt(e.right, s.result.x))).toBe(true);
          if (level < 5) expect(s.result.x.d).toBe(1);
        } else {
          expect(level).toBe(5);
          const any = rat(7, 3);
          expect(equals(valueAt(e.left, any), valueAt(e.right, any))).toBe(s.result.kind === "all");
        }
        let line = e;
        for (const op of s.ops) {
          const choices = choicesFor(line, r);
          expect(choices.filter((c) => c.verdict === "best")).toHaveLength(1);
          expect(choices.length).toBeGreaterThanOrEqual(2);
          expect(choices.find((c) => c.verdict === "best")!.op).toEqual(op);
          line = apply(line, op);
        }
        expect(outcome(line)).not.toBeNull();
        expect(bestOperation(line)).toBeNull();
      }
    }
  });
  it("level 1 and 2 stay on the balance: whole positive numbers", () => {
    const r = seededRandom(2);
    for (const level of [1, 2] as const) {
      for (let i = 0; i < 100; i++) {
        const { left, right } = makeTask(level, r);
        for (const v of [left.x, left.c, right.x, right.c]) expect(v.d === 1 && v.n >= 0).toBe(true);
      }
    }
  });
  it("reads a typed equation", () => {
    const r = readEquation("4(x - 1) = 2x + 6");
    expect(r).toEqual({ ok: true, equation: eqn(bracketSide(4, 1, -1), side(2, 6)) });
    expect(readEquation("−2(x + 1) + 3x = 5")).toEqual({ ok: true, equation: eqn(bracketSide(-2, 1, 1, 3, 0), side(0, 5)) });
    expect(readEquation("x/2 + 3 = 7")).toEqual({ ok: true, equation: eqn(side(rat(1, 2), 3), side(0, 7)) });
    expect(readEquation("1,5x = 3")).toEqual({ ok: true, equation: eqn(side(rat(3, 2), 0), side(0, 3)) });
  });
  it("says why it can't read one", () => {
    expect(readEquation("3x + 2")).toEqual({ ok: false, why: "noEquals" });
    expect(readEquation("x^2 = 4")).toEqual({ ok: false, why: "notLinear" });
    expect(readEquation("2(x + 1) + 3(x - 1) = 4")).toEqual({ ok: false, why: "twoBrackets" });
    expect(readEquation("3 = 4")).toEqual({ ok: false, why: "noX" });
    expect(readEquation("3x + = 4")).toEqual({ ok: false, why: "syntax" });
  });
});
