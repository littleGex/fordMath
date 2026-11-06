import { mean, median, mode, standardDeviation } from "./lib";
import { explainMean, explainMedian, explainMode, explainStdDev } from "./explain/statistics";
import type { Lang } from "./explain/lang";

/** The same text in both languages. */
export type Words = Record<Lang, string>;

export interface MathMethod {
  /** Stable id, used for DOM ids. */
  id: string;
  label: Words;
  /** Short maths symbol shown on the result tile. */
  symbol: string;
  /** Colour class from zone.css. */
  colour: string;
  description: Words;
  /** null means "not defined for this input" (shown with `whenNull`). */
  compute: (values: readonly number[]) => number | number[] | null;
  whenNull?: Words;
  /** Step-by-step working with the user's numbers. Omit when another method's explanation covers it. */
  explain?: (values: readonly number[], lang: Lang) => string[];
  explainTitle?: Words;
}

/**
 * Every method the Statistics page shows. To add one:
 *   1. write src/lib/<name>.ts (+ <name>.test.ts)
 *   2. export it from src/lib/index.ts
 *   3. write an explain function in src/explain/ (+ test), taking a Lang
 *   4. add an entry here, with its words in German and English
 */
export const methods: MathMethod[] = [
  {
    id: "mean", label: { de: "Mittelwert", en: "Mean" }, symbol: "x̄", colour: "c-stats",
    description: { de: "Der Durchschnitt: alles gerecht verteilt.", en: "The average: share the total out equally." },
    compute: mean, explain: explainMean,
  },
  {
    id: "median", label: { de: "Median", en: "Median" }, symbol: "M", colour: "c-median",
    description: { de: "Der mittlere Wert, wenn sortiert.", en: "The middle value once sorted." },
    compute: median, explain: explainMedian,
  },
  {
    id: "mode", label: { de: "Modalwert", en: "Mode" }, symbol: "Mo", colour: "c-mode",
    description: { de: "Der häufigste Wert (oder die häufigsten).", en: "The most common value or values." },
    compute: mode, explain: explainMode,
  },
  {
    id: "sd", label: { de: "Standardabw.", en: "Std deviation" }, symbol: "σ", colour: "c-sd",
    description: { de: "Typischer Abstand vom Mittelwert (ganze Gruppe).", en: "Typical distance from the mean (whole group)." },
    compute: (v) => standardDeviation(v, "population"),
    explain: explainStdDev, explainTitle: { de: "Standardabweichung (σ und s)", en: "Standard deviation (σ and s)" },
  },
  {
    id: "sample-sd", label: { de: "Stichprobe", en: "Sample std dev" }, symbol: "s", colour: "c-sample",
    description: { de: "Dasselbe für eine Stichprobe aus einer größeren Gruppe.", en: "The same, for a sample of a bigger group." },
    compute: (v) => (v.length > 1 ? standardDeviation(v, "sample") : null),
    whenNull: { de: "braucht 2+ Werte", en: "needs 2+ values" },
  },
];
