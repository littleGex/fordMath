import { seededRandom } from "../random";
import { evaluate } from "./evaluate";
import { parse } from "./parse";
import {
  allowedPaths, collapse, getAt, makeBracketTask, makeOrderTask, readyPaths, schoolText, toTokens, whyNot, workedLines,
  type SchoolToken,
} from "./steps";

type OpToken = Extract<SchoolToken, { kind: "op" }>;

/** The path of the n-th operator from the left, as the child would tap it. */
function opPath(text: string, n: number): string {
  // `t is OpToken` is a type predicate: after this filter TypeScript knows every item has a `path`.
  const ops = toTokens(parse(text)).filter((t): t is OpToken => t.kind === "op");
  return ops[n]!.path;
}

describe("which operation comes first", () => {
  it("Punkt vor Strich", () => {
    const e = parse("3 + 4 · 2");
    expect(allowedPaths(e)).toEqual([opPath("3 + 4 · 2", 1)]);
    expect(whyNot(e, opPath("3 + 4 · 2", 0))).toBe("punkt-vor-strich");
  });
  it("Klammern zuerst", () => {
    const e = parse("(3 + 4) · 2");
    expect(whyNot(e, opPath("(3 + 4) · 2", 1))).toBe("brackets");
    expect(whyNot(e, opPath("(3 + 4) · 2", 0))).toBeNull();
  });
  it("brackets beat Punkt vor Strich even when both sides are ready", () => {
    const e = parse("(2 + 3) + 4 · 5");
    expect(readyPaths(e)).toHaveLength(2);
    expect(allowedPaths(e)).toEqual([opPath("(2 + 3) + 4 · 5", 0)]);
    expect(whyNot(e, opPath("(2 + 3) + 4 · 5", 2))).toBe("brackets");
  });
  it("without the brackets, · comes first", () => {
    expect(whyNot(parse("2 + 3 + 4 · 5"), opPath("2 + 3 + 4 · 5", 0))).toBe("punkt-vor-strich");
  });
  it("von links nach rechts", () => {
    const e = parse("10 − 3 − 2");
    expect(whyNot(e, opPath("10 − 3 − 2", 1))).toBe("left-to-right");
    expect(whyNot(parse("12 : 2 · 3"), opPath("12 : 2 · 3", 1))).toBe("left-to-right");
  });
  it("allows either of two independent · steps", () => {
    expect(allowedPaths(parse("2 · 3 + 4 · 5"))).toHaveLength(2);
  });
});

describe("collapse and the worked lines", () => {
  it("replaces one operation by its value", () => {
    const e = collapse(parse("18 : 3 + 1"), "L");
    expect(schoolText(e)).toBe("6 + 1");
  });
  it("writes each line underneath, the school way", () => {
    expect(workedLines(parse("18 − 12 : 3 + 1"))).toEqual(["18 − 12 : 3 + 1", "18 − 4 + 1", "14 + 1", "15"]);
    expect(workedLines(parse("(3 + 4) · 2"))).toEqual(["(3 + 4) · 2", "7 · 2", "14"]);
  });
  it("keeps the brackets until their inside is a single number", () => {
    expect(workedLines(parse("2 · (3 + 4 · 5)"))).toEqual(["2 · (3 + 4 · 5)", "2 · (3 + 20)", "2 · 23", "46"]);
  });
  it("doesn't change the original tree", () => {
    const e = parse("3 + 4 · 2");
    collapse(e, "R");
    expect(schoolText(e)).toBe("3 + 4 · 2");
    expect(getAt(e, "R").type).toBe("binary");
  });
});

describe("makeOrderTask", () => {
  it.each([1, 2, 3, 4] as const)("level %i: whole steps, exact divisions, the same answer whatever allowed order", (level) => {
    const r = seededRandom(level * 31);
    for (let i = 0; i < 200; i++) {
      const e = makeOrderTask(level, r);
      const lines = workedLines(e);
      for (const line of lines.slice(1)) {
        const v = evaluate(parse(line), 0);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
      expect(Number(lines.at(-1))).toBe(evaluate(e, 0));
      if (level === 2 || level === 4) expect(lines[0]).toContain("(");
    }
  });
});

describe("makeBracketTask", () => {
  it("has exactly one option that makes the target", () => {
    const r = seededRandom(18);
    for (let i = 0; i < 300; i++) {
      const t = makeBracketTask(r);
      const made = t.options.map((o) => evaluate(parse(o), 0));
      expect(made).toEqual(t.values);
      expect(made.filter((v) => v === t.target)).toHaveLength(1);
      expect(made[t.answer]).toBe(t.target);
      expect(new Set(t.options).size).toBe(t.options.length);
      expect(t.options.length).toBeGreaterThanOrEqual(2);
      expect(t.options[t.answer]).toContain("(");
      for (const o of t.options) for (const line of workedLines(parse(o))) expect(line).not.toMatch(/-\d/); // a negative number would print as "-1"
    }
  });
});
