import { mean, median, mode } from "./lib";

export interface MathMethod {
  /** Stable id, used for DOM ids. */
  id: string;
  label: string;
  description: string;
  compute: (values: readonly number[]) => number | number[];
}

/**
 * Every method the front end shows. To add one:
 *   1. write src/lib/<name>.ts (+ <name>.test.ts)
 *   2. export it from src/lib/index.ts
 *   3. add an entry here
 */
export const methods: MathMethod[] = [
  {
    id: "mean",
    label: "Mean",
    description: "Sum of the values divided by how many there are.",
    compute: mean,
  },
  {
    id: "median",
    label: "Median",
    description: "Middle value once sorted; average of the middle two for an even count.",
    compute: median,
  },
  {
    id: "mode",
    label: "Mode",
    description: "Most frequent value(s). Shows “none” when every value is unique.",
    compute: mode,
  },
];
