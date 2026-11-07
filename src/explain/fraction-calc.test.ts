import { fr, makeCalcQuestion, type CalcKind } from "../lib/fraction-calc";
import { seededRandom } from "../lib/random";
import { mixedText, quizChoice, quizPrompt, quizSteps, steps } from "./fraction-calc";

describe("Bruchrechnen explained", () => {
  it("plus with the Hauptnenner", () => {
    expect(steps("+", fr(3, 4), fr(1, 6), "de")).toEqual([
      "Bring beide auf den Hauptnenner: kgV(4, 6) = 12.",
      "Erweitere: 3/4 = 9/12 (mit 3), 1/6 = 2/12 (mit 2).",
      "Addiere die Zähler, der Nenner bleibt: 9/12 + 2/12 = (9 + 2)/12 = 11/12",
    ]);
  });
  it("mixed numbers in and out", () => {
    const s = steps("+", fr(7, 3), fr(3, 2), "de");
    expect(s[0]).toBe("Wandle die gemischten Zahlen in Brüche um: 2 1/3 = (2 · 3 + 1)/3 = 7/3, 1 1/2 = (1 · 2 + 1)/2 = 3/2");
    expect(s.at(-1)).toBe("Als gemischte Zahl: 23/6 = 3 5/6");
    expect(mixedText(fr(6, 3))).toBe("2");
  });
  it("times, kürzen über Kreuz", () => {
    expect(steps("*", fr(4, 9), fr(3, 8), "de")).toEqual([
      "Kürze über Kreuz, bevor du malnimmst: 4 und 8 durch 4, 3 und 9 durch 3. Dann steht da 1/3 · 1/2.",
      "Zähler mal Zähler, Nenner mal Nenner: (1 · 1)/(3 · 2) = 1/6",
    ]);
  });
  it("divide with the Kehrwert", () => {
    const s = steps(":", fr(3, 4), fr(2, 5), "en");
    expect(s[0]).toContain("The reciprocal of 2/5 is 5/2: 3/4 ÷ 2/5 = 3/4 × 5/2");
    expect(s.at(-1)).toBe("As a mixed number: 15/8 = 1 7/8");
  });
  it("kürzen at the end", () => {
    expect(steps("+", fr(1, 6), fr(1, 3), "de").at(-1)).toBe("Kürze mit 3: 3/6 = 1/2");
  });
  it("every quiz question reads well in both languages", () => {
    const r = seededRandom(2);
    for (const kind of ["add", "sub", "mul", "div", "mixed"] as CalcKind[]) {
      for (let i = 0; i < 100; i++) {
        const q = makeCalcQuestion(kind, r);
        const choices = q.choices.map(quizChoice);
        expect(new Set(choices).size).toBe(4);
        for (const lang of ["de", "en"] as const) {
          expect([quizPrompt(q, lang), ...choices, ...quizSteps(q, lang)].join(" ")).not.toMatch(/undefined|NaN|null|\/0\b/);
        }
      }
    }
  });
});
