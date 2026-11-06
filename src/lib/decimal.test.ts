import {
  add, compare, dec, formatDecimal, fromFraction, makeDecimalQuestion, makeDecimalRound, parseDecimal, placeDigits, roundDecimal,
  subtract, trim, widen, writtenDecimalAdd,
} from "./decimal";
import { seededRandom } from "./random";

const d = (text: string) => parseDecimal(text)!;

describe("reading and writing", () => {
  it.each([["3,25", 325, 2], ["0.5", 5, 1], [",5", 5, 1], ["12", 12, 0], ["0,050", 50, 3], ["7,", 7, 0]])("%s", (text, n, places) => {
    expect(parseDecimal(text)).toEqual({ n, places });
  });
  it.each(["", ",", "-1", "1,2345", "a", "1,2,3", "1 000 000"])("rejects %j", (text) => {
    expect(parseDecimal(text)).toBeNull();
  });
  it("keeps the zeros it was given", () => {
    expect(formatDecimal(d("0,50"))).toBe("0,50");
    expect(formatDecimal(d("1234,5"), "en")).toBe("1,234.5");
    expect(formatDecimal(trim(d("3,000")))).toBe("3");
    expect(formatDecimal(widen(d("0,5"), 3))).toBe("0,500");
  });
});

describe("exact arithmetic", () => {
  it("0,1 + 0,2 = 0,3 exactly", () => {
    expect(add(d("0,1"), d("0,2"))).toEqual(d("0,3"));
  });
  it("lines up the commas", () => {
    expect(formatDecimal(add(d("2,5"), d("0,75")))).toBe("3,25");
    expect(formatDecimal(subtract(d("5"), d("1,25")))).toBe("3,75");
    expect(() => subtract(d("1"), d("2"))).toThrow("negative");
  });
  it("written addition fills with zeros and carries", () => {
    const w = writtenDecimalAdd(d("2,5"), d("0,75"));
    expect(w.places).toBe(2);
    expect(w.rows.map((r) => formatDecimal(r))).toEqual(["2,50", "0,75"]);
    expect(w.steps.map((s) => s.write)).toEqual([5, 2, 3]);
    expect(formatDecimal(w.result)).toBe("3,25");
  });
});

describe("compare", () => {
  it("0,5 is bigger than 0,45, whatever the number of digits", () => {
    expect(compare(d("0,5"), d("0,45"))).toBe(1);
    expect(compare(d("2,25"), d("2,3"))).toBe(-1);
    expect(compare(d("0,5"), d("0,50"))).toBe(0);
  });
});

describe("place values", () => {
  it("Einer, Zehntel, Hundertstel, Tausendstel", () => {
    expect(placeDigits(d("3,472"))).toEqual([[0, 3], [-1, 4], [-2, 7], [-3, 2]]);
    expect(placeDigits(d("120,05"))).toEqual([[2, 1], [1, 2], [0, 0], [-1, 0], [-2, 5]]);
  });
});

describe("roundDecimal", () => {
  it("the next digit decides", () => {
    expect(roundDecimal(d("3,46"), 1)).toMatchObject({ decider: 6, up: true, result: d("3,5") });
    expect(roundDecimal(d("3,44"), 1).result).toEqual(d("3,4"));
    expect(roundDecimal(d("2,995"), 2).result).toEqual(d("3,00"));
    expect(roundDecimal(d("7,5"), 0).result).toEqual(d("8"));
  });
  it("only to fewer places", () => {
    expect(() => roundDecimal(d("3,4"), 1)).toThrow();
  });
});

describe("fromFraction", () => {
  it.each([[1, 2, "0,5"], [1, 4, "0,25"], [3, 4, "0,75"], [37, 100, "0,37"], [3, 100, "0,03"], [125, 1000, "0,125"], [6, 3, "2"]])("%i/%i = %s", (n, den, text) => {
    expect(formatDecimal(fromFraction(n, den)!)).toBe(text);
  });
  it("1/3 has no finite decimal", () => {
    expect(fromFraction(1, 3)).toBeNull();
  });
});

describe("the quiz", () => {
  it("every question has exactly one right choice", () => {
    const r = seededRandom(21);
    for (let i = 0; i < 700; i++) {
      const q = makeDecimalQuestion(r);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      const right = q.choices[q.answer]!;
      switch (q.kind) {
        case "compare": {
          const c = compare(q.a, q.b);
          expect(right).toBe(c > 0 ? formatDecimal(q.a) : c < 0 ? formatDecimal(q.b) : "=");
          break;
        }
        case "smallest": {
          const values = q.choices.map((c) => parseDecimal(c)!);
          expect(values.filter((v) => values.every((w) => compare(v, w) <= 0))).toHaveLength(1);
          expect(values.every((w) => compare(parseDecimal(right)!, w) <= 0)).toBe(true);
          break;
        }
        case "digit":
          expect(Number(right)).toBe(placeDigits(q.d).find(([p]) => p === q.place)![1]);
          break;
        case "round":
          expect(right).toBe(formatDecimal(roundDecimal(q.d, q.places).result));
          break;
        case "fraction":
          expect(compare(parseDecimal(right)!, fromFraction(q.num, q.den)!)).toBe(0);
          break;
        case "add":
        case "subtract":
          expect(right).toBe(formatDecimal(q.kind === "add" ? add(q.a, q.b) : subtract(q.a, q.b)));
          break;
      }
      // No two choices with the same value written differently (0,5 and 0,50), except the "equal" trap itself.
      if (q.kind !== "compare" && q.kind !== "digit") {
        const values = q.choices.map((c) => parseDecimal(c)!);
        for (let a = 0; a < values.length; a++) for (let b = a + 1; b < values.length; b++) expect(compare(values[a]!, values[b]!)).not.toBe(0);
      }
    }
  });
  it("a round mixes the kinds", () => {
    expect(new Set(makeDecimalRound(seededRandom(5)).map((q) => q.kind)).size).toBeGreaterThanOrEqual(5);
  });
  it("dec refuses nonsense", () => {
    expect(() => dec(-1)).toThrow();
    expect(() => dec(1, 4)).toThrow();
  });
});
