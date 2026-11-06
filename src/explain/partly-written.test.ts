import { SPLIT_LEVELS, makeSplitTask, splitDivide, splitMultiply } from "../lib/partly-written";
import { seededRandom } from "../lib/random";
import { explainSplit, splitLine, taskText, workingLine } from "./partly-written";

describe("partly written working", () => {
  it("7 · 46", () => {
    const t = splitMultiply(46, 7);
    expect(workingLine(t, "de")).toBe("7 · 46 = 7 · 40 + 7 · 6 = 280 + 42 = 322");
    expect(explainSplit(t, "de")).toEqual([
      "Zerlege 46 in 40 + 6.",
      "7 · 40 = 280: Rechne 7 · 4 = 28 und hänge eine 0 an.",
      "7 · 6 = 42",
      "Zusammen: 280 + 42 = 322",
    ]);
  });
  it("a two-digit factor goes second", () => {
    const t = splitMultiply(23, 14);
    expect(taskText(t)).toBe("23 · 14");
    expect(splitLine(t)).toBe("20 · 14 + 3 · 14");
  });
  it("96 : 4 and 852 : 6", () => {
    expect(workingLine(splitDivide(96, 4), "de")).toBe("96 : 4 = 80 : 4 + 16 : 4 = 20 + 4 = 24");
    expect(explainSplit(splitDivide(852, 6), "en")[1]).toBe("600 : 6 = 100: work out 6 : 6 = 1 and add 2 zeros.");
  });
  it("with a rest", () => {
    const t = splitDivide(87, 4);
    expect(workingLine(t, "de")).toBe("87 : 4 = 80 : 4 + 7 : 4 = 20 + 1 R 3 = 21 R 3");
    expect(explainSplit(t, "de").slice(1)).toEqual([
      "80 : 4 = 20: Rechne 8 : 4 = 2 und hänge eine 0 an.",
      "7 : 4 = 1 Rest 3, denn 1 · 4 = 4 und es bleiben 3 übrig.",
      "Zusammen: 20 + 1 = 21 Rest 3",
      "Probe: 21 · 4 + 3 = 87",
    ]);
  });
  it.each(SPLIT_LEVELS)("level %i reads well", (level) => {
    const r = seededRandom(level);
    for (let i = 0; i < 200; i++) {
      const t = makeSplitTask(level, r);
      for (const lang of ["de", "en"] as const) expect([workingLine(t, lang), ...explainSplit(t, lang)].join(" ")).not.toMatch(/undefined|NaN/);
    }
  });
});
