import { formatFor, formatNumber, parseCoefficient, parseValues, prettyFor, prettyNumber } from "./parse";

describe("parseValues", () => {
  it("splits on commas, spaces and semicolons", () => {
    expect(parseValues("3, 1.5; -2  4")).toEqual([3, 1.5, -2, 4]);
  });
  it("accepts leading dots and exponents", () => {
    expect(parseValues(".5 1e3")).toEqual([0.5, 1000]);
  });
  it("accepts a typographic minus", () => {
    expect(parseValues("−2, 3")).toEqual([-2, 3]);
  });
  it("returns [] for blank input", () => {
    expect(parseValues("   ")).toEqual([]);
  });
  it("rejects words", () => {
    expect(() => parseValues("1, two")).toThrow('"two"');
  });
});

describe("parseCoefficient", () => {
  it("parses ints and floats", () => {
    expect(parseCoefficient("2.5", "a")).toBe(2.5);
    expect(parseCoefficient(" -3 ", "b")).toBe(-3);
  });
  it("accepts a decimal comma", () => {
    expect(parseCoefficient("2,5", "a")).toBe(2.5);
  });
  it("accepts a typographic minus", () => {
    expect(parseCoefficient("−0.5", "c")).toBe(-0.5);
  });
  it("asks for a value when empty", () => {
    expect(() => parseCoefficient("", "c")).toThrow("Enter a value for c");
  });
  it("names the field when it isn't a number", () => {
    expect(() => parseCoefficient("abc", "b")).toThrow('b = "abc"');
  });
});

describe("formatNumber", () => {
  it("trims float noise", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
  });
  it("keeps integers plain", () => {
    expect(formatNumber(42)).toBe("42");
  });
  it("rounds to 6 decimals", () => {
    expect(formatNumber(2 / 3)).toBe("0.666667");
  });
  it("doesn't show tiny values as 0", () => {
    expect(formatNumber(-1e-8)).toBe("-1e-8");
    expect(formatNumber(0.000012346)).toBe("1.2346e-5");
  });
  it("shortens huge values", () => {
    expect(formatNumber(1e16)).toBe("1e+16");
    expect(formatNumber(123456789)).toBe("123456789");
  });
  it("prints −0 as 0", () => {
    expect(formatNumber(-0)).toBe("0");
  });
});

describe("prettyNumber", () => {
  it("uses a real minus sign", () => {
    expect(prettyNumber(-5)).toBe("−5");
    expect(prettyNumber(5)).toBe("5");
  });
  it("writes exponents as powers of ten", () => {
    expect(prettyNumber(-1e-8)).toBe("−1 × 10⁻⁸");
    expect(prettyNumber(-2.5e15)).toBe("−2.5 × 10¹⁵");
  });
});

describe("German number style", () => {
  it("reads a decimal comma when values are separated by semicolons or spaces", () => {
    expect(parseValues("2,5; 3; −4,5", "de")).toEqual([2.5, 3, -4.5]);
    expect(parseValues("2,5 3 4,75", "de")).toEqual([2.5, 3, 4.75]);
  });
  it("still splits on commas without a semicolon", () => {
    expect(parseValues("2, 4, 4, 5", "de")).toEqual([2, 4, 4, 5]);
    expect(parseValues("2,4,4,5", "de")).toEqual([2, 4, 4, 5]);
  });
  it("says what's wrong in German", () => {
    expect(() => parseValues("1; zwei", "de")).toThrow("„zwei“ ist keine Zahl");
    expect(() => parseCoefficient("", "c", "de")).toThrow("Gib einen Wert für c ein");
  });
  it("writes a decimal comma", () => {
    expect(formatFor("de")(2.5)).toBe("2,5");
    expect(formatFor("en")(2.5)).toBe("2.5");
    expect(prettyFor("de")(-1.5)).toBe("−1,5");
    expect(prettyFor("de")(2.5e15)).toBe("2,5 × 10¹⁵");
  });
});
