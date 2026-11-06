import { MENTAL_LEVELS, makeQuestion, type MentalQuestion } from "../lib/mental";
import { seededRandom } from "../lib/random";
import { chain, explainMental, questionText } from "./mental";

const q = (level: MentalQuestion["level"], op: "+" | "-", a: number, b: number, missing: MentalQuestion["missing"] = "c"): MentalQuestion =>
  ({ level, op, a, b, c: op === "+" ? a + b : a - b, missing });

describe("questionText and chain", () => {
  it("hides the missing number", () => {
    expect(questionText(q(5, "+", 460, 40, "b"))).toBe("460 + ? = 500");
    expect(questionText(q(5, "-", 100, 25, "a"))).toBe("? − 25 = 75");
  });
  it("writes the jumps the school way", () => {
    expect(chain(47, [3, 5])).toBe("47 + 8 = 47 + 3 + 5 = 50 + 5 = 55");
    expect(chain(63, [-3, -4])).toBe("63 − 7 = 63 − 3 − 4 = 60 − 4 = 56");
  });
});

describe("explainMental", () => {
  it("tens", () => {
    expect(explainMental(q(1, "+", 340, 50), "de")).toEqual([
      "Rechne mit Zehnern: 34 Z + 5 Z = 39 Z.",
      "Das ist wie 34 + 5 = 39, nur mit einer Null dran: 340 + 50 = 390",
    ]);
    expect(explainMental(q(1, "-", 700, 300), "en")[0]).toBe("Work in hundreds: 7 hundreds − 3 hundreds = 4 hundreds.");
  });
  it("to the next ten first", () => {
    expect(explainMental(q(2, "+", 47, 8), "de")).toEqual([
      "Erst bis zum nächsten Zehner: 47 + 3 = 50.",
      "Dann den Rest: 50 + 5 = 55.",
      "47 + 8 = 47 + 3 + 5 = 50 + 5 = 55",
    ]);
  });
  it("step by step", () => {
    expect(explainMental(q(3, "+", 46, 37), "de")[1]).toBe("46 + 37 = 46 + 30 + 7 = 76 + 7 = 83");
  });
  it("Ergänzen in two jumps", () => {
    expect(explainMental(q(5, "+", 347, 53, "b"), "de")).toEqual([
      "Ergänze: Wie weit ist es von 347 bis 400?",
      "Von 347 bis 350 sind es 3, von 350 bis 400 sind es 50.",
      "Zusammen: 3 + 50 = 53",
      "347 + 53 = 400",
    ]);
  });
  it("the Umkehraufgabe", () => {
    expect(explainMental(q(5, "-", 100, 25, "a"), "de")[0]).toBe("Rechne mit der Umkehraufgabe: ? − 25 = 75 heißt 75 + 25 = ?");
  });
  it.each(MENTAL_LEVELS)("level %i: every explanation ends with the right sum, in both languages", (level) => {
    const r = seededRandom(level);
    for (let i = 0; i < 200; i++) {
      const question = makeQuestion(level, r);
      for (const lang of ["de", "en"] as const) {
        const lines = explainMental(question, lang);
        expect(lines.join(" ")).not.toMatch(/undefined|NaN|\+ −|− −/);
        expect(lines.at(-1)!.endsWith(`= ${question.c}`)).toBe(true);
        expect(lines.join(" ")).toContain(String(question[question.missing]));
      }
    }
  });
});
