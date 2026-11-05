import * as validate from "./validate";
import { getStats } from "./stats";

describe("getStats", () => {
  it("composes all three results", () => {
    const s = getStats([1, 2, 2]);
    expect(s.mean).toBeCloseTo(5 / 3);
    expect(s.median).toBe(2);
    expect(s.mode).toEqual([2]);
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
