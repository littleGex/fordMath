import { median } from "./median";

describe("median", () => {
  it("takes the middle of an odd count", () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it("averages the middle pair of an even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("sorts floats correctly", () => {
    expect(median([2.5, 0.5, 1.5])).toBe(1.5);
  });
  it("sorts numerically, not as strings", () => {
    expect(median([10, 9, 1.5])).toBe(9);
  });
  it("does not mutate the input", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
  it("throws on an empty array", () => {
    expect(() => median([])).toThrow();
  });
});
