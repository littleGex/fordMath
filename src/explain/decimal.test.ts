import { makeDecimalQuestion, parseDecimal, roundDecimal } from "../lib/decimal";
import { seededRandom } from "../lib/random";
import { choiceLabel, compareSteps, fractionSteps, localise, placeText, quizPrompt, quizSteps, roundSteps, sumSteps } from "./decimal";

const d = (t: string) => parseDecimal(t)!;

describe("decimal explanations", () => {
  it("place values in words and fractions", () => {
    expect(placeText(d("3,472"), "de")).toEqual(["3 Einer, 4 Zehntel, 7 Hundertstel, 2 Tausendstel", "3 + 4/10 + 7/100 + 2/1000"]);
    expect(placeText(d("20,05"), "en")).toEqual(["2 tens, 5 hundredths", "20 + 5/100"]);
    expect(placeText(d("0"), "de")).toEqual(["0 Einer", "0"]);
  });
  it("comparing 0,5 and 0,45: fill with zeros, more digits isn't bigger", () => {
    expect(compareSteps(d("0,5"), d("0,45"), "de")).toEqual([
      "Fülle mit Nullen auf, damit beide gleich viele Stellen nach dem Komma haben: 0,50 und 0,45.",
      "Vor dem Komma gleich. Vergleiche Stelle für Stelle von links: Bei den Zehntel ist 5 > 4.",
      "0,5 > 0,45",
      "Mehr Ziffern heißt nicht größer!",
    ]);
    expect(compareSteps(d("0,5"), d("0,50"), "en").at(-1)).toBe("0.5 = 0.50");
    expect(compareSteps(d("3,1"), d("2,9"), "de")[0]).toBe("Vergleiche zuerst die Zahl vor dem Komma: 3 > 2.");
  });
  it("rounding", () => {
    expect(roundSteps(roundDecimal(d("3,46"), 1), "de")).toEqual([
      "Runde 3,46 auf Zehntel.", "Schau auf die Ziffer dahinter, bei den Hundertstel: 6.", "6 ist 5 oder mehr: aufrunden.",
      "3,46 liegt zwischen 3,4 und 3,5.", "3,46 ≈ 3,5",
    ]);
  });
  it("fractions", () => {
    expect(fractionSteps(3, 4, "de")).toEqual(["Erweitere auf 100: 3/4 = 75/100 (mal 25).", "75/100 heißt 75 Hundertstel.", "3/4 = 0,75"]);
    expect(fractionSteps(37, 100, "en")).toEqual(["37/100 means 37 hundredths.", "37/100 = 0.37"]);
  });
  it("adding with the commas lined up", () => {
    expect(sumSteps(d("2,5"), d("0,75"), "+", "de")).toEqual([
      "Schreibe Komma unter Komma und fülle mit Nullen auf: 2,50 + 0,75.",
      "Rechne wie mit ganzen Zahlen: 250 + 75 = 325.",
      "Setze das Komma an dieselbe Stelle: 3,25.",
    ]);
  });
  it("English swaps comma and point", () => {
    expect(localise("1.234,5", "en")).toBe("1,234.5");
  });
  it("every quiz question reads well in both languages", () => {
    const r = seededRandom(2);
    for (let i = 0; i < 300; i++) {
      const q = makeDecimalQuestion(r);
      for (const lang of ["de", "en"] as const) {
        const text = [quizPrompt(q, lang), ...quizSteps(q, lang), ...q.choices.map((c) => choiceLabel(c, lang))].join("\n");
        expect(text).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
