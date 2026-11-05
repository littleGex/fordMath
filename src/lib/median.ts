import { assertValid, sortNumeric } from "./validate";

/** @internal Expects a non-empty, already sorted array. */
export function medianOfSorted(sorted: readonly number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Middle value; the average of the two middle values for an even count. */
export function median(values: readonly number[]): number {
  assertValid(values);
  return medianOfSorted(sortNumeric(values));
}
