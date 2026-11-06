import { boxPlot, quartilePositions, type QuartileMethod } from "../lib";
import { formatNumber as f } from "../parse";

const SHOW = 8;
const list = (values: readonly number[]): string =>
  values.length <= SHOW ? values.map(f).join(", ") : `${values.slice(0, SHOW - 2).map(f).join(", ")}, …, ${f(values[values.length - 1]!)}`;

const ordinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
};

/** "the middle one, 15" or "halfway between 4 and 4: (4 + 4) ÷ 2 = 4" */
function medianOf(half: readonly number[]): string {
  const mid = Math.floor(half.length / 2);
  if (half.length % 2 === 1) return `the middle one, ${f(half[mid]!)}`;
  const [a, b] = [half[mid - 1]!, half[mid]!];
  return `halfway between ${f(a)} and ${f(b)}: (${f(a)} + ${f(b)}) ÷ 2 = ${f((a + b) / 2)}`;
}

/** Reading the sorted list at a position like 1.75, the linear method's way. */
function readAt(sorted: readonly number[], pos: number, name: string, share: string): string[] {
  const n = sorted.length;
  const lo = Math.floor(pos);
  const frac = pos - lo;
  const where = `${name} sits at position (n − 1) × ${share} = ${n - 1} × ${share} = ${f(pos)} (the first value is position 0).`;
  if (frac < 1e-12) return [where, `That's exactly the ${ordinal(lo + 1)} value: ${name} = ${f(sorted[lo]!)}`];
  const [a, b] = [sorted[lo]!, sorted[lo + 1]!];
  const value = a + frac * (b - a);
  return [
    where,
    `That's ${f(frac)} of the way from the ${ordinal(lo + 1)} value (${f(a)}) to the ${ordinal(lo + 2)} (${f(b)}): ${name} = ${f(a)} + ${f(frac)} × (${f(b)} − ${f(a)}) = ${f(value)}`,
  ];
}

export function explainQuartiles(values: readonly number[], method: QuartileMethod): string[] {
  const b = boxPlot(values, method); // validates
  const sorted = [...values].sort((x, y) => x - y);
  const n = sorted.length;
  const steps = [`Sort the ${n} value${n === 1 ? "" : "s"}: ${list(sorted)}`];

  if (n === 1) {
    steps.push(`With a single value, Q1, the median and Q3 are all ${f(sorted[0]!)}.`);
  } else if (method === "halves") {
    const half = Math.floor(n / 2);
    const lower = sorted.slice(0, half);
    const upper = sorted.slice(n - half);
    steps.push(
      n % 2 === 0
        ? `The median (${f(b.q2)}) splits the ${n} values into two halves of ${half}.`
        : `The median (${f(b.q2)}, the ${ordinal(half + 1)} value) is in the middle and belongs to neither half, so each half has ${half}.`,
      `Q1 is the median of the lower half (${list(lower)}): ${medianOf(lower)}`,
      `Q3 is the median of the upper half (${list(upper)}): ${medianOf(upper)}`,
    );
  } else {
    const p = quartilePositions(n, "linear");
    steps.push(...readAt(sorted, p.q1, "Q1", "0.25"), ...readAt(sorted, p.q3, "Q3", "0.75"));
  }
  steps.push(`Interquartile range: IQR = Q3 − Q1 = ${f(b.q3)} − ${f(b.q1)} = ${f(b.iqr)}. The middle half of the values lies between ${f(b.q1)} and ${f(b.q3)}.`);
  return steps;
}

export function explainOutliers(values: readonly number[], method: QuartileMethod): string[] {
  const b = boxPlot(values, method);
  const steps = [
    `Lower fence: Q1 − 1.5 × IQR = ${f(b.q1)} − 1.5 × ${f(b.iqr)} = ${f(b.lowerFence)}`,
    `Upper fence: Q3 + 1.5 × IQR = ${f(b.q3)} + 1.5 × ${f(b.iqr)} = ${f(b.upperFence)}`,
  ];
  if (b.outliers.length === 0) {
    steps.push(`Every value lies between ${f(b.lowerFence)} and ${f(b.upperFence)}, so there are no outliers.`);
  } else {
    const many = b.outliers.length > 1;
    steps.push(`${list(b.outliers)} ${many ? "lie" : "lies"} outside the fences, so ${many ? "they are outliers" : "it is an outlier"}. A box plot draws ${many ? "them" : "it"} as a separate dot.`);
  }
  steps.push(
    `The whiskers reach the smallest and largest values that aren't outliers: ${f(b.whiskerLow)} and ${f(b.whiskerHigh)}.`,
    "The 1.5 × IQR rule is a convention (from John Tukey), not a law: it flags values worth a second look, such as a typing mistake.",
  );
  return steps;
}

export const METHOD_NOTE: Record<QuartileMethod, string> = {
  halves: "The method in German school books: Q1 and Q3 are the medians of the lower and upper half.",
  linear: "The method NumPy, Excel (QUARTILE.INC) and R use by default: read off at position (n − 1) × ¼ and × ¾.",
};
