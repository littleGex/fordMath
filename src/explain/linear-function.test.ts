import { line, makeFunctionQuestion, rpt } from "../lib/linear-function";
import { seededRandom } from "../lib/random";
import { rat } from "../lib/rational";
import { interceptText, lineText, meetSteps, probeSteps, quizChoice, quizPrompt, quizSteps, slopeText, twoPointSteps, zeroSteps } from "./linear-function";

describe("lineare Funktionen explained", () => {
  it("writes lines and says what m and b mean", () => {
    expect(lineText(line(2, -1))).toBe("y = 2x − 1");
    expect(lineText(line(rat(2, 3), 0))).toBe("y = 2/3·x");
    expect(slopeText(line(rat(2, 3), 1), "de")).toBe("m = 2/3: Die Gerade steigt. Steigungsdreieck: 3 nach rechts, 2 nach oben.");
    expect(slopeText(line(-2, 1), "en")).toBe("m = −2: the line falls. Slope triangle: 1 to the right, 2 down.");
    expect(interceptText(line(2, 0), "de")).toContain("proportional");
    expect(interceptText(line(2, -1), "de")).toBe("b = −1: Die Gerade schneidet die y-Achse bei (0 | −1).");
  });
  it("works out the Nullstelle, m from two points, the Punktprobe and the crossing point", () => {
    expect(zeroSteps(line(2, -6), "de")[1]).toBe("| + 6 → 6 = 2x   | : 2 → x = 3");
    expect(twoPointSteps(rpt(1, 3), rpt(3, 7), "de")).toEqual([
      "m = (y₂ − y₁) : (x₂ − x₁) = (7 − 3) : (3 − 1) = 4 : 2 = 2",
      "b = y₁ − m · x₁ = 3 − 2 · 1 = 1 (setze einen Punkt in y = m·x + b ein und löse nach b auf)",
      "Also: y = 2x + 1",
    ]);
    expect(probeSteps(line(3, -1), rpt(2, 5), "de")).toEqual(["Setze x = 2 in y = 3x − 1 ein: y = 3 · 2 − 1 = 5", "5 = 5 ✓ Der Punkt liegt auf der Geraden."]);
    expect(meetSteps(line(2, 1), line(-1, 4), "de").at(-1)).toContain("S(1 | 3)");
    expect(meetSteps(line(2, 1), line(2, -3), "en")[0]).toContain("parallel");
  });
  it("every quiz question reads well in both languages", () => {
    const r = seededRandom(4);
    for (let i = 0; i < 400; i++) {
      const q = makeFunctionQuestion(r);
      for (const lang of ["de", "en"] as const) {
        const choices = q.choices.map((c) => quizChoice(q, c, lang));
        expect(new Set(choices).size).toBe(choices.length);
        expect([quizPrompt(q, lang), ...choices, ...quizSteps(q, lang)].join(" ")).not.toMatch(/undefined|NaN|null|\+ −|− −/);
      }
    }
  });
});
