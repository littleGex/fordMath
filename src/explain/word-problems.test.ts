import { dec } from "../lib/decimal";
import { seededRandom } from "../lib/random";
import { TEMPLATES, makeProblem, type TemplateId, type WordProblem } from "../lib/word-problems";
import { calcText, numberText, solution, storyFor } from "./word-problems";

const CHANGE: WordProblem = {
  template: "change", level: "grundschule",
  n: { a: dec(4), b: dec(3), c: dec(20), age: dec(8) }, needed: ["a", "b", "c"],
  calc: "20 − (4 + 3)", wrongCalcs: ["4 + 3", "20 − 4"], answer: dec(13), wrongAnswer: dec(7),
};

describe("word problem texts", () => {
  it("the worked solution, Frage, Zahlen, Rechnung, Antwort", () => {
    expect(solution(CHANGE, "de")).toEqual([
      "Frage: Wie viel Geld bekommt Tim zurück?",
      "Du brauchst: 4 € (der Preis des Hefts), 3 € (der Preis des Stifts), 20 € (der Schein).",
      "Nicht gebraucht: 8 (Tims Alter).",
      "Rechnung: 20 − (4 + 3) = 20 − 7 = 13",
      "Antwort: Tim bekommt 13 € zurück.",
    ]);
  });
  it("decimals with a comma in German", () => {
    expect(calcText("5.00 − (4 · 0.35 + 1.20)", "de")).toBe("5,00 − (4 · 0,35 + 1,20)");
    expect(calcText("5.00 − 1.20", "en")).toBe("5.00 − 1.20");
    const p = makeProblem("bakery", seededRandom(1));
    expect(numberText(p, "paid", "de")).toMatch(/^\d+,00 €$/);
  });
  it.each(Object.keys(TEMPLATES) as TemplateId[])("%s: every number key appears in the story, in both languages", (id) => {
    const r = seededRandom(4);
    for (let i = 0; i < 50; i++) {
      const p = makeProblem(id, r);
      for (const lang of ["de", "en"] as const) {
        const t = storyFor(p, lang);
        const keys = t.story.flat().filter((s): s is { key: string } => typeof s !== "string").map((s) => s.key);
        for (const k of Object.keys(p.n)) if (!(id === "club" && k === "months")) expect(keys).toContain(k);
        for (const k of keys) expect(p.n[k]).toBeDefined();
        for (const k of Object.keys(p.n)) expect(t.labels[k]).toBeDefined();
        expect(new Set(t.questions).size).toBe(3);
        expect(solution(p, lang).join("\n")).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
