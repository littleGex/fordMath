import { assertValid, sortNumeric } from "./validate";
import { medianOfSorted } from "./median";

/**
 * There is no single "right" way to find quartiles; books, calculators and programs differ.
 *
 * - "halves": the school method in German textbooks (and Tukey's hinges, almost). Split the
 *   sorted list at the median; Q1 is the median of the lower half, Q3 of the upper half. With
 *   an odd count the median itself belongs to neither half. Q1 and Q3 are always a value from
 *   the list or halfway between two.
 * - "linear": linear interpolation, the default in NumPy (`np.percentile`), Excel's
 *   `QUARTILE.INC` / `PERCENTILE.INC` and R's type 7. The p-th percentile sits at position
 *   (n − 1) · p/100 in the sorted list (counting from 0), and between two values it's read
 *   off the straight line joining them.
 *
 * Both give the same median. For large data sets they barely differ; for 5 values they can.
 */
export type QuartileMethod = "halves" | "linear";

export interface Quartiles {
  q1: number;
  q2: number; // the median
  q3: number;
  /** Interquartile range Q3 − Q1: how wide the middle half of the data is. */
  iqr: number;
}

export interface BoxPlot extends Quartiles {
  min: number;
  max: number;
  /** Anything below Q1 − 1.5 · IQR or above Q3 + 1.5 · IQR counts as an outlier. */
  lowerFence: number;
  upperFence: number;
  /** The whiskers reach the smallest and largest values that are not outliers. */
  whiskerLow: number;
  whiskerHigh: number;
  /** Sorted; duplicates kept, so every outlying value is drawn. */
  outliers: number[];
}

function assertPercent(p: number): void {
  if (!Number.isFinite(p) || p < 0 || p > 100) throw new Error("The percentile must be a number from 0 to 100");
}

/** @internal Linear interpolation on an already sorted, non-empty list. */
export function percentileOfSorted(sorted: readonly number[], p: number): number {
  const h = (sorted.length - 1) * (p / 100);
  const lo = Math.floor(h);
  const below = sorted[lo]!;
  const above = sorted[Math.min(lo + 1, sorted.length - 1)]!;
  return below + (h - lo) * (above - below);
}

/** The p-th percentile (0 to 100) by linear interpolation, like NumPy and Excel's PERCENTILE.INC. */
export function percentile(values: readonly number[], p: number): number {
  assertValid(values);
  assertPercent(p);
  return percentileOfSorted(sortNumeric(values), p);
}

/** @internal The lower and upper halves for the "halves" method. A single value is its own half. */
export function halvesOfSorted(sorted: readonly number[]): { lower: number[]; upper: number[] } {
  if (sorted.length === 1) return { lower: [...sorted], upper: [...sorted] };
  const half = Math.floor(sorted.length / 2);
  return { lower: sorted.slice(0, half), upper: sorted.slice(sorted.length - half) };
}

/**
 * Where Q1, the median and Q3 sit in a sorted list of n values, counting the first as 0.
 * A whole number means "this value"; 1.5 means "halfway between the 2nd and 3rd value";
 * 1.75 (linear method only) means three quarters of the way.
 */
export function quartilePositions(n: number, method: QuartileMethod): { q1: number; q2: number; q3: number } {
  if (!Number.isInteger(n) || n < 1) throw new Error("Need at least one value");
  const q2 = (n - 1) / 2;
  if (method === "linear") return { q1: (n - 1) * 0.25, q2, q3: (n - 1) * 0.75 };
  if (n === 1) return { q1: 0, q2: 0, q3: 0 };
  const half = Math.floor(n / 2);
  return { q1: (half - 1) / 2, q2, q3: n - half + (half - 1) / 2 };
}

/** @internal */
export function quartilesOfSorted(sorted: readonly number[], method: QuartileMethod): Quartiles {
  const q2 = medianOfSorted(sorted);
  let q1: number;
  let q3: number;
  switch (method) {
    case "halves": {
      const { lower, upper } = halvesOfSorted(sorted);
      q1 = medianOfSorted(lower);
      q3 = medianOfSorted(upper);
      break;
    }
    case "linear":
      q1 = percentileOfSorted(sorted, 25);
      q3 = percentileOfSorted(sorted, 75);
      break;
    default: {
      const never: never = method;
      throw new Error(`Unknown quartile method: ${String(never)}`);
    }
  }
  return { q1, q2, q3, iqr: q3 - q1 };
}

export function quartiles(values: readonly number[], method: QuartileMethod = "halves"): Quartiles {
  assertValid(values);
  return quartilesOfSorted(sortNumeric(values), method);
}

/** Q3 − Q1. */
export const iqr = (values: readonly number[], method: QuartileMethod = "halves"): number => quartiles(values, method).iqr;

/** Everything needed to draw a box plot, with outliers found by the 1.5 × IQR rule. */
export function boxPlot(values: readonly number[], method: QuartileMethod = "halves"): BoxPlot {
  assertValid(values);
  const sorted = sortNumeric(values);
  const q = quartilesOfSorted(sorted, method);
  const lowerFence = q.q1 - 1.5 * q.iqr;
  const upperFence = q.q3 + 1.5 * q.iqr;
  const inside = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  return {
    ...q,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    lowerFence,
    upperFence,
    // The quartiles always lie inside the fences, so `inside` is never empty.
    whiskerLow: inside[0]!,
    whiskerHigh: inside[inside.length - 1]!,
    outliers: sorted.filter((v) => v < lowerFence || v > upperFence),
  };
}
