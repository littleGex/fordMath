import { pickWeighted, randomInt, seededRandom } from "./random";

describe("seededRandom", () => {
  it("gives the same sequence for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("gives a different sequence for a different seed", () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
  it("stays in [0, 1)", () => {
    const r = seededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("randomInt", () => {
  it("covers both ends of the range and nothing outside", () => {
    const r = seededRandom(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randomInt(r, 1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("pickWeighted", () => {
  it("picks heavier items more often", () => {
    const r = seededRandom(9);
    let heavy = 0;
    for (let i = 0; i < 2000; i++) if (pickWeighted(["a", "b"], (x) => (x === "a" ? 9 : 1), r) === "a") heavy++;
    expect(heavy / 2000).toBeGreaterThan(0.85);
    expect(heavy / 2000).toBeLessThan(0.95);
  });
  it("never picks a zero-weight item", () => {
    const r = seededRandom(1);
    for (let i = 0; i < 200; i++) expect(pickWeighted([1, 2, 3], (x) => (x === 2 ? 0 : 1), r)).not.toBe(2);
  });
  it("throws when there is nothing to pick", () => {
    expect(() => pickWeighted([], () => 1, Math.random)).toThrow();
  });
});
