import { explainOutliers, explainQuartiles } from "./quartiles";

describe("explainQuartiles", () => {
  it("halves, even count", () => {
    expect(explainQuartiles([9, 2, 4, 4, 4, 5, 5, 7], "halves")).toEqual([
      "Sort the 8 values: 2, 4, 4, 4, 5, 5, 7, 9",
      "The median (4.5) splits the 8 values into two halves of 4.",
      "Q1 is the median of the lower half (2, 4, 4, 4): halfway between 4 and 4: (4 + 4) ÷ 2 = 4",
      "Q3 is the median of the upper half (5, 5, 7, 9): halfway between 5 and 7: (5 + 7) ÷ 2 = 6",
      "Interquartile range: IQR = Q3 − Q1 = 6 − 4 = 2. The middle half of the values lies between 4 and 6.",
    ]);
  });
  it("halves, odd count leaves the median out", () => {
    const steps = explainQuartiles([7, 2, 9, 4, 4], "halves");
    expect(steps[1]).toBe("The median (4, the 3rd value) is in the middle and belongs to neither half, so each half has 2.");
    expect(steps[2]).toBe("Q1 is the median of the lower half (2, 4): halfway between 2 and 4: (2 + 4) ÷ 2 = 3");
  });
  it("linear shows the interpolation step", () => {
    const steps = explainQuartiles([1, 2, 3, 4], "linear");
    expect(steps.slice(1, 3)).toEqual([
      "Q1 sits at position (n − 1) × 0.25 = 3 × 0.25 = 0.75 (the first value is position 0).",
      "That's 0.75 of the way from the 1st value (1) to the 2nd (2): Q1 = 1 + 0.75 × (2 − 1) = 1.75",
    ]);
  });
  it("linear on a whole position reads the value", () => {
    expect(explainQuartiles([1, 2, 3, 4, 5], "linear")[2]).toBe("That's exactly the 2nd value: Q1 = 2");
  });
  it("a single value", () => {
    expect(explainQuartiles([3], "linear")[1]).toBe("With a single value, Q1, the median and Q3 are all 3.");
  });
});

describe("explainOutliers", () => {
  it("names the outlier and the whiskers", () => {
    const steps = explainOutliers([2, 3, 3, 4, 5, 40], "halves");
    expect(steps.slice(0, 4)).toEqual([
      "Lower fence: Q1 − 1.5 × IQR = 3 − 1.5 × 2 = 0",
      "Upper fence: Q3 + 1.5 × IQR = 5 + 1.5 × 2 = 8",
      "40 lies outside the fences, so it is an outlier. A box plot draws it as a separate dot.",
      "The whiskers reach the smallest and largest values that aren't outliers: 2 and 5.",
    ]);
  });
  it("says when there are none", () => {
    expect(explainOutliers([1, 2, 3, 4], "halves")[2]).toBe("Every value lies between -1.5 and 6.5, so there are no outliers.");
  });
});

describe("Quartile auf Deutsch", () => {
  it("halves", () => {
    const steps = explainQuartiles([7, 2, 9, 4, 4], "halves", "de");
    expect(steps[1]).toBe("Der Median (4, der 3. Wert) steht in der Mitte und gehört zu keiner Hälfte, also hat jede Hälfte 2.");
    expect(steps[2]).toBe("Q1 ist der Median der unteren Hälfte (2; 4): genau zwischen 2 und 4: (2 + 4) : 2 = 3");
  });
  it("linear", () => {
    expect(explainQuartiles([1, 2, 3, 4], "linear", "de")[2]).toBe("Das ist 0,75 des Wegs vom 1. Wert (1) zum 2. (2): Q1 = 1 + 0,75 · (2 − 1) = 1,75");
  });
  it("Ausreißer", () => {
    const steps = explainOutliers([2, 3, 3, 4, 5, 40], "halves", "de");
    expect(steps[0]).toContain("Untere Grenze: Q1 − 1,5 · IQR");
    expect(steps[2]).toContain("40 liegt außerhalb der Grenzen");
  });
});
