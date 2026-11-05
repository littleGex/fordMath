import { formatNumber, parseValues } from "./parse";

describe("parseValues", () => {
  it("splits on commas, spaces and semicolons", () => {
    expect(parseValues("3, 1.5; -2  4")).toEqual([3, 1.5, -2, 4]);
  });
  it("accepts leading dots and exponents", () => {
    expect(parseValues(".5 1e3")).toEqual([0.5, 1000]);
  });
  it("returns [] for blank input", () => {
    expect(parseValues("   ")).toEqual([]);
  });
  it("rejects words", () => {
    expect(() => parseValues("1, two")).toThrow('"two"');
  });
});

describe("formatNumber", () => {
  it("trims float noise", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
  });
  it("keeps integers plain", () => {
    expect(formatNumber(42)).toBe("42");
  });
});
