import { boxPlot, quartilePositions, type QuartileMethod } from "../lib";
import { formatFor } from "../parse";
import type { Lang } from "./lang";
import { listOf, ordinal } from "./statistics";

/** "the middle one, 15" or "halfway between 4 and 4: (4 + 4) ÷ 2 = 4" */
function medianOf(half: readonly number[], lang: Lang): string {
  const f = formatFor(lang);
  const mid = Math.floor(half.length / 2);
  if (half.length % 2 === 1) return lang === "de" ? `der mittlere, ${f(half[mid]!)}` : `the middle one, ${f(half[mid]!)}`;
  const [a, b] = [half[mid - 1]!, half[mid]!];
  return lang === "de"
    ? `genau zwischen ${f(a)} und ${f(b)}: (${f(a)} + ${f(b)}) : 2 = ${f((a + b) / 2)}`
    : `halfway between ${f(a)} and ${f(b)}: (${f(a)} + ${f(b)}) ÷ 2 = ${f((a + b) / 2)}`;
}

/** Reading the sorted list at a position like 1.75, the linear method's way. */
function readAt(sorted: readonly number[], pos: number, name: string, share: number, lang: Lang): string[] {
  const f = formatFor(lang);
  const de = lang === "de";
  const n = sorted.length;
  const lo = Math.floor(pos);
  const frac = pos - lo;
  const where = de
    ? `${name} liegt an Position (n − 1) · ${f(share)} = ${n - 1} · ${f(share)} = ${f(pos)} (der erste Wert ist Position 0).`
    : `${name} sits at position (n − 1) × ${f(share)} = ${n - 1} × ${f(share)} = ${f(pos)} (the first value is position 0).`;
  if (frac < 1e-12) {
    return [where, de ? `Das ist genau der ${ordinal(lo + 1, lang)} Wert: ${name} = ${f(sorted[lo]!)}` : `That's exactly the ${ordinal(lo + 1)} value: ${name} = ${f(sorted[lo]!)}`];
  }
  const [a, b] = [sorted[lo]!, sorted[lo + 1]!];
  const value = a + frac * (b - a);
  return [
    where,
    de
      ? `Das ist ${f(frac)} des Wegs vom ${ordinal(lo + 1, lang)} Wert (${f(a)}) zum ${ordinal(lo + 2, lang)} (${f(b)}): ${name} = ${f(a)} + ${f(frac)} · (${f(b)} − ${f(a)}) = ${f(value)}`
      : `That's ${f(frac)} of the way from the ${ordinal(lo + 1)} value (${f(a)}) to the ${ordinal(lo + 2)} (${f(b)}): ${name} = ${f(a)} + ${f(frac)} × (${f(b)} − ${f(a)}) = ${f(value)}`,
  ];
}

export function explainQuartiles(values: readonly number[], method: QuartileMethod, lang: Lang = "en"): string[] {
  const f = formatFor(lang);
  const de = lang === "de";
  const b = boxPlot(values, method); // validates
  const sorted = [...values].sort((x, y) => x - y);
  const n = sorted.length;
  const steps = [de ? `Sortiere die ${n} ${n === 1 ? "Zahl" : "Werte"}: ${listOf(sorted, lang)}` : `Sort the ${n} value${n === 1 ? "" : "s"}: ${listOf(sorted, lang)}`];

  if (n === 1) {
    steps.push(de ? `Bei nur einem Wert sind Q1, der Median und Q3 alle ${f(sorted[0]!)}.` : `With a single value, Q1, the median and Q3 are all ${f(sorted[0]!)}.`);
  } else if (method === "halves") {
    const half = Math.floor(n / 2);
    const lower = sorted.slice(0, half);
    const upper = sorted.slice(n - half);
    if (de) {
      steps.push(
        n % 2 === 0
          ? `Der Median (${f(b.q2)}) teilt die ${n} Werte in zwei Hälften mit je ${half}.`
          : `Der Median (${f(b.q2)}, der ${ordinal(half + 1, lang)} Wert) steht in der Mitte und gehört zu keiner Hälfte, also hat jede Hälfte ${half}.`,
        `Q1 ist der Median der unteren Hälfte (${listOf(lower, lang)}): ${medianOf(lower, lang)}`,
        `Q3 ist der Median der oberen Hälfte (${listOf(upper, lang)}): ${medianOf(upper, lang)}`,
      );
    } else {
      steps.push(
        n % 2 === 0
          ? `The median (${f(b.q2)}) splits the ${n} values into two halves of ${half}.`
          : `The median (${f(b.q2)}, the ${ordinal(half + 1)} value) is in the middle and belongs to neither half, so each half has ${half}.`,
        `Q1 is the median of the lower half (${listOf(lower, lang)}): ${medianOf(lower, lang)}`,
        `Q3 is the median of the upper half (${listOf(upper, lang)}): ${medianOf(upper, lang)}`,
      );
    }
  } else {
    const p = quartilePositions(n, "linear");
    steps.push(...readAt(sorted, p.q1, "Q1", 0.25, lang), ...readAt(sorted, p.q3, "Q3", 0.75, lang));
  }
  steps.push(
    de
      ? `Quartilsabstand: IQR = Q3 − Q1 = ${f(b.q3)} − ${f(b.q1)} = ${f(b.iqr)}. Die mittlere Hälfte der Werte liegt zwischen ${f(b.q1)} und ${f(b.q3)}.`
      : `Interquartile range: IQR = Q3 − Q1 = ${f(b.q3)} − ${f(b.q1)} = ${f(b.iqr)}. The middle half of the values lies between ${f(b.q1)} and ${f(b.q3)}.`,
  );
  return steps;
}

export function explainOutliers(values: readonly number[], method: QuartileMethod, lang: Lang = "en"): string[] {
  const f = formatFor(lang);
  const b = boxPlot(values, method);
  const many = b.outliers.length > 1;
  if (lang === "de") {
    return [
      `Untere Grenze: Q1 − 1,5 · IQR = ${f(b.q1)} − 1,5 · ${f(b.iqr)} = ${f(b.lowerFence)}`,
      `Obere Grenze: Q3 + 1,5 · IQR = ${f(b.q3)} + 1,5 · ${f(b.iqr)} = ${f(b.upperFence)}`,
      b.outliers.length === 0
        ? `Alle Werte liegen zwischen ${f(b.lowerFence)} und ${f(b.upperFence)}, also gibt es keine Ausreißer.`
        : `${listOf(b.outliers, lang)} ${many ? "liegen" : "liegt"} außerhalb der Grenzen, ${many ? "das sind Ausreißer" : "das ist ein Ausreißer"}. Im Boxplot ${many ? "werden sie" : "wird er"} als eigener Punkt gezeichnet.`,
      `Die Antennen (Whisker) reichen bis zum kleinsten und größten Wert, der kein Ausreißer ist: ${f(b.whiskerLow)} und ${f(b.whiskerHigh)}.`,
      "Die 1,5 · IQR-Regel ist eine Abmachung (von John Tukey), kein Gesetz: Sie zeigt Werte, die man sich noch mal ansehen sollte, zum Beispiel einen Tippfehler.",
    ];
  }
  return [
    `Lower fence: Q1 − 1.5 × IQR = ${f(b.q1)} − 1.5 × ${f(b.iqr)} = ${f(b.lowerFence)}`,
    `Upper fence: Q3 + 1.5 × IQR = ${f(b.q3)} + 1.5 × ${f(b.iqr)} = ${f(b.upperFence)}`,
    b.outliers.length === 0
      ? `Every value lies between ${f(b.lowerFence)} and ${f(b.upperFence)}, so there are no outliers.`
      : `${listOf(b.outliers, lang)} ${many ? "lie" : "lies"} outside the fences, so ${many ? "they are outliers" : "it is an outlier"}. A box plot draws ${many ? "them" : "it"} as a separate dot.`,
    `The whiskers reach the smallest and largest values that aren't outliers: ${f(b.whiskerLow)} and ${f(b.whiskerHigh)}.`,
    "The 1.5 × IQR rule is a convention (from John Tukey), not a law: it flags values worth a second look, such as a typing mistake.",
  ];
}

export const METHOD_NOTE: Record<Lang, Record<QuartileMethod, string>> = {
  en: {
    halves: "The method in German school books: Q1 and Q3 are the medians of the lower and upper half.",
    linear: "The method NumPy, Excel (QUARTILE.INC) and R use by default: read off at position (n − 1) × ¼ and × ¾.",
  },
  de: {
    halves: "Die Methode aus dem Schulbuch: Q1 und Q3 sind die Mediane der unteren und der oberen Hälfte.",
    linear: "Die Methode, die NumPy, Excel (QUARTILE.INKL) und R benutzen: abgelesen an Position (n − 1) · ¼ und · ¾.",
  },
};
