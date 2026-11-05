import { assertValid, sortNumeric } from "./validate";

describe("assertValid", () => {
  it("throws on an empty array", () => {
    expect(() => assertValid([])).toThrow("empty");
  });
  it("throws on NaN", () => {
    expect(() => assertValid([1, NaN])).toThrow("finite");
  });
  it("throws on Infinity", () => {
    expect(() => assertValid([1, -Infinity])).toThrow("finite");
  });
  it("accepts a mix of ints and floats", () => {
    expect(() => assertValid([1, 2.5, -3])).not.toThrow();
  });
});

describe("sortNumeric", () => {
  it("sorts numerically, not as strings", () => {
    expect(sortNumeric([10, 9, 1.5])).toEqual([1.5, 9, 10]);
  });
  it("does not mutate the input", () => {
    const input = [3, 1, 2];
    sortNumeric(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
