import { mean, median, mode, standardDeviation } from "./lib";
import { explainMean, explainMedian, explainMode, explainStdDev } from "./explain/statistics";

export interface MathMethod {
  /** Stable id, used for DOM ids. */
  id: string;
  label: string;
  /** Short maths symbol shown on the result tile. */
  symbol: string;
  /** Colour class from zone.css. */
  colour: string;
  description: string;
  /** null means "not defined for this input" (shown with `whenNull`). */
  compute: (values: readonly number[]) => number | number[] | null;
  whenNull?: string;
  /** Step-by-step working with the user's numbers. Omit when another method's explanation covers it. */
  explain?: (values: readonly number[]) => string[];
  explainTitle?: string;
}

/**
 * Every method the Statistics page shows. To add one:
 *   1. write src/lib/<name>.ts (+ <name>.test.ts)
 *   2. export it from src/lib/index.ts
 *   3. write an explain function in src/explain/ (+ test)
 *   4. add an entry here
 */
export const methods: MathMethod[] = [
  {
    id: "mean", label: "Mean", symbol: "x̄", colour: "c-stats",
    description: "The average: share the total out equally.",
    compute: mean, explain: explainMean,
  },
  {
    id: "median", label: "Median", symbol: "M", colour: "c-median",
    description: "The middle value once sorted.",
    compute: median, explain: explainMedian,
  },
  {
    id: "mode", label: "Mode", symbol: "Mo", colour: "c-mode",
    description: "The most common value or values.",
    compute: mode, explain: explainMode,
  },
  {
    id: "sd", label: "Std deviation", symbol: "σ", colour: "c-sd",
    description: "Typical distance from the mean (whole group).",
    compute: (v) => standardDeviation(v, "population"),
    explain: explainStdDev, explainTitle: "Standard deviation (σ and s)",
  },
  {
    id: "sample-sd", label: "Sample std dev", symbol: "s", colour: "c-sample",
    description: "The same, for a sample of a bigger group.",
    compute: (v) => (v.length > 1 ? standardDeviation(v, "sample") : null),
    whenNull: "needs 2+ values",
  },
];
