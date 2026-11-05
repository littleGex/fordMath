import { assertValid } from "./validate";
import { meanUnchecked } from "./mean";

/**
 * - "population": divide by n. Use when the values ARE the whole group (σ).
 * - "sample":     divide by n − 1 (Bessel's correction). Use when the values are
 *                 a sample drawn from a bigger group and you're estimating it (s).
 */
export type DeviationKind = "population" | "sample";

/** @internal Assumes `values` is valid and `mean` is its mean. Two-pass, so it stays accurate for large offsets. */
export function varianceUnchecked(
  values: readonly number[],
  mean: number,
  kind: DeviationKind,
): number {
  let sumSq = 0;
  for (const v of values) sumSq += (v - mean) ** 2;
  return sumSq / (kind === "sample" ? values.length - 1 : values.length);
}

function assertKind(values: readonly number[], kind: DeviationKind): void {
  if (kind === "sample" && values.length < 2) {
    throw new Error("Sample variance needs at least 2 values");
  }
}

/** Average squared distance from the mean. */
export function variance(values: readonly number[], kind: DeviationKind = "population"): number {
  assertValid(values);
  assertKind(values, kind);
  return varianceUnchecked(values, meanUnchecked(values), kind);
}

/** Typical distance from the mean, in the same units as the values: √variance. */
export function standardDeviation(
  values: readonly number[],
  kind: DeviationKind = "population",
): number {
  assertValid(values);
  assertKind(values, kind);
  return Math.sqrt(varianceUnchecked(values, meanUnchecked(values), kind));
}
