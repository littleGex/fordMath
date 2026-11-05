import { assertValid } from "./validate";

/** @internal Assumes `values` has already been validated. */
export function meanUnchecked(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/** Arithmetic mean (average) of a list of numbers. */
export function mean(values: readonly number[]): number {
  assertValid(values);
  return meanUnchecked(values);
}
