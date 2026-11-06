import { parseClock } from "../lib/units";
import { makeUnitsQuestion, type UnitsQuestion } from "../lib/units-quiz";
import { seededRandom } from "../lib/random";
import { changeSteps, choiceText, convertSteps, questionSteps, questionText, spanSteps } from "./units";

const nb = (s: string) => s.replace(/ /g, " ");

describe("convertSteps", () => {
  it("shows the conversion number and where the comma moves", () => {
    expect(convertSteps(2350, "length", "m", "cm", "de")).toEqual([
      "1 m = 100 cm. Die Umrechnungszahl ist 100.",
      "Von m zu cm (kleinere Einheit): mal 100. Das Komma rückt 2 Stellen nach rechts.",
      "2,35 m = 235 cm",
      "Gemischt geschrieben: 2 m 35 cm",
    ]);
  });
  it("divides when going to a bigger unit", () => {
    expect(convertSteps(1_250_000, "mass", "g", "kg", "en").slice(1, 3)).toEqual([
      "From g to kg (a bigger unit): divided by 1,000. The decimal point moves 3 places left.",
      "1,250 g = 1.25 kg",
    ]);
  });
  it("multiplies by 60 for time", () => {
    expect(convertSteps(5400, "time", "h", "min", "de").slice(0, 3)).toEqual([
      "1 h = 60 min. Die Umrechnungszahl ist 60.",
      "1,5 h = 1,5 · 60 min = 90 min",
      "1,5 h = 90 min",
    ]);
  });
});

describe("spanSteps", () => {
  it("jumps along the time line", () => {
    expect(spanSteps(parseClock("08:45"), parseClock("10:20"), "de")).toEqual([
      "Spring in Etappen über den Zeitstrahl:",
      "08:45 → 09:00: 15 min (bis zur vollen Stunde)",
      "09:00 → 10:00: 1 h",
      "10:00 → 10:20: 20 min",
      "Zusammen: 15 min + 1 h + 20 min = 1 h 35 min",
    ]);
  });
});

describe("changeSteps", () => {
  it("counts up from the price, then lists the coins", () => {
    expect(changeSteps(365, 500, "de")).toEqual([
      "Rechne vom Preis hoch bis 5,00 € (ergänzen):",
      "3,65 € + 5 ct = 3,70 €",
      "3,70 € + 30 ct = 4,00 €",
      "4,00 € + 1 € = 5,00 €",
      "Rückgeld: 5 ct + 30 ct + 1 € = 1,35 €",
      "Mit den wenigsten Münzen und Scheinen: 1 €, 20 ct, 10 ct, 5 ct",
    ]);
  });
});

describe("questions", () => {
  it("writes compare choices as the amounts", () => {
    const q: UnitsQuestion = { kind: "compare", quantity: "mass", left: 1_200_000, leftUnit: "kg", right: 900_000, rightUnit: "g", choices: [0, 1, 2], answer: 0 };
    expect(nb(choiceText(q, 0, "de"))).toBe("1,2 kg");
    expect(nb(choiceText(q, 2, "de"))).toBe("900 g");
    expect(questionSteps(q, "de").map(nb)).toEqual([
      "Schreib beide in derselben Einheit, am besten in g:",
      "1,2 kg = 1 200 g",
      "900 g = 900 g",
      "1 200 g > 900 g",
    ]);
  });
  it("has text, choices and working for every generated question", () => {
    const r = seededRandom(6);
    for (const level of ["grundschule", "sek1"] as const) {
      for (let i = 0; i < 150; i++) {
        const q = makeUnitsQuestion(level, r);
        for (const lang of ["de", "en"] as const) {
          const all = [questionText(q, lang), ...q.choices.map((c) => choiceText(q, c, lang)), ...questionSteps(q, lang)];
          for (const s of all) {
            expect(s).not.toContain("undefined");
            expect(s).not.toContain("null");
          }
          const texts = q.choices.map((c) => choiceText(q, c, lang));
          if (q.kind !== "compare") expect(new Set(texts).size).toBe(texts.length);
        }
      }
    }
  });
});
