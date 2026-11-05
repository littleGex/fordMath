import { getStats } from "../lib";
import { formatNumber as f } from "../parse";

/** Longest list we print in full; longer lists are shortened with "…". */
const SHOW = 8;

const list = (values: readonly number[], sep = ", "): string =>
  values.length <= SHOW
    ? values.map(f).join(sep)
    : values.slice(0, SHOW - 2).map(f).join(sep) + `${sep}…${sep}` + f(values[values.length - 1]!);

const ordinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
};

/** Step-by-step working for the mean, using the user's numbers. */
export function explainMean(values: readonly number[]): string[] {
  const { mean, count } = getStats(values);
  const sum = values.reduce((a, v) => a + v, 0);
  return [
    `Add up all ${count} values: ${list(values, " + ")} = ${f(sum)}`,
    `Divide by how many there are: ${f(sum)} ÷ ${count} = ${f(mean)}`,
  ];
}

export function explainMedian(values: readonly number[]): string[] {
  const { median, count } = getStats(values);
  const sorted = [...values].sort((a, b) => a - b);
  const steps = [`Sort the values from smallest to largest: ${list(sorted)}`];
  if (count % 2 === 1) {
    const pos = (count + 1) / 2;
    steps.push(`There are ${count} values, an odd number, so the median is the middle one, the ${ordinal(pos)}: ${f(median)}`);
  } else {
    const lo = count / 2;
    steps.push(
      `There are ${count} values, an even number, so there are two middle ones: the ${ordinal(lo)} (${f(sorted[lo - 1]!)}) and the ${ordinal(lo + 1)} (${f(sorted[lo]!)})`,
      `The median is halfway between them: (${f(sorted[lo - 1]!)} + ${f(sorted[lo]!)}) ÷ 2 = ${f(median)}`,
    );
  }
  return steps;
}

export function explainMode(values: readonly number[]): string[] {
  const { mode } = getStats(values);
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const tally = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const shown = tally.slice(0, SHOW).map(([v, c]) => `${f(v)} ×${c}`).join(", ");
  const steps = [`Count how often each value appears: ${shown}${tally.length > SHOW ? ", …" : ""}`];
  if (mode.length === 0) {
    steps.push("Every value appears exactly once, so there is no mode.");
  } else if (mode.length === 1) {
    steps.push(`${f(mode[0]!)} appears most often (${counts.get(mode[0]!)} times), so it is the mode.`);
  } else {
    steps.push(
      `${mode.map(f).join(" and ")} are tied for most often (${counts.get(mode[0]!)} times each), so they are all modes.`,
    );
  }
  return steps;
}

export function explainStdDev(values: readonly number[]): string[] {
  const { mean, count, stdDev, sampleStdDev } = getStats(values);
  const squares = values.map((v) => (v - mean) ** 2);
  const sumSq = squares.reduce((a, v) => a + v, 0);
  const terms = values
    .slice(0, Math.min(values.length, 4))
    .map((v, i) => `(${f(v)} − ${f(mean)})² = ${f(squares[i]!)}`)
    .join(", ");
  const steps = [
    `Find the mean: ${f(mean)}`,
    `For each value, subtract the mean and square the result, so values below and above the mean both count as positive distance: ${terms}${values.length > 4 ? ", …" : ""}`,
    `Add the squares: ${f(sumSq)}`,
    `Population (σ): divide by n = ${count} to get the variance ${f(sumSq / count)}, then take the square root: σ = ${f(stdDev)}`,
  ];
  if (sampleStdDev === null) {
    steps.push("Sample (s) needs at least 2 values, because it divides by n − 1.");
  } else {
    steps.push(
      `Sample (s): divide by n − 1 = ${count - 1} instead, giving the variance ${f(sumSq / (count - 1))} and s = ${f(sampleStdDev)}`,
    );
  }
  steps.push(
    "Use σ when your numbers are the whole group (every pupil in the class). Use s when they're a sample from a bigger group (10 pupils out of the school); dividing by n − 1 corrects for a sample usually looking less spread out than the whole group.",
  );
  return steps;
}
