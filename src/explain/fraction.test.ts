import { LEVELS, fraction, makeQuestion, toText, type FractionQuestion } from "../lib/fraction";
import { seededRandom } from "../lib/random";
import { barsFor, explainFraction, prompt } from "./fraction";

const ch = (...fs: [number, number][]) => fs.map(([n, d]) => ({ kind: "fraction" as const, value: fraction(n, d) }));
const steps = (q: FractionQuestion, lang: "de" | "en" = "de") => explainFraction(q, lang)[0]!.steps;

describe("explainFraction", () => {
  it("names numerator and denominator from the picture", () => {
    const q: FractionQuestion = { kind: "name-picture", shown: fraction(3, 4), picture: "bar", choices: ch([3, 4]), answer: 0 };
    expect(steps(q)).toEqual([
      "Das Ganze ist in 4 gleich große Teile geteilt. Das ist der Nenner (unten): 4.",
      "3 Teile sind gefärbt. Das ist der Zähler (oben): 3.",
      "Also ist 3/4 gefärbt.",
    ]);
  });
  it("shows expanding with the factor", () => {
    const q: FractionQuestion = { kind: "equivalent", given: fraction(1, 2), factor: 3, choices: ch([3, 6], [2, 3]), answer: 0 };
    expect(steps(q)[1]).toBe("1/2 = 1·3 / 2·3 = 3/6");
  });
  it("simplifies with the ggT", () => {
    const q: FractionQuestion = { kind: "simplify", given: fraction(12, 16), choices: ch([3, 4]), answer: 0 };
    expect(steps(q).slice(1, 3)).toEqual(["Am schnellsten geht es mit dem ggT: ggT(12, 16) = 4.", "12/16 = 12:4 / 16:4 = 3/4"]);
  });
  it("compares with a common denominator", () => {
    const q: FractionQuestion = { kind: "compare", left: fraction(2, 3), right: fraction(3, 4), choices: [], answer: 2 };
    expect(steps(q)).toEqual([
      "Bring beide auf den gleichen Nenner. Der kleinste ist 12 (kgV von 3 und 4).",
      "2/3 = 8/12 und 3/4 = 9/12",
      "8 < 9, also 2/3 < 3/4.",
    ]);
  });
  it("compares numerators when the denominators match", () => {
    const q: FractionQuestion = { kind: "compare", left: fraction(5, 8), right: fraction(3, 8), choices: [], answer: 0 };
    expect(steps(q, "en")).toEqual(["Same denominator: compare the numerators. 5 > 3, so 5/8 > 3/8."]);
  });
  it("adds with the same denominator and warns about adding denominators", () => {
    const q: FractionQuestion = { kind: "add-same", left: fraction(1, 8), right: fraction(3, 8), choices: ch([4, 8]), answer: 0 };
    expect(steps(q)).toEqual([
      "Gleicher Nenner: Zähle die Zähler zusammen, der Nenner bleibt.",
      "1/8 + 3/8 = 1+3 / 8 = 4/8",
      "Achtung: Die Nenner werden nicht addiert. Es bleiben 8tel.",
      "Das kannst du noch kürzen: 4/8 = 1/2.",
    ]);
  });
  it("adds with different denominators", () => {
    const q: FractionQuestion = { kind: "add-different", left: fraction(1, 2), right: fraction(1, 3), choices: ch([5, 6]), answer: 0 };
    expect(steps(q).slice(0, 3)).toEqual([
      "Erst gleichnamig machen: Der gemeinsame Nenner ist 6 (kgV von 2 und 3).",
      "1/2 = 3/6 und 1/3 = 2/6",
      "Jetzt die Zähler addieren: 3/6 + 2/6 = 5/6",
    ]);
  });
});

describe("prompt and bars", () => {
  it("asks the question", () => {
    const q: FractionQuestion = { kind: "simplify", given: fraction(6, 8), choices: ch([3, 4]), answer: 0 };
    expect(prompt(q, "de")).toBe("Kürze 6/8 so weit es geht.");
    expect(barsFor(q).map(toText)).toEqual(["6/8", "3/4"]);
  });
  it("has working and pictures for every generated question in both languages", () => {
    const r = seededRandom(2);
    for (const level of LEVELS) {
      for (let i = 0; i < 50; i++) {
        const q = makeQuestion(level, r);
        for (const lang of ["de", "en"] as const) {
          expect(prompt(q, lang).length).toBeGreaterThan(0);
          expect(explainFraction(q, lang)[0]!.steps.length).toBeGreaterThan(0);
        }
        expect(barsFor(q).length).toBeGreaterThan(0);
      }
    }
  });
});
