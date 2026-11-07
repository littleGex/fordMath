import { makeCoordQuestion, pt, type Range } from "../lib/coordinates";
import { seededRandom } from "../lib/random";
import { pointText, quizChoice, quizPrompt, quizSteps, shotText, walk } from "./coordinates";

describe("Koordinaten explained", () => {
  it("writes points the German and the English way", () => {
    expect(pointText(pt(3, -2), "de", "A")).toBe("A(3 | −2)");
    expect(pointText(pt(3, -2), "en", "A")).toBe("A(3, −2)");
  });
  it("walks from the origin: along first, then up", () => {
    expect(walk(pt(3, 2), "de")).toBe("(3 | 2): Starte im Ursprung (0 | 0), geh 3 nach rechts, dann 2 nach oben.");
    expect(walk(pt(-4, -1), "en")).toBe("(−4, −1): start at the origin (0, 0), go 4 to the left, then 1 down.");
    expect(walk(pt(0, 5), "de")).toContain("bleib bei x = 0 auf der y-Achse, dann 5 nach oben");
  });
  it("says what a shot did", () => {
    expect(shotText("sunk", pt(2, 1), "de")).toBe("(2 | 1): Treffer, versenkt! 🚢");
  });
  it("every quiz question reads well in both languages", () => {
    const r = seededRandom(3);
    for (const range of ["first", "all"] as Range[]) {
      for (let i = 0; i < 300; i++) {
        const q = makeCoordQuestion(range, r);
        for (const lang of ["de", "en"] as const) {
          const choices = q.choices.map((c) => quizChoice(q, c, lang));
          expect(new Set(choices).size).toBe(choices.length);
          const steps = quizSteps(q, lang);
          expect(steps.length).toBeGreaterThan(0);
          expect([quizPrompt(q, lang), ...choices, ...steps].join(" ")).not.toMatch(/undefined|NaN|null/);
        }
      }
    }
  });
});
