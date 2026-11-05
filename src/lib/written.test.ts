import { seededRandom } from "./random";
import { digitsOf, makeProblem, needsCarry, writtenAdd, writtenDivide, writtenMultiply, writtenSubtract, type WrittenSum } from "./written";

/** The answer as written, column by column, ignoring blank leading zeros. */
function written(sum: WrittenSum): number {
  if (sum.kind === "multiply" || sum.kind === "divide") throw new Error("column sums only");
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
    expect(s.steps[2]!.digits).toEqual([2]); // 38 has no hundreds digit
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
    if (s.kind !== "complement") throw new Error("expected complement");
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
  it.each([
    [100, false, 2, 1], [100, true, 2, 1], [1000, false, 3, 1], [1000, true, 3, 1], [10000, true, 3, 2], [10000, false, 3, 2],
  ] as const)("multiply, max %i, carry=%s: %i-digit · %i-digit", (max, carry, aLen, bLen) => {
    for (let i = 0; i < 30; i++) {
      const [a, b] = makeProblem("multiply", { max, carry }, r);
      expect(String(a)).toHaveLength(aLen);
      expect(String(b)).toHaveLength(bLen);
      expect(b).toBeGreaterThan(1);
      expect(needsCarry(writtenMultiply(a, b))).toBe(carry);
    }
  });
  it.each([
    [100, false], [100, true], [1000, false], [1000, true], [10000, false], [10000, true],
  ] as const)("divide, max %i, with remainder=%s", (max, rest) => {
    for (let i = 0; i < 30; i++) {
      const [n, d] = makeProblem("divide", { max, carry: rest }, r);
      expect(n).toBeLessThan(max);
      expect(d).toBeGreaterThan(1);
      expect(n % d > 0).toBe(rest);
    }
  });
});

describe("writtenMultiply (German layout)", () => {
  it("does 473 · 26 as 946 and 2838, then adds", () => {
    const s = writtenMultiply(473, 26);
    if (s.kind !== "multiply") throw new Error("expected multiply");
    const lines = s.rows.map((r) => Number(r.steps.map((x) => x.write).reverse().join("")));
    expect(lines).toEqual([946, 2838]); // the 2 first, then the 6
    expect(s.rows.map((r) => r.shift)).toEqual([1, 0]);
    const total = s.addition!.map((x) => x.write).reverse().join("");
    expect(Number(total)).toBe(12298);
  });
  it("writes the last carry in front as its own step", () => {
    const s = writtenMultiply(473, 6);
    if (s.kind !== "multiply") throw new Error("expected multiply");
    expect(s.rows[0]!.steps.map((x) => [x.kind, x.write])).toEqual([["digit", 8], ["digit", 3], ["digit", 8], ["carry", 2]]);
    expect(s.addition).toBeNull(); // one-digit b: the line is the answer
  });
  it("adds the lines column by column, leaving out the blank under the shifted line", () => {
    const s = writtenMultiply(473, 26);
    if (s.kind !== "multiply") throw new Error("expected multiply");
    expect(s.addition![0]!.digits).toEqual([8]); // 946 is shifted: nothing under the ones
    expect(s.addition![1]!.digits).toEqual([6, 3]);
  });
  it("agrees with a · b for many random pairs", () => {
    const r = seededRandom(11);
    for (let i = 0; i < 400; i++) {
      const a = Math.floor(r() * 100000);
      const b = Math.floor(r() * 1000);
      const s = writtenMultiply(a, b);
      if (s.kind !== "multiply") throw new Error("expected multiply");
      const digits = s.addition ? s.addition.map((x) => x.write) : s.rows[0]!.steps.map((x) => x.write);
      expect(Number(digits.reverse().join(""))).toBe(a * b);
    }
  });
  it("handles a 0 inside b", () => {
    const s = writtenMultiply(473, 205);
    if (s.kind !== "multiply") throw new Error("expected multiply");
    expect(s.rows[1]!.value).toBe(0);
    expect(s.result).toBe(96965);
  });
});

describe("writtenDivide (German layout)", () => {
  it("does 285 : 6 = 47 Rest 3", () => {
    const s = writtenDivide(285, 6);
    if (s.kind !== "divide") throw new Error("expected divide");
    expect(s.steps.map((x) => [x.part, x.qDigit, x.product, x.remainder, x.bringDown])).toEqual([
      [28, 4, 24, 4, 5], // 2 is too small, so start with 28
      [45, 7, 42, 3, null],
    ]);
    expect([s.result, s.remainder]).toEqual([47, 3]);
  });
  it("keeps a 0 in the answer: 612 : 6 = 102", () => {
    const s = writtenDivide(612, 6);
    if (s.kind !== "divide") throw new Error("expected divide");
    expect(s.steps.map((x) => x.qDigit)).toEqual([1, 0, 2]);
    expect(s.steps[1]!.shown).toBe("01"); // 0 left over, 1 brought down
  });
  it("gives 0 Rest 5 when the divisor is bigger", () => {
    const s = writtenDivide(5, 6);
    if (s.kind !== "divide") throw new Error("expected divide");
    expect(s.steps).toHaveLength(1);
    expect([s.result, s.remainder]).toEqual([0, 5]);
  });
  it("refuses to divide by 0", () => {
    expect(() => writtenDivide(5, 0)).toThrow("can't divide by 0");
  });
  it("agrees with Math.floor and % for many random pairs", () => {
    const r = seededRandom(12);
    for (let i = 0; i < 400; i++) {
      const n = Math.floor(r() * 1e6);
      const d = 1 + Math.floor(r() * 200);
      const s = writtenDivide(n, d);
      if (s.kind !== "divide") throw new Error("expected divide");
      const q = Number(s.steps.map((x) => x.qDigit).join(""));
      expect(q).toBe(Math.floor(n / d));
      expect(s.steps.at(-1)!.remainder).toBe(n % d);
    }
  });
});
