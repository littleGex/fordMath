import { explainMean, explainMedian, explainMode, explainStdDev } from "./statistics";

describe("explainMean", () => {
  it("shows the sum and the division", () => {
    expect(explainMean([1, 2, 3, 4])).toEqual([
      "Add up all 4 values: 1 + 2 + 3 + 4 = 10",
      "Divide by how many there are: 10 ÷ 4 = 2.5",
    ]);
  });
  it("shortens long lists", () => {
    const steps = explainMean(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(steps[0]).toContain("… + 20 = 210");
  });
});

describe("explainMedian", () => {
  it("names the middle value for an odd count", () => {
    expect(explainMedian([7, 2, 9, 4, 4])[1]).toContain("the 3rd: 4");
  });
  it("averages the middle pair for an even count", () => {
    const steps = explainMedian([3, 1, 4, 2]);
    expect(steps[0]).toContain("1, 2, 3, 4");
    expect(steps[2]).toBe("The median is halfway between them: (2 + 3) ÷ 2 = 2.5");
  });
});

describe("explainMode", () => {
  it("lists the tally, most frequent first", () => {
    expect(explainMode([1, 2, 2, 3])[0]).toBe("Count how often each value appears: 2 ×2, 1 ×1, 3 ×1");
  });
  it("explains ties", () => {
    expect(explainMode([1, 1, 2, 2])[1]).toContain("1 and 2 are tied");
  });
  it("explains no mode", () => {
    expect(explainMode([1, 2, 3])[1]).toContain("no mode");
  });
});

describe("explainStdDev", () => {
  const steps = explainStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
  it("starts from the mean", () => {
    expect(steps[0]).toBe("Find the mean: 5");
  });
  it("shows the sum of squares", () => {
    expect(steps[2]).toBe("Add the squares: 32");
  });
  it("gives σ and s", () => {
    expect(steps[3]).toContain("σ = 2");
    expect(steps[4]).toContain("n − 1 = 7");
  });
  it("explains why s needs two values", () => {
    expect(explainStdDev([5])[4]).toContain("at least 2 values");
  });
});
