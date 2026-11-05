import { assertValid, sortNumeric } from "./validate";
import { meanUnchecked } from "./mean";
import { medianOfSorted } from "./median";
import { modeUnchecked } from "./mode";

export interface Stats {
  mean: number;
  median: number;
  mode: number[];
}

/** Runs every method, validating the input only once. */
export function getStats(values: readonly number[]): Stats {
  assertValid(values);
  return {
    mean: meanUnchecked(values),
    median: medianOfSorted(sortNumeric(values)),
    mode: modeUnchecked(values),
  };
}
