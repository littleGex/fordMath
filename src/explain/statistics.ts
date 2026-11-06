import { getStats } from "../lib";
import { formatFor, listSep } from "../parse";
import type { Lang } from "./lang";

/** Longest list we print in full; longer lists are shortened with "…". */
const SHOW = 8;

/** A list of numbers, shortened when long. German joins with "; " because the comma is the decimal mark. */
export const listOf = (values: readonly number[], lang: Lang, sep = listSep(lang)): string => {
  const f = formatFor(lang);
  return values.length <= SHOW
    ? values.map(f).join(sep)
    : values.slice(0, SHOW - 2).map(f).join(sep) + `${sep}…${sep}` + f(values[values.length - 1]!);
};

/** 1st, 2nd, 3rd … in English; 1., 2., 3. in German. */
export const ordinal = (n: number, lang: Lang = "en"): string => {
  if (lang === "de") return `${n}.`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
};

/** Step-by-step working for the mean, using the user's numbers. */
export function explainMean(values: readonly number[], lang: Lang = "en"): string[] {
  const f = formatFor(lang);
  const { mean, count } = getStats(values);
  const sum = values.reduce((a, v) => a + v, 0);
  return lang === "de"
    ? [
        `Addiere alle ${count} Werte: ${listOf(values, lang, " + ")} = ${f(sum)}`,
        `Teile durch die Anzahl: ${f(sum)} : ${count} = ${f(mean)}`,
      ]
    : [
        `Add up all ${count} values: ${listOf(values, lang, " + ")} = ${f(sum)}`,
        `Divide by how many there are: ${f(sum)} ÷ ${count} = ${f(mean)}`,
      ];
}

export function explainMedian(values: readonly number[], lang: Lang = "en"): string[] {
  const f = formatFor(lang);
  const de = lang === "de";
  const { median, count } = getStats(values);
  const sorted = [...values].sort((a, b) => a - b);
  const steps = [de ? `Sortiere die Werte der Größe nach: ${listOf(sorted, lang)}` : `Sort the values from smallest to largest: ${listOf(sorted, lang)}`];
  if (count % 2 === 1) {
    const pos = (count + 1) / 2;
    steps.push(
      de
        ? `Es sind ${count} Werte, eine ungerade Anzahl, also ist der Median der mittlere, der ${ordinal(pos, lang)}: ${f(median)}`
        : `There are ${count} values, an odd number, so the median is the middle one, the ${ordinal(pos)}: ${f(median)}`,
    );
  } else {
    const lo = count / 2;
    const [a, b] = [sorted[lo - 1]!, sorted[lo]!];
    steps.push(
      de
        ? `Es sind ${count} Werte, eine gerade Anzahl, also gibt es zwei mittlere: den ${ordinal(lo, lang)} (${f(a)}) und den ${ordinal(lo + 1, lang)} (${f(b)})`
        : `There are ${count} values, an even number, so there are two middle ones: the ${ordinal(lo)} (${f(a)}) and the ${ordinal(lo + 1)} (${f(b)})`,
      de
        ? `Der Median liegt genau dazwischen: (${f(a)} + ${f(b)}) : 2 = ${f(median)}`
        : `The median is halfway between them: (${f(a)} + ${f(b)}) ÷ 2 = ${f(median)}`,
    );
  }
  return steps;
}

export function explainMode(values: readonly number[], lang: Lang = "en"): string[] {
  const f = formatFor(lang);
  const de = lang === "de";
  const { mode } = getStats(values);
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const tally = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const shown = tally.slice(0, SHOW).map(([v, c]) => `${f(v)} ×${c}`).join(listSep(lang));
  const more = tally.length > SHOW ? `${listSep(lang)}…` : "";
  const steps = [de ? `Zähle, wie oft jeder Wert vorkommt: ${shown}${more}` : `Count how often each value appears: ${shown}${more}`];
  if (mode.length === 0) {
    steps.push(de ? "Jeder Wert kommt genau einmal vor, also gibt es keinen Modalwert." : "Every value appears exactly once, so there is no mode.");
  } else if (mode.length === 1) {
    const n = counts.get(mode[0]!);
    steps.push(de ? `${f(mode[0]!)} kommt am häufigsten vor (${n}-mal), also ist es der Modalwert.` : `${f(mode[0]!)} appears most often (${n} times), so it is the mode.`);
  } else {
    const n = counts.get(mode[0]!);
    steps.push(
      de
        ? `${mode.map(f).join(" und ")} kommen gleich oft am häufigsten vor (je ${n}-mal), also sind sie alle Modalwerte.`
        : `${mode.map(f).join(" and ")} are tied for most often (${n} times each), so they are all modes.`,
    );
  }
  return steps;
}

export function explainStdDev(values: readonly number[], lang: Lang = "en"): string[] {
  const f = formatFor(lang);
  const de = lang === "de";
  const { mean, count, stdDev, sampleStdDev } = getStats(values);
  const squares = values.map((v) => (v - mean) ** 2);
  const sumSq = squares.reduce((a, v) => a + v, 0);
  const terms = values
    .slice(0, Math.min(values.length, 4))
    .map((v, i) => `(${f(v)} − ${f(mean)})² = ${f(squares[i]!)}`)
    .join(listSep(lang));
  const more = values.length > 4 ? `${listSep(lang)}…` : "";
  if (de) {
    return [
      `Bestimme den Mittelwert: ${f(mean)}`,
      `Ziehe von jedem Wert den Mittelwert ab und quadriere, damit Abstände nach unten und nach oben beide positiv zählen: ${terms}${more}`,
      `Addiere die Quadrate: ${f(sumSq)}`,
      `Grundgesamtheit (σ): Teile durch n = ${count}, das gibt die Varianz ${f(sumSq / count)}, dann die Wurzel: σ = ${f(stdDev)}`,
      sampleStdDev === null
        ? "Die Stichprobe (s) braucht mindestens 2 Werte, weil durch n − 1 geteilt wird."
        : `Stichprobe (s): Teile stattdessen durch n − 1 = ${count - 1}, das gibt die Varianz ${f(sumSq / (count - 1))} und s = ${f(sampleStdDev)}`,
      "Nimm σ, wenn deine Zahlen die ganze Gruppe sind (alle Kinder der Klasse). Nimm s, wenn sie eine Stichprobe aus einer größeren Gruppe sind (10 Kinder der Schule); das Teilen durch n − 1 gleicht aus, dass eine Stichprobe meist weniger gestreut aussieht als die ganze Gruppe.",
    ];
  }
  return [
    `Find the mean: ${f(mean)}`,
    `For each value, subtract the mean and square the result, so values below and above the mean both count as positive distance: ${terms}${more}`,
    `Add the squares: ${f(sumSq)}`,
    `Population (σ): divide by n = ${count} to get the variance ${f(sumSq / count)}, then take the square root: σ = ${f(stdDev)}`,
    sampleStdDev === null
      ? "Sample (s) needs at least 2 values, because it divides by n − 1."
      : `Sample (s): divide by n − 1 = ${count - 1} instead, giving the variance ${f(sumSq / (count - 1))} and s = ${f(sampleStdDev)}`,
    "Use σ when your numbers are the whole group (every pupil in the class). Use s when they're a sample from a bigger group (10 pupils out of the school); dividing by n − 1 corrects for a sample usually looking less spread out than the whole group.",
  ];
}
