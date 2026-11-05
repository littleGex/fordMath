/**
 * Throws if `values` is empty or contains NaN / ±Infinity.
 * Every public math function calls this exactly once.
 */
export function assertValid(values: readonly number[]): void {
  if (values.length === 0) {
    throw new Error("Cannot compute statistics of an empty array");
  }
  if (!values.every(Number.isFinite)) {
    throw new Error("All values must be finite numbers");
  }
}

/** Returns a numerically sorted copy; never mutates the input. */
export const sortNumeric = (values: readonly number[]): number[] =>
  [...values].sort((a, b) => a - b);
