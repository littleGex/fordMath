import type { Question } from "../lib/times-tables";
import { explainQuestion, relatedFacts } from "./times-tables";

const mul = (a: number, b: number): Question => ({ kind: "multiply", a, b, key: `m:${a}x${b}` });
const div = (product: number, divisor: number): Question => ({
  kind: "divide", product, divisor, key: `d:${product / divisor}x${divisor}`,
});
const steps = (q: Question, lang: "de" | "en", section = 0) => explainQuestion(q, lang)[section]!.steps;

describe("explainQuestion: multiplication", () => {
  it("describes the dots picture", () => {
    expect(steps(mul(3, 4), "de")[0]).toBe("3 · 4 heißt: 3 Reihen mit je 4 Punkten.");
    expect(steps(mul(3, 4), "en")[0]).toBe("3 · 4 means 3 rows of 4 dots.");
  });
  it("splits 7 · 8 into 5 · 8 + 2 · 8", () => {
    expect(steps(mul(7, 8), "de")[1]).toBe("Nimm Aufgaben, die du kennst: 7 · 8 = 5 · 8 + 2 · 8 = 40 + 16 = 56");
  });
  it("counts back from 10 for 9 ·", () => {
    expect(steps(mul(9, 6), "en")[1]).toBe("Count back from 10: 9 · 6 = 10 · 6 − 1 · 6 = 60 − 6 = 54");
  });
  it("doubles for 4 ·", () => {
    expect(steps(mul(4, 7), "de")[1]).toBe("4 · 7 ist das Doppelte von 2 · 7: 14 + 14 = 28");
  });
  it("gives tips for the Kernaufgaben", () => {
    expect(steps(mul(5, 8), "de")[1]).toBe("5 · 8 ist die Hälfte von 10 · 8: 80 : 2 = 40");
    expect(steps(mul(10, 3), "en")[1]).toBe("10 · 3: put a 0 on the end of 3: 30");
  });
  it("counts in steps for small numbers of rows", () => {
    expect(steps(mul(3, 4), "de")).toContain("Zähle in 4er-Schritten: 4, 8, 12");
    expect(steps(mul(9, 4), "de").some((s) => s.startsWith("Zähle"))).toBe(false);
  });
  it("lists the related facts, starting with the swapped one", () => {
    expect(steps(mul(7, 8), "de", 1)).toEqual([
      "8 · 7 = 56 (Tauschaufgabe: gleiches Ergebnis)",
      "56 : 7 = 8",
      "56 : 8 = 7",
    ]);
  });
});

describe("explainQuestion: division", () => {
  it("turns division into a times-table question", () => {
    expect(steps(div(56, 8), "de")).toEqual([
      "56 : 8 fragt: Wie oft passt die 8 in die 56?",
      "Denk an die 8er-Reihe: 7 · 8 = 56",
      "Also ist 56 : 8 = 7",
    ]);
    expect(steps(div(56, 8), "en")[0]).toBe("56 : 8 asks: how many 8s make 56?");
  });
  it("lists the other facts in the family", () => {
    expect(steps(div(56, 8), "en", 1)).toEqual(["7 · 8 = 56", "8 · 7 = 56", "56 : 7 = 8"]);
  });
});

describe("relatedFacts", () => {
  it("doesn't repeat itself for square numbers", () => {
    expect(relatedFacts(6, 6)).toEqual(["6 · 6 = 36", "36 : 6 = 6"]);
  });
});

describe("every fact in the 1×1 has an explanation in both languages", () => {
  it("produces non-empty steps for all 100 multiplications and divisions", () => {
    for (let a = 1; a <= 10; a++) {
      for (let b = 1; b <= 10; b++) {
        for (const lang of ["de", "en"] as const) {
          for (const q of [mul(a, b), div(a * b, b)]) {
            for (const section of explainQuestion(q, lang)) expect(section.steps.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
