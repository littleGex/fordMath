import {
  afterDiscount, afterRise, baseValue, decimalString, gross, interest, makePercentQuestion, makePercentRound, net, percentRate, percentValue, solve,
} from "./percent";
import { seededRandom } from "./random";
import { rat } from "./rational";

const r = (n: number, d = 1) => rat(n, d);

describe("the three values", () => {
  it("W, G and p", () => {
    expect(percentValue(r(80), r(15))).toEqual(r(12));
    expect(baseValue(r(12), r(15))).toEqual(r(80));
    expect(percentRate(r(12), r(80))).toEqual(r(15));
  });
  it("solves for whichever is missing", () => {
    expect(solve({ G: r(80), p: r(15) })).toMatchObject({ find: "W", W: r(12) });
    expect(solve({ W: r(12), p: r(15) })).toMatchObject({ find: "G", G: r(80) });
    expect(solve({ W: r(12), G: r(80) })).toMatchObject({ find: "p", p: r(15) });
    expect(() => solve({ G: r(80) })).toThrow();
    expect(() => solve({ G: r(1), W: r(1), p: r(1) })).toThrow();
  });
  it("19 % of 49,99 € exactly", () => {
    expect(decimalString(percentValue(r(4999, 100), r(19)))).toBeNull(); // 9.4981: more than 2 places
    expect(percentValue(r(4999, 100), r(19))).toEqual(r(94981, 10000));
  });
  it("refuses 0", () => {
    expect(() => baseValue(r(5), r(0))).toThrow();
    expect(() => percentRate(r(5), r(0))).toThrow();
  });
});

describe("everyday uses", () => {
  it("discount, rise, VAT and interest", () => {
    expect(afterDiscount(r(80), r(25))).toEqual(r(60));
    expect(afterRise(r(80), r(25))).toEqual(r(100));
    expect(gross(r(100))).toEqual(r(119));
    expect(net(r(119))).toEqual(r(100));
    expect(interest(r(1000), r(5, 2))).toEqual(r(25));
  });
  it("+10 % then −10 % is not where you started", () => {
    expect(afterDiscount(afterRise(r(100), r(10)), r(10))).toEqual(r(99));
  });
});

describe("the quiz", () => {
  it("every question has exactly one right choice, and it's right", () => {
    const rnd = seededRandom(32);
    for (let i = 0; i < 800; i++) {
      const q = makePercentQuestion(rnd);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      const right = q.choices[q.answer]!;
      const num = Number(right);
      switch (q.kind) {
        case "findW": expect(num).toBeCloseTo(q.G * q.p / 100, 9); break;
        case "findG": expect(num).toBeCloseTo(q.W * 100 / q.p, 9); break;
        case "findP": expect(num).toBeCloseTo(q.W / q.G * 100, 9); break;
        case "discount": expect(num).toBeCloseTo(q.G * (100 - q.p) / 100, 9); break;
        case "net": expect(num).toBeCloseTo(q.gross / 1.19, 6); break;
        case "upDown": expect(num).toBeCloseTo(q.G * (1 + q.p / 100) * (1 - q.p / 100), 6); break;
        case "interest": expect(num).toBeCloseTo(q.K * q.p / 100, 9); break;
        case "fraction": {
          const [a, b] = right.split("/").map(Number);
          expect(a! / b!).toBeCloseTo(q.percent / 100, 9);
          for (const c of q.choices) if (c !== right) { const [x, y] = c.split("/").map(Number); expect(Math.abs(x! / y! - q.percent / 100)).toBeGreaterThan(1e-9); }
          break;
        }
      }
      if (q.kind !== "fraction") for (const c of q.choices) if (c !== right) expect(Math.abs(Number(c) - num)).toBeGreaterThan(1e-9);
    }
  });
  it("a round mixes the kinds", () => {
    expect(new Set(makePercentRound(seededRandom(2)).map((q) => q.kind)).size).toBeGreaterThanOrEqual(6);
  });
});
