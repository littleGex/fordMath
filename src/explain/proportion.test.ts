import { makeProportionQuestion } from "../lib/proportion";
import { seededRandom } from "../lib/random";
import { rat } from "../lib/rational";
import { dreisatzLines, dreisatzText, quizChoice, quizPrompt, quizSteps, whyRelation } from "./proportion";

describe("Zuordnungen explained", () => {
  it("the Dreisatz for apples: the same on both sides", () => {
    const lines = dreisatzLines({ kind: "proportional", a: rat(3), b: rat(9, 2), c: rat(5) }, "de", "kg", "€");
    expect(dreisatzText(lines)).toBe("3 kg ≙ 4,50 € → 1 kg ≙ 1,50 € → 5 kg ≙ 7,50 €");
    expect([lines[0]!.opLeft, lines[0]!.opRight, lines[1]!.opLeft, lines[1]!.opRight]).toEqual([": 3", ": 3", "· 5", "· 5"]);
  });
  it("the Dreisatz for pumps: the opposite on the right", () => {
    const lines = dreisatzLines({ kind: "inverse", a: rat(4), b: rat(6), c: rat(3) }, "en", "pumps", "h", "pump");
    expect(dreisatzText(lines)).toBe("4 pumps ≙ 6 h → 1 pump ≙ 24 h → 3 pumps ≙ 8 h");
    expect([lines[0]!.opLeft, lines[0]!.opRight, lines[1]!.opLeft, lines[1]!.opRight]).toEqual([": 4", "· 4", "· 3", ": 3"]);
  });
  it("says why a table is what it is", () => {
    expect(whyRelation([[rat(2), rat(12)], [rat(3), rat(8)]], "inverse", "de")).toContain("x · y ergibt 24");
  });
  it("every quiz question reads well in both languages", () => {
    const r = seededRandom(9);
    for (let i = 0; i < 300; i++) {
      const q = makeProportionQuestion(r);
      for (const lang of ["de", "en"] as const) {
        const text = [quizPrompt(q, lang), ...quizSteps(q, lang), ...q.choices.map((c) => quizChoice(q, c, lang))].join(" ");
        expect(text).not.toMatch(/undefined|NaN|null/);
        // Only a "neither" table may have quotients that don't come out exactly.
        if (q.kind !== "classify") expect(text).not.toContain("≈");
      }
    }
  });
});
