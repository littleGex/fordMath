import { discriminant, evaluateQuadratic, solveQuadratic } from "./quadratic";

describe("solveQuadratic: real roots", () => {
  it("finds two integer roots, smallest first", () => {
    const s = solveQuadratic(1, -5, 6);
    expect(s.discriminant).toBe(1);
    expect(s.roots).toEqual({ kind: "two-real", roots: [2, 3] });
  });
  it("finds a repeated root", () => {
    expect(solveQuadratic(1, -2, 1).roots).toEqual({ kind: "repeated", root: 1 });
  });
  it("handles a negative a", () => {
    const s = solveQuadratic(-2, 4, 6);
    expect(s.roots).toEqual({ kind: "two-real", roots: [-1, 3] });
    expect(s.parabola?.opens).toBe("down");
  });
  it("works with float coefficients", () => {
    expect(solveQuadratic(0.5, -1.5, 1).roots).toEqual({ kind: "two-real", roots: [1, 2] });
  });
  it("returns 0, not −0, when c = 0", () => {
    const s = solveQuadratic(1, -3, 0);
    expect(s.roots).toEqual({ kind: "two-real", roots: [0, 3] });
    if (s.roots.kind === "two-real") expect(Object.is(s.roots.roots[0], 0)).toBe(true);
  });
  it("roots are symmetric about the vertex", () => {
    const s = solveQuadratic(3, 7, -11);
    if (s.roots.kind !== "two-real") throw new Error("expected two real roots");
    const [r1, r2] = s.roots.roots;
    expect((r1 + r2) / 2).toBeCloseTo(s.parabola!.vertex.x);
    expect(evaluateQuadratic(3, 7, -11, r1)).toBeCloseTo(0);
    expect(evaluateQuadratic(3, 7, -11, r2)).toBeCloseTo(0);
  });
});

describe("solveQuadratic: floating point", () => {
  it("treats (x − 0.1)² as a repeated root despite rounding", () => {
    const s = solveQuadratic(1, -0.2, 0.01);
    expect(s.roots.kind).toBe("repeated");
    if (s.roots.kind === "repeated") expect(s.roots.root).toBeCloseTo(0.1);
  });
  it("keeps very close but different roots apart", () => {
    expect(solveQuadratic(1, -2, 0.9999999).roots.kind).toBe("two-real");
  });
  it("finds the small root accurately when b² ≫ 4ac", () => {
    const s = solveQuadratic(1, 1e8, 1);
    if (s.roots.kind !== "two-real") throw new Error("expected two real roots");
    const small = s.roots.roots[1];
    expect(Math.abs(small - -1e-8) / 1e-8).toBeLessThan(1e-12);
  });
  it("(why) the textbook formula gets that root about 25% wrong", () => {
    const naive = (-1e8 + Math.sqrt(1e16 - 4)) / 2;
    expect(Math.abs(naive - -1e-8) / 1e-8).toBeGreaterThan(0.1);
  });
});

describe("solveQuadratic: complex roots", () => {
  it("solves x² + 1 = 0 as ±i", () => {
    expect(solveQuadratic(1, 0, 1).roots).toEqual({
      kind: "complex",
      roots: [{ re: 0, im: 1 }, { re: 0, im: -1 }],
    });
  });
  it("solves x² + 2x + 5 = 0 as −1 ± 2i", () => {
    const s = solveQuadratic(1, 2, 5);
    expect(s.discriminant).toBe(-16);
    expect(s.roots).toEqual({ kind: "complex", roots: [{ re: -1, im: 2 }, { re: -1, im: -2 }] });
  });
});

describe("solveQuadratic: not a quadratic (a = 0)", () => {
  it("solves a straight line", () => {
    const s = solveQuadratic(0, 2, -4);
    expect(s.roots).toEqual({ kind: "linear", root: 2 });
    expect(s.discriminant).toBeNull();
    expect(s.parabola).toBeNull();
  });
  it("reports no solution for 5 = 0", () => {
    expect(solveQuadratic(0, 0, 5).roots).toEqual({ kind: "no-solution" });
  });
  it("reports every x for 0 = 0", () => {
    expect(solveQuadratic(0, 0, 0).roots).toEqual({ kind: "every-x" });
  });
});

describe("solveQuadratic: the graph", () => {
  it("finds the vertex, direction and y-intercept", () => {
    expect(solveQuadratic(1, -5, 6).parabola).toEqual({
      vertex: { x: 2.5, y: -0.25 },
      opens: "up",
      yIntercept: 6,
    });
  });
  it("puts a repeated root's vertex on the x-axis", () => {
    expect(solveQuadratic(1, -2, 1).parabola?.vertex).toEqual({ x: 1, y: 0 });
  });
});

describe("input checks", () => {
  it("names the bad coefficient", () => {
    expect(() => solveQuadratic(1, NaN, 2)).toThrow("b must be a finite number");
    expect(() => discriminant(Infinity, 1, 2)).toThrow("a must be");
  });
  it("refuses coefficients too large to square", () => {
    expect(() => solveQuadratic(1, 1e200, 1)).toThrow("too large");
  });
});
