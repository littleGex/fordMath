import { mode } from "./mode";

describe("mode", () => {
  it("finds a single mode", () => {
    expect(mode([1, 2, 2, 3])).toEqual([2]);
  });
  it("returns every tied value, sorted", () => {
    expect(mode([3, 3, 1, 1, 2])).toEqual([1, 3]);
  });
  it("returns [] when every value is unique", () => {
    expect(mode([1, 2, 3])).toEqual([]);
  });
  it("works with floats", () => {
    expect(mode([1.5, 1.5, 2])).toEqual([1.5]);
  });
  it("treats 0.1 + 0.2 and 0.3 as different values", () => {
    expect(mode([0.1 + 0.2, 0.3])).toEqual([]);
  });
  it("throws on an empty array", () => {
    expect(() => mode([])).toThrow();
  });
});
