import { boxPlot, iqr, percentile, quartilePositions, quartiles } from "./quartiles";

const TEXTBOOK = [2, 4, 4, 4, 5, 5, 7, 9];
const WIKI = [6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49]; // the example on Wikipedia's "Quartile" page

describe("percentile (linear, like NumPy)", () => {
  // Expected values from numpy.percentile with its default method.
  it.each([
    [TEXTBOOK, [2, 3.4, 4, 4.5, 5.5, 7.6, 9]],
    [[7, 2, 9, 4, 4], [2, 2.8, 4, 4, 7, 8.2, 9]],
    [[2, 3, 3, 4, 5, 40], [2, 2.5, 3, 3.5, 4.75, 22.5, 40]],
    [[1, 2, 3, 4], [1, 1.3, 1.75, 2.5, 3.25, 3.7, 4]],
    [WIKI, [6, 7, 25.5, 40, 42.5, 47, 49]],
  ])("%j", (values, expected) => {
    [0, 10, 25, 50, 75, 90, 100].forEach((p, i) => expect(percentile(values, p)).toBeCloseTo(expected[i]!, 10));
  });
  it("p = 0 is the smallest and p = 100 the largest value", () => {
    expect(percentile([5, -1, 3], 0)).toBe(-1);
    expect(percentile([5, -1, 3], 100)).toBe(5);
  });
  it("works for a single value", () => {
    expect(percentile([7], 33)).toBe(7);
  });
  it("doesn't change the input", () => {
    const v = [3, 1, 2];
    percentile(v, 50);
    expect(v).toEqual([3, 1, 2]);
  });
  it.each([-1, 101, NaN, Infinity])("rejects p = %s", (p) => {
    expect(() => percentile([1, 2], p)).toThrow("from 0 to 100");
  });
  it("rejects bad values", () => {
    expect(() => percentile([], 50)).toThrow();
    expect(() => percentile([1, NaN], 50)).toThrow();
  });
});

describe("quartiles", () => {
  it("halves, even count: the median of each half", () => {
    expect(quartiles(TEXTBOOK)).toEqual({ q1: 4, q2: 4.5, q3: 6, iqr: 2 });
  });
  it("halves, odd count: the median belongs to neither half", () => {
    expect(quartiles(WIKI)).toEqual({ q1: 15, q2: 40, q3: 43, iqr: 28 });
    expect(quartiles([7, 2, 9, 4, 4])).toEqual({ q1: 3, q2: 4, q3: 8, iqr: 5 });
  });
  it("linear matches NumPy", () => {
    expect(quartiles(WIKI, "linear")).toEqual({ q1: 25.5, q2: 40, q3: 42.5, iqr: 17 });
  });
  it.each(["halves", "linear"] as const)("%s: one value, and two values", (m) => {
    expect(quartiles([4], m)).toEqual({ q1: 4, q2: 4, q3: 4, iqr: 0 });
    expect(quartiles([2, 6], m).q2).toBe(4);
  });
  it("iqr on its own", () => {
    expect(iqr(TEXTBOOK)).toBe(2);
    expect(iqr(TEXTBOOK, "linear")).toBe(1.5);
  });
  it("works with decimals and negatives", () => {
    expect(quartiles([-2, 0.25, 1.75, 3.5])).toEqual({ q1: -0.875, q2: 1, q3: 2.625, iqr: 3.5 });
  });
});

describe("boxPlot and the 1.5 × IQR rule", () => {
  it("finds a high outlier and stops the whisker at the last value inside", () => {
    const b = boxPlot([2, 3, 3, 4, 5, 40]);
    expect(b).toMatchObject({ min: 2, max: 40, q1: 3, q3: 5, iqr: 2, lowerFence: 0, upperFence: 8, whiskerLow: 2, whiskerHigh: 5, outliers: [40] });
  });
  it("a value exactly on the fence is not an outlier", () => {
    const b = boxPlot([0, 3, 3, 5, 5, 8]); // Q1 3, Q3 5, fences 0 and 8
    expect(b.outliers).toEqual([]);
    expect([b.whiskerLow, b.whiskerHigh]).toEqual([0, 8]);
  });
  it("finds outliers on both sides, keeping repeats", () => {
    expect(boxPlot([-50, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 90, 90]).outliers).toEqual([-50, 90, 90]);
  });
  it("no outliers when all values are equal", () => {
    expect(boxPlot([5, 5, 5])).toMatchObject({ iqr: 0, outliers: [], whiskerLow: 5, whiskerHigh: 5 });
  });
  it("the method can change what counts as an outlier", () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 14];
    expect(boxPlot(v)).toMatchObject({ q3: 7.5, upperFence: 15, outliers: [] });
    expect(boxPlot(v, "linear")).toMatchObject({ q3: 7, upperFence: 13, outliers: [14] });
  });
});

describe("quartilePositions", () => {
  it("halves", () => {
    expect(quartilePositions(8, "halves")).toEqual({ q1: 1.5, q2: 3.5, q3: 5.5 });
    expect(quartilePositions(11, "halves")).toEqual({ q1: 2, q2: 5, q3: 8 });
    expect(quartilePositions(1, "halves")).toEqual({ q1: 0, q2: 0, q3: 0 });
  });
  it("linear", () => {
    expect(quartilePositions(8, "linear")).toEqual({ q1: 1.75, q2: 3.5, q3: 5.25 });
  });
  it.each(["halves", "linear"] as const)("%s: reading the sorted list at the positions gives the quartiles", (m) => {
    for (let n = 1; n <= 15; n++) {
      const sorted = Array.from({ length: n }, (_, i) => (i + 1) ** 2); // all different, so positions matter
      const at = (pos: number) => sorted[Math.floor(pos)]! + (pos % 1) * ((sorted[Math.ceil(pos)] ?? 0) - sorted[Math.floor(pos)]!);
      const p = quartilePositions(n, m);
      const q = quartiles(sorted, m);
      expect([at(p.q1), at(p.q2), at(p.q3)]).toEqual([q.q1, q.q2, q.q3]);
    }
  });
});
