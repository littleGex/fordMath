import { seededRandom } from "./random";
import { digitsOf, makeProblem, needsCarry, writtenAdd, writtenSubtract, type WrittenSum } from "./written";

/** The answer as written, column by column, ignoring blank leading zeros. */
function written(sum: WrittenSum): number {
  const digits = sum.steps
    .filter((s) => !("leadingZero" in s && s.leadingZero))
    .map((s) => s.write)
    .reverse();
  return Number(digits.join("") || "0");
}

describe("digitsOf", () => {
  it("lists ones first", () => {
    expect(digitsOf(473)).toEqual([3, 7, 4]);
    expect(digitsOf(0)).toEqual([0]);
  });
});

describe("writtenAdd", () => {
  it("adds 473 + 259 with two carries", () => {
    const s = writtenAdd([473, 259]);
    if (s.kind !== "add") throw new Error("expected addition");
    expect(s.steps.map((x) => [x.total, x.write, x.carryOut])).toEqual([[12, 2, 1], [13, 3, 1], [7, 7, 0]]);
    expect(written(s)).toBe(732);
  });
  it("adds an extra column for a final carry", () => {
    const s = writtenAdd([999, 1]);
    expect(s.steps).toHaveLength(4);
    expect(written(s)).toBe(1000);
  });
  it("handles numbers of different lengths", () => {
    const s = writtenAdd([1205, 38]);
    if (s.kind !== "add") throw new Error("expected addition");
    expect(s.steps[2]!.digits).toEqual([2, 0]);
    expect(written(s)).toBe(1243);
  });
  it("adds three numbers, where a carry can be 2", () => {
    const s = writtenAdd([99, 99, 99]);
    if (s.kind !== "add") throw new Error("expected addition");
    expect(s.steps[0]!.carryOut).toBe(2);
    expect(written(s)).toBe(297);
  });
  it("rejects decimals, negatives and a single number", () => {
    expect(() => writtenAdd([2.5, 1])).toThrow("whole number");
    expect(() => writtenAdd([-3, 1])).toThrow("whole number");
    expect(() => writtenAdd([5])).toThrow("two numbers");
  });
});

describe("writtenSubtract: Ergänzungsverfahren", () => {
  it("does 824 − 357 by adding on, with carries under the bottom number", () => {
    const s = writtenSubtract(824, 357, "complement");
    if (s.kind !== "complement") throw new Error("expected complement");
    expect(s.steps.map((x) => [x.lower, x.target, x.write, x.carryOut])).toEqual([
      [7, 14, 7, 1], // 7 + 7 = 14
      [6, 12, 6, 1], // 5 + 1 = 6, 6 + 6 = 12
      [4, 8, 4, 0], // 3 + 1 = 4, 4 + 4 = 8
    ]);
    expect(written(s)).toBe(467);
  });
  it("leaves zeros at the front blank", () => {
    const s = writtenSubtract(105, 98, "complement");
    expect(s.steps.map((x) => ("leadingZero" in x ? x.leadingZero : false))).toEqual([false, true, true]);
    expect(written(s)).toBe(7);
  });
  it("gives 0 for equal numbers, without blanking the ones", () => {
    expect(written(writtenSubtract(55, 55, "complement"))).toBe(0);
  });
});

describe("writtenSubtract: Abziehverfahren mit Entbündeln", () => {
  it("exchanges one ten for ten ones", () => {
    const s = writtenSubtract(824, 357, "borrow");
    if (s.kind !== "borrow") throw new Error("expected borrow");
    expect(s.steps[0]).toMatchObject({ top: 4, bottom: 7, topAfter: 14, write: 7, exchanges: [{ column: 1, from: 2, to: 1 }] });
    expect(s.steps[1]).toMatchObject({ top: 1, bottom: 5, topAfter: 11, write: 6, exchanges: [{ column: 2, from: 8, to: 7 }] });
    expect(s.steps[2]).toMatchObject({ top: 7, bottom: 3, write: 4, exchanges: [] });
  });
  it("borrows across zeros: 1000 − 1", () => {
    const s = writtenSubtract(1000, 1, "borrow");
    if (s.kind !== "borrow") throw new Error("expected borrow");
    expect(s.steps[0]!.exchanges).toEqual([
      { column: 3, from: 1, to: 0 },
      { column: 2, from: 0, to: 9 },
      { column: 1, from: 0, to: 9 },
    ]);
    expect(written(s)).toBe(999);
  });
});

describe("both subtraction methods", () => {
  it("always agree with each other and with a − b", () => {
    const r = seededRandom(15);
    for (let i = 0; i < 500; i++) {
      const a = Math.floor(r() * 100000);
      const b = Math.floor(r() * (a + 1));
      expect(written(writtenSubtract(a, b, "complement"))).toBe(a - b);
      expect(written(writtenSubtract(a, b, "borrow"))).toBe(a - b);
    }
  });
  it("need a carry in exactly the same sums", () => {
    for (const [a, b] of [[824, 357], [865, 432], [1000, 1], [50, 50]] as const) {
      expect(needsCarry(writtenSubtract(a, b, "borrow"))).toBe(needsCarry(writtenSubtract(a, b, "complement")));
    }
  });
  it("refuse to go below zero", () => {
    expect(() => writtenSubtract(3, 5, "borrow")).toThrow("must not be bigger");
  });
});

describe("written addition agrees with +", () => {
  it("for hundreds of random pairs", () => {
    const r = seededRandom(3);
    for (let i = 0; i < 500; i++) {
      const a = Math.floor(r() * 1e6);
      const b = Math.floor(r() * 1e6);
      expect(written(writtenAdd([a, b]))).toBe(a + b);
    }
  });
});

describe("makeProblem", () => {
  const r = seededRandom(8);
  it.each([
    ["add", 100, false], ["add", 100, true], ["add", 1000, false], ["add", 1000, true],
    ["subtract", 100, false], ["subtract", 1000, true], ["subtract", 10000, true],
  ] as const)("%s up to %i with carry=%s", (op, max, carry) => {
    for (let i = 0; i < 40; i++) {
      const [a, b] = makeProblem(op, { max, carry }, r);
      expect(a).toBeLessThan(max);
      expect(b).toBeLessThan(max);
      if (op === "subtract") expect(b).toBeLessThanOrEqual(a);
      const sum = op === "add" ? writtenAdd([a, b]) : writtenSubtract(a, b, "complement");
      expect(needsCarry(sum)).toBe(carry);
    }
  });
});
