import { apply, bracketSide, choicesFor, LEVELS, makeTask, side, solveAll, type LinearEquation } from "../lib/linear-equation";
import { seededRandom } from "../lib/random";
import { rat } from "../lib/rational";
import { equationText, opLabel, opSay, probeText, verdictText, workedSolution } from "./linear-equation";

const eqn = (left: ReturnType<typeof side>, right: ReturnType<typeof side>): LinearEquation => ({ left, right });

describe("lineare Gleichungen explained", () => {
  it("writes equations the book way", () => {
    expect(equationText(eqn(bracketSide(4, 1, -1), side(2, 6)))).toBe("4(x − 1) = 2x + 6");
    expect(equationText(eqn(bracketSide(-2, 1, 1, 3, 0), side(0, 5)))).toBe("−2(x + 1) + 3x = 5");
    expect(equationText(eqn(side(rat(1, 2), 3), side(0, 7)))).toBe("1/2·x + 3 = 7");
  });
  it("labels the steps", () => {
    expect(opLabel({ kind: "add", x: rat(-2), c: rat(0) }, "de")).toBe("| − 2x");
    expect(opLabel({ kind: "add", x: rat(0), c: rat(4) }, "de")).toBe("| + 4");
    expect(opLabel({ kind: "mul", f: rat(1, 3) }, "de")).toBe("| : 3");
    expect(opLabel({ kind: "mul", f: rat(-1, 2) }, "de")).toBe("| : (−2)");
    expect(opLabel({ kind: "mul", f: rat(2) }, "de")).toBe("| · 2");
    expect(opLabel({ kind: "expand" }, "en")).toBe("Expand the bracket");
  });
  it("works 4(x − 1) = 2x + 6 out line by line, with the Probe", () => {
    const w = workedSolution(eqn(bracketSide(4, 1, -1), side(2, 6)), "de");
    expect(w.lines).toEqual([
      { math: "4(x − 1) = 2x + 6", op: "Klammer auflösen" },
      { math: "4x − 4 = 2x + 6", op: "| − 2x" },
      { math: "2x − 4 = 6", op: "| + 4" },
      { math: "2x = 10", op: "| : 2" },
      { math: "x = 5", op: undefined },
    ]);
    expect(w.result).toBe("Lösung: x = 5, also L = {5}");
    expect(w.probe).toBe("Probe mit x = 5: links 4·(5 − 1) = 16, rechts 2·5 + 6 = 16 ✓");
  });
  it("no solution and every number", () => {
    expect(workedSolution(eqn(bracketSide(2, 1, 3), side(2, 1)), "de").result).toContain("6 = 1 ist falsch");
    const all = workedSolution(eqn(bracketSide(3, 1, -2), side(3, -6)), "en");
    expect(all.result).toContain("L = ℚ");
    expect(all.probe).toBe("Check, for example with x = 1: left 3·(1 − 2) = −3, right 3·1 − 6 = −3 ✓");
  });
  it("explains the tempting wrong steps with the child's numbers", () => {
    const e = eqn(side(3, 2), side(0, 11));
    expect(verdictText("wrongSign", { kind: "add", x: rat(0), c: rat(2) }, e, "de")).toBe("Mit | + 2 wird es nicht weniger, sondern mehr. Um +2 wegzubekommen, rechnest du das Gegenteil: | − 2.");
    const f = eqn(side(3, 0), side(0, 12));
    expect(verdictText("subtractCoef", { kind: "add", x: rat(0), c: rat(-3) }, f, "de")).toBe("3x heißt 3 · x. Das Gegenteil von · 3 ist : 3, nicht − 3.");
    expect(verdictText("insideBracket", { kind: "add", x: rat(0), c: rat(1) }, eqn(bracketSide(4, 1, -1), side(2, 6)), "en")).toContain("The 1 is inside the bracket");
    expect(opSay({ kind: "expand" }, eqn(bracketSide(4, 1, -1), side(2, 6)), "de")).toContain("4·(x − 1) = 4x − 4");
  });
  it("every task, every choice and every step reads well in both languages", () => {
    const r = seededRandom(8);
    for (const level of LEVELS) {
      for (let i = 0; i < 60; i++) {
        const e = makeTask(level, r);
        const s = solveAll(e);
        for (const lang of ["de", "en"] as const) {
          const w = workedSolution(e, lang);
          const text = [...w.lines.map((l) => `${l.math} ${l.op ?? ""}`), w.result, w.probe ?? ""];
          let line = e;
          for (const op of s.ops) {
            for (const c of choicesFor(line, r)) text.push(opLabel(c.op, lang), verdictText(c.verdict, c.op, line, lang));
            text.push(opSay(op, line, lang));
            line = apply(line, op);
          }
          expect(text.join(" ")).not.toMatch(/undefined|NaN|null|\+ −|− −|\[object/);
        }
        if (s.result.kind !== "none") expect(probeText(e, s.result, "de")).toMatch(/✓$/);
      }
    }
  });
});
