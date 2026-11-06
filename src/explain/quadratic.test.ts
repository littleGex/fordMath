import { solveQuadratic } from "../lib";
import { explainQuadratic, formatComplex, formatEquation, formatRoots } from "./quadratic";

/** All steps of every section as one array, for easy searching. */
const allSteps = (a: number, b: number, c: number) => explainQuadratic(a, b, c).flatMap((s) => s.steps);

describe("formatEquation", () => {
  it("hides 1s and uses real minus signs", () => {
    expect(formatEquation(1, -5, 6)).toBe("x² − 5x + 6 = 0");
  });
  it("skips zero terms", () => {
    expect(formatEquation(2, 0, -8)).toBe("2x² − 8 = 0");
    expect(formatEquation(0, 2, -4)).toBe("2x − 4 = 0");
  });
  it("handles a leading minus and floats", () => {
    expect(formatEquation(-1, 0.5, 0)).toBe("−x² + 0.5x = 0");
  });
  it("handles all zeros", () => {
    expect(formatEquation(0, 0, 0)).toBe("0 = 0");
  });
});

describe("formatComplex", () => {
  it("formats a + bi and a − bi", () => {
    expect(formatComplex({ re: -1, im: 2 })).toBe("−1 + 2i");
    expect(formatComplex({ re: -1, im: -2 })).toBe("−1 − 2i");
  });
  it("drops a zero real part and a 1", () => {
    expect(formatComplex({ re: 0, im: 1 })).toBe("i");
    expect(formatComplex({ re: 0, im: -1 })).toBe("−i");
  });
});

describe("formatRoots", () => {
  it("covers each kind", () => {
    expect(formatRoots(solveQuadratic(1, -5, 6).roots)).toBe("x = 2 or x = 3");
    expect(formatRoots(solveQuadratic(1, -2, 1).roots)).toBe("x = 1 (twice)");
    expect(formatRoots(solveQuadratic(1, 2, 5).roots)).toBe("x = −1 + 2i or −1 − 2i");
    expect(formatRoots(solveQuadratic(0, 2, -4).roots)).toBe("x = 2");
    expect(formatRoots(solveQuadratic(0, 0, 1).roots)).toBe("No solution");
    expect(formatRoots(solveQuadratic(0, 0, 0).roots)).toBe("Every x works");
  });
});

describe("explainQuadratic", () => {
  it("shows the discriminant with the user's numbers", () => {
    expect(allSteps(1, -5, 6)).toContain("Work out the discriminant: D = b² − 4ac = (−5)² − 4 × 1 × 6 = 25 − 24 = 1");
  });
  it("walks through the formula and factorises", () => {
    const steps = allSteps(1, -5, 6);
    expect(steps).toContain("Use the quadratic formula: x = (−b ± √D) ÷ 2a = (5 ± 1) ÷ 2");
    expect(steps).toContain("Taking + gives x = 3; taking − gives x = 2");
    expect(steps).toContain("Factorised: (x − 2)(x − 3) = 0");
  });
  it("shows a decimal √D when it isn't whole", () => {
    expect(allSteps(1, 1, -1).join("\n")).toContain("(−1 ± √5) ÷ 2 = (−1 ± 2.236068) ÷ 2");
  });
  it("explains a repeated root", () => {
    expect(allSteps(1, -2, 1)).toContain("Factorised: (x − 1)² = 0");
  });
  it("explains complex roots", () => {
    const text = allSteps(1, 2, 5).join("\n");
    expect(text).toContain("√D = √(−16) = 4i");
    expect(text).toContain("x = −1 + 2i or x = −1 − 2i");
  });
  it("warns about cancellation when b² ≫ 4ac", () => {
    expect(allSteps(1, 1e8, 1).join("\n")).toContain("loses accuracy");
    expect(allSteps(1, -5, 6).join("\n")).not.toContain("loses accuracy");
  });
  it("describes the graph", () => {
    const text = allSteps(-2, 4, 6).join("\n");
    expect(text).toContain("the vertex is (1, 8)");
    expect(text).toContain("opens downwards");
    expect(text).toContain("at y = c = 6");
  });
  it("handles a straight line", () => {
    const [solving, graph] = explainQuadratic(0, 2, -4);
    expect(solving!.steps[1]).toContain("x = 2");
    expect(graph!.steps[0]).toContain("slope 2");
  });
});

describe("auf Deutsch", () => {
  const de = (a: number, b: number, c: number) => explainQuadratic(a, b, c, "de").flatMap((s) => s.steps);
  it("Mitternachtsformel and p-q-Formel", () => {
    const steps = de(1, -5, 6);
    expect(steps).toContain("Berechne die Diskriminante: D = b² − 4ac = (−5)² − 4 · 1 · 6 = 25 − 24 = 1");
    expect(steps).toContain("Setze in die Mitternachtsformel (abc-Formel) ein: x = (−b ± √D) : 2a = (5 ± 1) : 2");
    expect(steps).toContain("Weil a = 1 ist, geht auch die p-q-Formel mit p = −5 und q = 6: x = −p/2 ± √((p/2)² − q) = 2,5 ± √((−2,5)² − 6) = 2,5 ± 0,5");
  });
  it("no p-q-Formel when a isn't 1", () => {
    expect(de(2, -4, -6).join("\n")).not.toContain("p-q-Formel");
  });
  it("decimal commas, the vertex as S( | ) and the vertex form", () => {
    const text = de(-2, 4, 6).join("\n");
    expect(text).toContain("Scheitelpunkt S(1 | 8)");
    expect(text).toContain("Scheitelpunktform: y = −2(x − 1)² + 8");
    expect(formatRoots(solveQuadratic(2, -1, 0).roots, "de")).toBe("x = 0 oder x = 0,5");
  });
  it("no real solution: L = { }", () => {
    expect(de(1, 2, 5).join("\n")).toContain("L = { }");
  });
});

it("Scheitelpunktform leaves out a = 1", () => {
  expect(explainQuadratic(1, -5, 6, "de")[1]!.steps).toContain("Scheitelpunktform: y = (x − 2,5)² − 0,25");
});
