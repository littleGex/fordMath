import { makePercentQuestion, solve } from "../lib/percent";
import { seededRandom } from "../lib/random";
import { rat } from "../lib/rational";
import { dreisatz, dreisatzText, formula, num, quizPrompt, quizSteps } from "./percent";

describe("percent explanations", () => {
  it("numbers: exact, or rounded with ≈", () => {
    expect(num(rat(4, 5), "de")).toBe("0,8");
    expect(num(rat(1, 3), "de")).toBe("≈ 0,33");
    expect(num(rat(94981, 10000), "en")).toBe("9.4981");
  });
  it("the Dreisatz and formula for each unknown", () => {
    const w = solve({ G: rat(80), p: rat(15) });
    expect(dreisatzText(dreisatz(w, "de", "€"))).toBe("100 % ≙ 80 € → 1 % ≙ 0,8 € → 15 % ≙ 12 €");
    expect(formula(w, "de", "€")).toBe("W = G · p / 100 = 80 € · 15 / 100 = 12 €");
    const g = solve({ W: rat(12), p: rat(15) });
    expect(dreisatzText(dreisatz(g, "de", "€"))).toBe("15 % ≙ 12 € → 1 % ≙ 0,8 € → 100 % ≙ 80 €");
    const p = solve({ W: rat(12), G: rat(80) });
    expect(dreisatzText(dreisatz(p, "en", "€"))).toBe("80 € ≙ 100 % → 1 € ≙ 1.25 % → 12 € ≙ 15 %");
    expect(formula(p, "de")).toBe("p = W / G · 100 = 12 / 80 · 100 = 15 %");
  });
  it("every quiz question reads well in both languages", () => {
    const r = seededRandom(5);
    for (let i = 0; i < 300; i++) {
      const q = makePercentQuestion(r);
      for (const lang of ["de", "en"] as const) {
        expect([quizPrompt(q, lang), ...quizSteps(q, lang)].join(" ")).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
