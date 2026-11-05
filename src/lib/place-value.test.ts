import { englishWords, germanWords } from "./number-words";
import {
  digitAt, groupDigits, joinPlaces, makePlaceQuestion, roundTo, setDigit, splitPlaces,
  type PlaceLevel, type PlaceQuestion,
} from "./place-value";
import { seededRandom } from "./random";

describe("splitPlaces and joinPlaces", () => {
  it("splits 4572 into its place values", () => {
    expect(splitPlaces(4572)).toEqual([
      { place: 3, digit: 4, value: 4000 },
      { place: 2, digit: 5, value: 500 },
      { place: 1, digit: 7, value: 70 },
      { place: 0, digit: 2, value: 2 },
    ]);
  });
  it("keeps zeros inside the number", () => {
    expect(splitPlaces(4052).map((p) => p.digit)).toEqual([4, 0, 5, 2]);
  });
  it("joins back to the same number for random numbers", () => {
    const r = seededRandom(17);
    for (let i = 0; i < 300; i++) {
      const n = Math.floor(r() * 1e12);
      expect(joinPlaces(splitPlaces(n))).toBe(n);
    }
  });
  it("reads and changes single digits", () => {
    expect(digitAt(4572, 2)).toBe(5);
    expect(setDigit(4572, 2, 9)).toBe(4972);
    expect(setDigit(4572, 4, 1)).toBe(14572);
    expect(() => setDigit(4572, 0, 10)).toThrow("0 to 9");
  });
  it("groups digits in threes", () => {
    expect(groupDigits(3405210, " ")).toBe("3 405 210");
    expect(groupDigits(999, " ")).toBe("999");
  });
});

describe("roundTo", () => {
  it("rounds up from 5", () => {
    expect(roundTo(4572, 2)).toEqual({ n: 4572, place: 2, decider: 7, up: true, lower: 4500, upper: 4600, result: 4600 });
    expect(roundTo(4550, 2).result).toBe(4600); // exactly halfway rounds up
    expect(roundTo(4549, 2).result).toBe(4500);
  });
  it("rolls over to the next place", () => {
    expect(roundTo(9999, 3).result).toBe(10000);
    expect(roundTo(95, 1).result).toBe(100);
  });
  it("keeps numbers that are already round", () => {
    expect(roundTo(4500, 2).result).toBe(4500);
  });
  it("rounds big numbers", () => {
    expect(roundTo(3405210, 6).result).toBe(3000000);
    expect(roundTo(3405210, 5).result).toBe(3400000);
  });
});

describe("germanWords", () => {
  it.each([
    [0, "null"], [1, "eins"], [16, "sechzehn"], [17, "siebzehn"], [21, "einundzwanzig"], [30, "dreißig"],
    [101, "einhunderteins"], [111, "einhundertelf"], [999, "neunhundertneunundneunzig"],
    [1001, "eintausendeins"], [4572, "viertausendfünfhundertzweiundsiebzig"], [21000, "einundzwanzigtausend"],
    [100000, "einhunderttausend"], [1000000, "eine Million"], [1000001, "eine Million eins"],
    [2000000, "zwei Millionen"], [3405210, "drei Millionen vierhundertfünftausendzweihundertzehn"],
    [1000000000, "eine Milliarde"], [7000000500, "sieben Milliarden fünfhundert"],
  ])("%i → %s", (n, words) => {
    expect(germanWords(n)).toBe(words);
  });
});

describe("englishWords", () => {
  it.each([
    [0, "zero"], [21, "twenty-one"], [101, "one hundred and one"], [1001, "one thousand and one"],
    [4572, "four thousand five hundred and seventy-two"], [100000, "one hundred thousand"],
    [3405210, "three million four hundred and five thousand two hundred and ten"], [1000000000, "one billion"],
  ])("%i → %s", (n, words) => {
    expect(englishWords(n)).toBe(words);
  });
  it("refuses numbers outside the range", () => {
    expect(() => englishWords(-1)).toThrow();
    expect(() => germanWords(1e12)).toThrow();
  });
});

/** The right answer, worked out independently of the generator. */
function rightAnswer(q: PlaceQuestion): number {
  switch (q.kind) {
    case "round": return roundTo(q.n, q.place).result;
    case "digit-value": return digitAt(q.n, q.place) * 10 ** q.place;
    case "words":
    case "number-line": return q.n;
  }
}

describe("makePlaceQuestion", () => {
  it.each([1_000, 1_000_000, 1_000_000_000] as const)("questions up to %i have exactly one right answer", (level: PlaceLevel) => {
    const r = seededRandom(level % 997);
    const kinds = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const q = makePlaceQuestion(level, r);
      kinds.add(q.kind);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices.filter((c) => c === rightAnswer(q))).toHaveLength(1);
      expect(q.choices[q.answer]).toBe(rightAnswer(q));
      for (const c of q.choices) expect(c).toBeGreaterThanOrEqual(0);
      if (q.kind !== "number-line") expect(q.n).toBeLessThan(level);
    }
    expect(kinds.size).toBe(4);
  });
  it("only asks about the value of a digit that isn't 0", () => {
    const r = seededRandom(4);
    for (let i = 0; i < 300; i++) {
      const q = makePlaceQuestion(1_000_000, r);
      if (q.kind === "digit-value") expect(digitAt(q.n, q.place)).toBeGreaterThan(0);
    }
  });
});
