import * as validate from "./validate";
import { getStats } from "./stats";

describe("getStats", () => {
  it("composes every result", () => {
    const s = getStats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.count).toBe(8);
    expect(s.mean).toBe(5);
    expect(s.median).toBe(4.5);
    expect(s.mode).toEqual([4]);
    expect(s.stdDev).toBe(2);
    expect(s.sampleStdDev).toBeCloseTo(Math.sqrt(32 / 7));
  });
  it("gives sampleStdDev null for a single value", () => {
    const s = getStats([7]);
    expect(s.stdDev).toBe(0);
    expect(s.sampleStdDev).toBeNull();
  });
  it("validates only once", () => {
    const spy = vi.spyOn(validate, "assertValid");
    getStats([1, 2, 3]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
  it("throws on an empty array", () => {
    expect(() => getStats([])).toThrow("empty");
  });
});
