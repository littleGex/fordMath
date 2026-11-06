import { makeCuboidQuestion } from "../lib/cuboid";
import { seededRandom } from "../lib/random";
import { choiceText, convertSteps, quizPrompt, quizSteps, surfaceSteps, volumeSteps } from "./cuboid";

describe("cuboid explanations", () => {
  it("volume in layers", () => {
    expect(volumeSteps(4, 3, 2, "de")).toEqual([
      "Eine Schicht hat 4 · 3 = 12 Würfel.",
      "Es sind 2 Schichten: 12 · 2 = 24 Würfel.",
      "V = a · b · c = 4 cm · 3 cm · 2 cm = 24 cm³",
    ]);
  });
  it("surface in pairs", () => {
    expect(surfaceSteps(4, 3, 2, "de")[1]).toBe("O = 2 · (a·b + a·c + b·c) = 2 · (12 + 8 + 6) = 2 · 26 = 52 cm²");
  });
  it("converting", () => {
    expect(convertSteps(3, "dm³", "cm³", "de").at(-1)).toBe("3 dm³ = 3 · 1.000 cm³ = 3.000 cm³");
    expect(convertSteps(4000, "ml", "l", "en").at(-1)).toBe("4,000 ml = 4,000 : 1,000 l = 4 l");
    expect(convertSteps(2, "dm³", "l", "de")[0]).toContain("dieselbe Menge");
  });
  it("every question reads well", () => {
    const r = seededRandom(8);
    for (let i = 0; i < 300; i++) {
      const q = makeCuboidQuestion(r);
      for (const lang of ["de", "en"] as const) {
        expect([quizPrompt(q, lang), ...quizSteps(q, lang), ...q.choices.map((c) => choiceText(q, c, lang))].join(" ")).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
