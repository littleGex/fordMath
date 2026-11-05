import { assertValid, sortNumeric } from "./validate";
import { meanUnchecked } from "./mean";
import { medianOfSorted } from "./median";
import { modeUnchecked } from "./mode";
import { varianceUnchecked } from "./deviation";

export interface Stats {
  count: number;
  mean: number;
  median: number;
  mode: number[];
  /** Population standard deviation σ (divide by n). */
  stdDev: number;
  /** Sample standard deviation s (divide by n − 1); null when there's only one value. */
  sampleStdDev: number | null;
}

/** Runs every method, validating the input only once and computing the mean only once. */
export function getStats(values: readonly number[]): Stats {
  assertValid(values);
  const mean = meanUnchecked(values);
  return {
    count: values.length,
    mean,
    median: medianOfSorted(sortNumeric(values)),
    mode: modeUnchecked(values),
    stdDev: Math.sqrt(varianceUnchecked(values, mean, "population")),
    sampleStdDev:
      values.length > 1 ? Math.sqrt(varianceUnchecked(values, mean, "sample")) : null,
  };
}
