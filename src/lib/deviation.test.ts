import { standardDeviation, variance } from "./deviation";

// Textbook data set: mean 5, population σ = 2
const CLASSIC = [2, 4, 4, 4, 5, 5, 7, 9];

describe("variance", () => {
  it("population divides by n", () => {
    expect(variance(CLASSIC)).toBe(4);
  });
  it("sample divides by n − 1", () => {
    expect(variance(CLASSIC, "sample")).toBeCloseTo(32 / 7);
  });
  it("is 0 when every value is the same", () => {
    expect(variance([3.5, 3.5, 3.5])).toBe(0);
  });
  it("works with floats", () => {
    expect(variance([0.1, 0.2, 0.3])).toBeCloseTo(0.02 / 3);
  });
  it("throws on an empty array", () => {
    expect(() => variance([])).toThrow("empty");
  });
});

describe("standardDeviation", () => {
  it("population σ of the classic data set is 2", () => {
    expect(standardDeviation(CLASSIC)).toBe(2);
  });
  it("sample s is √(32/7)", () => {
    expect(standardDeviation(CLASSIC, "sample")).toBeCloseTo(Math.sqrt(32 / 7));
  });
  it("is 0 for a single value (population)", () => {
    expect(standardDeviation([42])).toBe(0);
  });
  it("throws for a single value (sample)", () => {
    expect(() => standardDeviation([42], "sample")).toThrow("at least 2");
  });
  it("handles negatives", () => {
    expect(standardDeviation([-1, 1])).toBe(1);
  });
  it("is unchanged by shifting every value", () => {
    const shifted = [1e9 + 1, 1e9 + 2, 1e9 + 3];
    expect(standardDeviation(shifted)).toBeCloseTo(standardDeviation([1, 2, 3]));
  });
  it("scales with the data", () => {
    expect(standardDeviation(CLASSIC.map((v) => v * 10))).toBeCloseTo(20);
  });
  it("does not mutate the input", () => {
    const input = [3, 1, 2];
    standardDeviation(input, "sample");
    expect(input).toEqual([3, 1, 2]);
  });
});
