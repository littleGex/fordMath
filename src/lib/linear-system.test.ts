import { eq, makeSystem, satisfies, solveSystem } from "./linear-system";
import { seededRandom } from "./random";
import { rat } from "./rational";

describe("solveSystem", () => {
  it("one solution", () => {
    expect(solveSystem(eq(2, 3, 13), eq(1, -1, -1))).toEqual({ kind: "unique", x: rat(2), y: rat(3) });
  });
  it("a fraction as the answer, exactly", () => {
    expect(solveSystem(eq(1, 1, 3), eq(1, -1, 0))).toEqual({ kind: "unique", x: rat(3, 2), y: rat(3, 2) });
  });
  it("decimals in the coefficients", () => {
    // 0.1x + 0.2y = 0.5 and x − y = −1 → x = 1, y = 2 (no rounding errors)
    expect(solveSystem(eq(rat(1, 10), rat(2, 10), rat(5, 10)), eq(1, -1, -1))).toEqual({ kind: "unique", x: rat(1), y: rat(2) });
  });
  it("a zero where a method would divide (x missing from the first equation)", () => {
    expect(solveSystem(eq(0, 2, 6), eq(3, 1, 9))).toEqual({ kind: "unique", x: rat(2), y: rat(3) });
  });
  it("parallel lines have no solution", () => {
    expect(solveSystem(eq(1, 2, 3), eq(2, 4, 7))).toEqual({ kind: "none", why: "parallel" });
  });
  it("the same line twice has infinitely many", () => {
    expect(solveSystem(eq(1, 2, 3), eq(-2, -4, -6))).toEqual({ kind: "infinite", line: eq(1, 2, 3) });
  });
  it("0 = 5 can never be true", () => {
    expect(solveSystem(eq(0, 0, 5), eq(1, 1, 2))).toEqual({ kind: "none", why: "contradiction" });
  });
  it("0 = 0 says nothing: the other equation decides", () => {
    expect(solveSystem(eq(0, 0, 0), eq(1, 1, 2))).toEqual({ kind: "infinite", line: eq(1, 1, 2) });
    expect(solveSystem(eq(0, 0, 0), eq(0, 0, 0))).toEqual({ kind: "all" });
  });
  it("vertical and horizontal lines", () => {
    expect(solveSystem(eq(1, 0, 4), eq(0, 1, -2))).toEqual({ kind: "unique", x: rat(4), y: rat(-2) });
    expect(solveSystem(eq(1, 0, 4), eq(2, 0, 3))).toEqual({ kind: "none", why: "parallel" });
  });
});

describe("makeSystem", () => {
  it("always has the whole-number solution it was built from", () => {
    const r = seededRandom(10);
    for (let i = 0; i < 300; i++) {
      const { e1, e2, x, y } = makeSystem(r);
      expect(solveSystem(e1, e2)).toEqual({ kind: "unique", x: rat(x), y: rat(y) });
      expect(satisfies(e1, rat(x), rat(y)) && satisfies(e2, rat(x), rat(y))).toBe(true);
      for (const c of [e1.a, e1.b, e2.a, e2.b]) expect(Math.abs(c.n)).toBeGreaterThanOrEqual(1);
    }
  });
});
