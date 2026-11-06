import { makeBracketTask, parse, type BracketTask } from "../lib/expression";
import { seededRandom } from "../lib/random";
import { bracketPrompt, bracketSteps, partText, ruleMessage, workingLine } from "./order";

describe("order explanations", () => {
  it("shows the part to work out without its brackets", () => {
    expect(partText(parse("(3 + 4) · 2"), "L")).toBe("3 + 4");
  });
  it("says which rule applies", () => {
    expect(ruleMessage("brackets", "3 + 4", "de")).toBe("Klammern zuerst! Rechne erst, was in der Klammer steht: 3 + 4.");
    expect(ruleMessage("punkt-vor-strich", "4 · 2", "de")).toBe("Punkt vor Strich! Erst · und :, dann + und −. Zuerst kommt 4 · 2.");
    expect(ruleMessage("left-to-right", "10 − 3", "en")).toBe("Left to right! First comes 10 − 3.");
  });
  it("writes the whole working on one line", () => {
    expect(workingLine(parse("18 − 12 : 3 + 1"))).toBe("18 − 12 : 3 + 1 = 18 − 4 + 1 = 14 + 1 = 15");
  });
  it("explains a bracket puzzle", () => {
    const t: BracketTask = { numbers: [3, 4, 2], ops: ["+", "*"], target: 14, options: ["(3 + 4) · 2", "3 + 4 · 2"], values: [14, 11], answer: 0 };
    expect(bracketPrompt(t, "de")).toBe("Setze Klammern, damit 14 herauskommt: 3 + 4 · 2");
    expect(bracketSteps(t, "de", parse)).toEqual(["(3 + 4) · 2 = 7 · 2 = 14", "3 + 4 · 2 = 3 + 8 = 11", "Nur (3 + 4) · 2 ergibt 14."]);
  });
  it("works for generated puzzles", () => {
    const r = seededRandom(3);
    for (let i = 0; i < 50; i++) {
      const t = makeBracketTask(r);
      for (const s of bracketSteps(t, "en", parse)) expect(s).not.toContain("undefined");
      expect(bracketPrompt(t, "de")).not.toContain("undefined");
    }
  });
});
