import { englishWords, germanWords } from "../lib/number-words";
import { digitAt, groupDigits, roundTo, splitPlaces, type PlaceQuestion, type Rounding } from "../lib/place-value";
import type { Lang } from "./lang";

/** Column headings of the Stellenwerttafel, ones first. */
export const PLACE_SHORT: Record<Lang, string[]> = {
  de: ["E", "Z", "H", "T", "ZT", "HT", "M", "ZM", "HM", "Mrd", "ZMrd", "HMrd"],
  en: ["O", "T", "H", "Th", "TTh", "HTh", "M", "TM", "HM", "B", "TB", "HB"],
};

/** Plural names, used in sentences: "auf Hunderter runden". */
export const PLACE_LONG: Record<Lang, string[]> = {
  de: [
    "Einer", "Zehner", "Hunderter", "Tausender", "Zehntausender", "Hunderttausender",
    "Millionen", "Zehnmillionen", "Hundertmillionen", "Milliarden", "Zehnmilliarden", "Hundertmilliarden",
  ],
  en: [
    "ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands",
    "millions", "ten millions", "hundred millions", "billions", "ten billions", "hundred billions",
  ],
};

/** German dative plural: "bei den Hundertern" (Millionen and Milliarden already end in n). */
const dative = (name: string): string => (name.endsWith("er") ? `${name}n` : name);

/** A number written for reading: "4 572" in German style, "4,572" in English. */
export const show = (n: number, lang: Lang): string => groupDigits(n, lang === "de" ? " " : ",");

export const words = (n: number, lang: Lang): string => (lang === "de" ? germanWords(n) : englishWords(n));

/** "4 T + 5 H + 7 Z + 2 E" and "4 000 + 500 + 70 + 2 = 4 572", skipping zeros. */
export function splitText(n: number, lang: Lang): [places: string, values: string] {
  const parts = splitPlaces(n).filter((p) => p.digit > 0);
  if (parts.length === 0) return [`0 ${PLACE_SHORT[lang][0]}`, "0"];
  return [
    parts.map((p) => `${p.digit} ${PLACE_SHORT[lang][p.place]}`).join(" + "),
    parts.map((p) => show(p.value, lang)).join(" + ") + (parts.length > 1 ? ` = ${show(n, lang)}` : ""),
  ];
}

export function roundSteps(r: Rounding, lang: Lang): string[] {
  const de = lang === "de";
  const place = PLACE_LONG[lang][r.place]!;
  const right = PLACE_LONG[lang][r.place - 1]!;
  const s = (x: number) => show(x, lang);
  return [
    de ? `Runde ${s(r.n)} auf ${place}.` : `Round ${s(r.n)} to the nearest ${place.replace(/s$/, "")}.`,
    de ? `Schau auf die Ziffer rechts daneben, die ${right}ziffer: ${r.decider}.` : `Look at the digit just to the right, the ${right.replace(/s$/, "")} digit: ${r.decider}.`,
    r.up
      ? de ? `${r.decider} ist 5 oder mehr: aufrunden.` : `${r.decider} is 5 or more: round up.`
      : de ? `${r.decider} ist kleiner als 5: abrunden.` : `${r.decider} is less than 5: round down.`,
    de
      ? `${s(r.n)} liegt zwischen ${s(r.lower)} und ${s(r.upper)}.` + (r.decider === 5 && r.n % 10 ** (r.place - 1) === 0 ? " Genau in der Mitte rundet man auf." : "")
      : `${s(r.n)} is between ${s(r.lower)} and ${s(r.upper)}.` + (r.decider === 5 && r.n % 10 ** (r.place - 1) === 0 ? " Exactly halfway rounds up." : ""),
    `${s(r.n)} ≈ ${s(r.result)}`,
  ];
}

/** The quiz question as the child reads it. */
export function questionText(q: PlaceQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "round": return de ? `Runde ${show(q.n, lang)} auf ${PLACE_LONG.de[q.place]}.` : `Round ${show(q.n, lang)} to the nearest ${PLACE_LONG.en[q.place]!.replace(/s$/, "")}.`;
    case "digit-value": return de
      ? `Wie viel ist die ${digitAt(q.n, q.place)} in ${show(q.n, lang)} wert?`
      : `What is the ${digitAt(q.n, q.place)} in ${show(q.n, lang)} worth?`;
    case "words": return de ? `Welche Zahl ist das? ${words(q.n, lang)}` : `Which number is this? ${words(q.n, lang)}`;
    case "number-line": return de ? "Auf welche Zahl zeigt der Pfeil?" : "Which number is the arrow pointing at?";
  }
}

/** Working shown after an answer. */
export function questionSteps(q: PlaceQuestion, lang: Lang): string[] {
  const de = lang === "de";
  switch (q.kind) {
    case "round": return roundSteps(roundTo(q.n, q.place), lang);
    case "digit-value": {
      const d = digitAt(q.n, q.place);
      return [
        de ? `Die ${d} steht bei den ${dative(PLACE_LONG.de[q.place]!)}.` : `The ${d} is in the ${PLACE_LONG.en[q.place]} place.`,
        `${d} ${PLACE_SHORT[lang][q.place]} = ${show(d * 10 ** q.place, lang)}`,
        ...splitText(q.n, lang),
      ];
    }
    case "words": return [
      de ? "Lies das Zahlwort in Teilen und schreib jeden Teil in die Stellenwerttafel:" : "Read the words in parts and put each part in its place:",
      ...splitText(q.n, lang),
      `= ${show(q.n, lang)}`,
    ];
    case "number-line": {
      const i = (q.n - q.lower) / q.step;
      return [
        de ? `Der Strahl beginnt bei ${show(q.lower, lang)}. Jeder Strich ist ${show(q.step, lang)} weiter.` : `The line starts at ${show(q.lower, lang)}. Each mark is ${show(q.step, lang)} further on.`,
        de ? `Der Pfeil zeigt auf den ${i}. Strich: ${show(q.lower, lang)} + ${i} · ${show(q.step, lang)} = ${show(q.n, lang)}` : `The arrow points at mark ${i}: ${show(q.lower, lang)} + ${i} · ${show(q.step, lang)} = ${show(q.n, lang)}`,
      ];
    }
  }
}
