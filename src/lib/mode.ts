import { assertValid } from "./validate";

/** @internal Assumes `values` has already been validated. */
export function modeUnchecked(values: readonly number[]): number[] {
  const counts = new Map<number, number>();
  let maxCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    maxCount = Math.max(maxCount, c);
  }
  if (maxCount === 1) return [];
  return [...counts]
    .filter(([, c]) => c === maxCount)
    .map(([v]) => v)
    .sort((a, b) => a - b);
}

/**
 * Most frequent value(s), sorted ascending.
 * Returns every tied value, or [] when all values are unique.
 * Floats are compared exactly, so 0.1 + 0.2 and 0.3 count as different values.
 */
export function mode(values: readonly number[]): number[] {
  assertValid(values);
  return modeUnchecked(values);
}
