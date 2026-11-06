import { makeIntQuestion, move } from "../lib/integers";
import { seededRandom } from "../lib/random";
import { choiceText, compareSteps, explainMove, int, quizPrompt, quizSteps, storyText } from "./integers";

describe("explainMove", () => {
  it("plus a positive, crossing zero", () => {
    expect(explainMove(move(-3, "+", 5), "de")).toEqual([
      "Starte bei −3.", "Plus 5 heißt: 5 nach oben.", "Du gehst über die 0: erst 3 bis zur 0, dann noch 2.", "−3 + 5 = 2",
    ]);
  });
  it("minus a negative is plus", () => {
    expect(explainMove(move(4, "-", -3), "de")).toEqual([
      "Starte bei 4.", "Minus eine negative Zahl ist dasselbe wie plus: 4 − (−3) = 4 + 3.", "Also 3 nach oben.", "4 − (−3) = 7",
    ]);
  });
  it("plus a negative is minus", () => {
    expect(explainMove(move(-3, "+", -5), "en")).toEqual([
      "Start at −3.", "Adding a negative number is the same as subtracting: −3 + (−5) = −3 − 5.", "So 5 down.", "−3 + (−5) = −8",
    ]);
  });
});

describe("comparing and stories", () => {
  it("−7 < −3, with the warning about negatives", () => {
    expect(compareSteps(-7, -3, "de")).toEqual([
      "Auf dem Zahlenstrahl liegt −7 weiter unten (links) als −3.",
      "−7 < −3",
      "Vorsicht: Bei negativen Zahlen ist die mit dem größeren Betrag die kleinere. 7 Grad unter null ist kälter als 3.",
    ]);
  });
  it("stories", () => {
    expect(storyText({ kind: "temperature", start: -4, change: 7 }, "de")).toBe("Es ist −4 °C. Es wird 7 Grad wärmer. Wie warm ist es dann?");
    expect(storyText({ kind: "lift", start: -2, change: 5 }, "de")).toBe("Der Aufzug ist im 2. Untergeschoss (−2) und fährt 5 Stockwerke hoch. In welchem Stockwerk hält er?");
    expect(storyText({ kind: "account", start: -20, change: -30 }, "en")).toBe("The bank account has −20 €. You spend 30 €. How much is in the account then?");
  });
  it("writes negatives with a real minus sign", () => {
    expect(int(-5)).toBe("−5");
    expect(int(0)).toBe("0");
  });
  it("every quiz question reads well", () => {
    const r = seededRandom(9);
    for (let i = 0; i < 300; i++) {
      const q = makeIntQuestion(r);
      for (const lang of ["de", "en"] as const) {
        const text = [quizPrompt(q, lang), ...quizSteps(q, lang), ...q.choices.map((c) => choiceText(q, c))].join("\n");
        expect(text).not.toMatch(/undefined|NaN|--|−−|\+ −\d/);
      }
    }
  });
});
