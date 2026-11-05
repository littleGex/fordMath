import { mean } from "./mean";

describe("mean", () => {
  it("averages integers", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });
  it("averages floats", () => {
    expect(mean([0.1, 0.2])).toBeCloseTo(0.15);
  });
  it("handles negatives", () => {
    expect(mean([-2, 2, -4, 4])).toBe(0);
  });
  it("returns the value for a single element", () => {
    expect(mean([7.25])).toBe(7.25);
  });
  it("throws on an empty array", () => {
    expect(() => mean([])).toThrow();
  });
});
