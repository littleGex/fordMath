import { cellKey, makeAreaQuestion, rectangle, shapeOf } from "../lib/area";
import { seededRandom } from "../lib/random";
import { choiceText, explainRange, explainShape, inUnit, quizPrompt, quizSteps } from "./area";

describe("explainShape", () => {
  it("counts first, then the formulas for a rectangle", () => {
    expect(explainShape(rectangle(4, 3), "de")).toEqual([
      "Zähle die Kästchen: 12. Jedes Kästchen ist 1 cm², also ist A = 12 cm².",
      "Zähle die Kanten am Rand: 14. Jede Kante ist 1 cm lang, also ist U = 14 cm.",
      "Es ist ein Rechteck mit a = 4 cm und b = 3 cm. Mit den Formeln geht es schneller:",
      "A = a · b = 4 cm · 3 cm = 12 cm²",
      "U = 2 · a + 2 · b = 2 · 4 cm + 2 · 3 cm = 8 cm + 6 cm = 14 cm",
    ]);
  });
  it("only counts for other shapes, and notices separate parts", () => {
    const lines = explainShape(shapeOf([[0, 0], [1, 1]]), "en");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain("more than one shape");
  });
  it("says nothing for no squares", () => {
    expect(explainShape(new Set(), "de")).toEqual([]);
  });
});

describe("explainRange", () => {
  it("12 squares", () => {
    const lines = explainRange(rectangle(3, 4), "de");
    expect(lines[0]).toContain("mindestens 14 cm");
    expect(lines[0]).toContain("höchstens 26 cm");
    expect(lines[1]).toBe("Rechtecke mit 12 Kästchen: 1 × 12: 26 cm, 2 × 6: 16 cm, 3 × 4: 14 cm.");
    expect(lines[2]).toContain("kleinsten Umfang");
  });
  it("a snake has the largest", () => {
    expect(explainRange(rectangle(6, 1), "en")[2]).toContain("largest");
  });
  it("nothing for separate parts", () => {
    expect(explainRange(new Set([cellKey(0, 0), cellKey(2, 2)]), "de")).toEqual([]);
  });
});

describe("area units", () => {
  it("writes amounts with a decimal comma", () => {
    expect(inUnit(250, "cm²", "de")).toBe("2,5");
    expect(inUnit(250, "mm²", "de")).toBe("250");
    expect(inUnit(1_250_000, "m²", "en")).toBe("1.25");
    expect(inUnit(5, "dm²", "de")).toBe("0,0005");
  });
});

describe("quiz text", () => {
  it("every question reads well in both languages", () => {
    const r = seededRandom(7);
    for (let i = 0; i < 300; i++) {
      const q = makeAreaQuestion(r);
      for (const lang of ["de", "en"] as const) {
        const all = [quizPrompt(q, lang), ...quizSteps(q, lang), ...q.choices.map((c) => choiceText(q, c, lang))].join("\n");
        expect(all).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
