import {
  divisorSteps, euclidSteps, factorSteps, gcdSteps, lcmSteps, powerForm, primeVerdict, ruleText,
} from "./number-theory";

describe("ruleText", () => {
  it("explains the digit-sum rule with the actual digits", () => {
    expect(ruleText(2754, 9, "de")).toEqual({
      verdict: "2754 ist durch 9 teilbar.",
      why: "Regel für 9: Bilde die Quersumme. 2 + 7 + 5 + 4 = 18, und 18 ist durch 9 teilbar.",
    });
  });
  it("explains the last-digit rule", () => {
    expect(ruleText(358, 5, "en")).toEqual({
      verdict: "358 is not divisible by 5.",
      why: "Rule for 5: look at the last digit. It has to be 0 or 5. Here it is 8.",
    });
  });
  it("explains the rule for 4 and 6", () => {
    expect(ruleText(1316, 4, "de").why).toBe("Regel für 4: Schau auf die letzten zwei Ziffern. 16 ist durch 4 teilbar (16 : 4 = 4).");
    expect(ruleText(81, 6, "de").why).toBe("Regel für 6: Die Zahl muss durch 2 und durch 3 teilbar sein. Durch 2: nein. Durch 3: ja.");
  });
});

describe("divisors and primes", () => {
  it("finds divisor pairs and says when to stop", () => {
    expect(divisorSteps(36, "de")).toEqual([
      "Suche Teilerpaare, die zusammen 36 ergeben, und fang bei 1 an: 1 · 36, 2 · 18, 3 · 12, 4 · 9, 6 · 6.",
      "Bei 6 · 6 treffen sich die Paare: fertig.",
      "Teiler von 36: 1, 2, 3, 4, 6, 9, 12, 18, 36 (9 Teiler).",
    ]);
  });
  it("says whether a number is prime, and why", () => {
    expect(primeVerdict(13, "de")).toBe("13 ist eine Primzahl: Sie hat genau zwei Teiler, 1 und 13.");
    expect(primeVerdict(91, "de")).toBe("91 ist keine Primzahl, denn 91 = 7 · 13.");
    expect(primeVerdict(1, "en")).toBe("1 is not a prime: it has only one divisor.");
  });
});

describe("factorSteps", () => {
  it("writes the division ladder and the power form", () => {
    const steps = factorSteps(360, "de");
    expect(steps.slice(1, 3)).toEqual(["360 : 2 = 180", "180 : 2 = 90"]);
    expect(steps.at(-1)).toBe("360 = 2 · 2 · 2 · 3 · 3 · 5 = 2³ · 3² · 5");
  });
  it("doesn't repeat the power form when there are no powers", () => {
    expect(factorSteps(30, "en").at(-1)).toBe("30 = 2 · 3 · 5");
  });
  it("handles primes and 1", () => {
    expect(factorSteps(97, "de")).toEqual(["97 ist schon eine Primzahl."]);
    expect(factorSteps(1, "de")).toEqual(["1 hat keine Primfaktoren."]);
  });
  it("writes powers above 9", () => {
    expect(powerForm(2 ** 12)).toBe("2¹²");
  });
});

describe("ggT and kgV", () => {
  it("finds the ggT by listing divisors", () => {
    expect(gcdSteps(12, 18, "de")).toEqual([
      "Teiler von 12: 1, 2, 3, 4, 6, 12",
      "Teiler von 18: 1, 2, 3, 6, 9, 18",
      "Gemeinsame Teiler: 1, 2, 3, 6",
      "Der größte davon: ggT(12, 18) = 6",
    ]);
  });
  it("explains a ggT of 1", () => {
    expect(gcdSteps(8, 15, "en").at(-1)).toBe("The gcd is 1: 8 and 15 share no divisor except 1.");
  });
  it("shows Euclid's algorithm", () => {
    expect(euclidSteps(48, 36, "de").slice(1)).toEqual(["48 = 1 · 36 + 12", "36 = 3 · 12 + 0", "Der letzte Teiler vor dem Rest 0 ist der ggT: 12"]);
  });
  it("finds the kgV by listing multiples, then the quick way", () => {
    expect(lcmSteps(4, 6, "de")).toEqual([
      "Vielfache von 4: 4, 8, 12",
      "Vielfache von 6: 6, 12",
      "Das kleinste, das in beiden Listen steht: kgV(4, 6) = 12",
      "Schneller: kgV = 4 · 6 : ggT = 24 : 2 = 12",
    ]);
  });
  it("skips long lists of multiples", () => {
    expect(lcmSteps(7, 13, "en")).toEqual(["Quicker: lcm = 7 · 13 : gcd = 91 : 1 = 91"]);
  });
});
