import { makePlaceQuestion, roundTo, type PlaceQuestion } from "../lib/place-value";
import { seededRandom } from "../lib/random";
import { questionSteps, questionText, roundSteps, show, splitText } from "./place-value";

const nb = (s: string) => s.replace(/ /g, " "); // narrow spaces as plain spaces, for readable tests

describe("splitText", () => {
  it("writes the place values, skipping zeros", () => {
    expect(splitText(4572, "de").map(nb)).toEqual(["4 T + 5 H + 7 Z + 2 E", "4 000 + 500 + 70 + 2 = 4 572"]);
    expect(splitText(4052, "de").map(nb)).toEqual(["4 T + 5 Z + 2 E", "4 000 + 50 + 2 = 4 052"]);
    expect(splitText(3000000, "en")).toEqual(["3 M", "3,000,000"]);
  });
});

describe("roundSteps", () => {
  it("explains rounding up", () => {
    expect(roundSteps(roundTo(4572, 2), "de").map(nb)).toEqual([
      "Runde 4 572 auf Hunderter.",
      "Schau auf die Ziffer rechts daneben, die Zehnerziffer: 7.",
      "7 ist 5 oder mehr: aufrunden.",
      "4 572 liegt zwischen 4 500 und 4 600.",
      "4 572 ≈ 4 600",
    ]);
  });
  it("explains rounding down, in English too", () => {
    expect(roundSteps(roundTo(4549, 2), "en")).toEqual([
      "Round 4,549 to the nearest hundred.",
      "Look at the digit just to the right, the ten digit: 4.",
      "4 is less than 5: round down.",
      "4,549 is between 4,500 and 4,600.",
      "4,549 ≈ 4,500",
    ]);
  });
  it("mentions the halfway rule when exactly halfway", () => {
    expect(roundSteps(roundTo(4550, 2), "de")[3]).toContain("Genau in der Mitte rundet man auf.");
    expect(roundSteps(roundTo(4551, 2), "de")[3]).not.toContain("Mitte");
  });
});

describe("questions", () => {
  it("asks about a digit's value and explains it", () => {
    const q: PlaceQuestion = { kind: "digit-value", n: 4572, place: 2, choices: [500, 5, 50, 5000], answer: 0 };
    expect(nb(questionText(q, "de"))).toBe("Wie viel ist die 5 in 4 572 wert?");
    expect(questionSteps(q, "de").slice(0, 2)).toEqual(["Die 5 steht bei den Hundertern.", "5 H = 500"]);
  });
  it("asks for a number from words", () => {
    const q: PlaceQuestion = { kind: "words", n: 4052, choices: [4052, 4520, 452, 4502], answer: 0 };
    expect(questionText(q, "de")).toBe("Welche Zahl ist das? viertausendzweiundfünfzig");
  });
  it("explains a number line", () => {
    const q: PlaceQuestion = { kind: "number-line", n: 4700, lower: 4000, step: 100, choices: [4700, 4800, 4600, 4070], answer: 0 };
    expect(questionSteps(q, "de").map(nb)).toEqual([
      "Der Strahl beginnt bei 4 000. Jeder Strich ist 100 weiter.",
      "Der Pfeil zeigt auf den 7. Strich: 4 000 + 7 · 100 = 4 700",
    ]);
  });
  it("has text and working for every generated question", () => {
    const r = seededRandom(8);
    for (const level of [1_000, 1_000_000, 1_000_000_000] as const) {
      for (let i = 0; i < 60; i++) {
        const q = makePlaceQuestion(level, r);
        for (const lang of ["de", "en"] as const) {
          expect(questionText(q, lang)).not.toContain("undefined");
          for (const s of questionSteps(q, lang)) expect(s).not.toContain("undefined");
        }
      }
    }
  });
  it("formats numbers per language", () => {
    expect(nb(show(1234567, "de"))).toBe("1 234 567");
    expect(show(1234567, "en")).toBe("1,234,567");
  });
});
