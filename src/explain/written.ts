import type { AddStep, BorrowStep, ComplementStep, WrittenSum } from "../lib/written";
import type { Lang } from "./lang";

/**
 * Words for one column of a written sum, in three parts so the page can use them two ways:
 *   ask   – the question for this column, used as a hint in "Ich rechne" (your turn)
 *   work  – how to work it out
 *   write – what to write down (and carry)
 * "Zeig mir" (show me) shows `${place}: ${work} ${write}`.
 */
export interface StepText {
  place: string;
  ask: string;
  work: string;
  write: string;
}

const PLACES: Record<Lang, string[]> = {
  de: ["Einer", "Zehner", "Hunderter", "Tausender", "Zehntausender", "Hunderttausender", "Millionen"],
  en: ["Ones", "Tens", "Hundreds", "Thousands", "Ten thousands", "Hundred thousands", "Millions"],
};

/** "Einer", "Zehner"… with the singular for a single exchanged unit: "1 Zehner". */
export const placeName = (column: number, lang: Lang): string => PLACES[lang][column] ?? `10^${column}`;

const placeSingular = (column: number, lang: Lang): string =>
  lang === "de" ? placeName(column, lang) : (["one", "ten", "hundred", "thousand", "ten thousand", "hundred thousand", "million"][column] ?? `10^${column}`);

function writeText(write: number, carry: number, leadingZero: boolean, lang: Lang): string {
  if (leadingZero) {
    return lang === "de" ? "Eine 0 ganz vorne schreibt man nicht." : "A 0 at the very front isn't written.";
  }
  if (lang === "de") return carry ? `Schreibe ${write}, merke ${carry}.` : `Schreibe ${write}.`;
  return carry ? `Write ${write}, carry ${carry}.` : `Write ${write}.`;
}

function addText(s: AddStep, lang: Lang): StepText {
  const parts = s.digits.filter((d, i) => d !== 0 || i === 0 || s.digits.every((x) => x === 0)).map(String);
  if (s.carryIn) parts.push(lang === "de" ? `${s.carryIn} (Übertrag)` : `${s.carryIn} (carried)`);
  const expr = parts.join(" + ");
  const onlyCarry = s.digits.every((d) => d === 0) && s.carryIn > 0;
  return {
    place: placeName(s.column, lang),
    ask: onlyCarry
      ? lang === "de" ? "Hier steht nur noch der Übertrag. Was schreibst du?" : "Only the carried number is left here. What do you write?"
      : `${expr} = ?`,
    work: onlyCarry
      ? lang === "de" ? `Nur der Übertrag: ${s.carryIn}.` : `Just the carried ${s.carryIn}.`
      : `${expr} = ${s.total}.`,
    write: writeText(s.write, s.carryOut, false, lang),
  };
}

function complementText(s: ComplementStep, lang: Lang): StepText {
  const de = lang === "de";
  const lowerPart = s.carryIn ? `${s.bottom} + ${s.carryIn} ${de ? "(Übertrag)" : "(carried)"} = ${s.lower}. ` : "";
  const ask = de ? `${s.lower} plus wie viel ergibt ${s.top}?` : `${s.lower} plus what makes ${s.top}?`;
  const work =
    s.target === s.top
      ? `${s.lower} + ${s.write} = ${s.top}.`
      : de
        ? `Das geht nicht, also bis ${s.target}: ${s.lower} + ${s.write} = ${s.target}.`
        : `That's not possible, so go up to ${s.target}: ${s.lower} + ${s.write} = ${s.target}.`;
  return {
    place: placeName(s.column, lang),
    ask: lowerPart + ask,
    work: lowerPart + ask + " " + work,
    write: writeText(s.write, s.carryOut, s.leadingZero, lang),
  };
}

function borrowText(s: BorrowStep, lang: Lang): StepText {
  const de = lang === "de";
  const ask = `${s.top} − ${s.bottom} = ?`;
  if (s.exchanges.length === 0) {
    return { place: placeName(s.column, lang), ask, work: `${s.top} − ${s.bottom} = ${s.write}.`, write: writeText(s.write, 0, s.leadingZero, lang) };
  }
  const source = s.exchanges[0]!;
  const chain = s.exchanges
    .map((e) => `${placeName(e.column, lang)} ${e.from} → ${e.to}`)
    .join(", ");
  const exchange = de
    ? `${s.top} − ${s.bottom} geht nicht. Entbündle: tausche 1 ${placeSingular(source.column, lang)} (${chain}), dann hast du ${s.topAfter} ${placeName(s.column, lang)}.`
    : `${s.top} − ${s.bottom} isn't possible. Exchange 1 ${placeSingular(source.column, lang)} (${chain}), so now you have ${s.topAfter} ${placeName(s.column, lang).toLowerCase()}.`;
  return {
    place: placeName(s.column, lang),
    ask,
    work: `${exchange} ${s.topAfter} − ${s.bottom} = ${s.write}.`,
    write: writeText(s.write, 0, s.leadingZero, lang),
  };
}

/** One StepText per column, ones first, matching `sum.steps`. */
export function stepTexts(sum: WrittenSum, lang: Lang): StepText[] {
  switch (sum.kind) {
    case "add": return sum.steps.map((s) => addText(s, lang));
    case "complement": return sum.steps.map((s) => complementText(s, lang));
    case "borrow": return sum.steps.map((s) => borrowText(s, lang));
  }
}

const symbol = (sum: WrittenSum) => (sum.kind === "add" ? "+" : "−");
export const sumText = (sum: WrittenSum): string => `${sum.numbers.join(` ${symbol(sum)} `)} = ${sum.result}`;

/** What to do before the first column. */
export function introText(sum: WrittenSum, lang: Lang): string {
  const de = lang === "de";
  const line = de
    ? "Schreibe die Zahlen genau untereinander: Einer unter Einer, Zehner unter Zehner. Dann fang rechts bei den Einern an."
    : "Write the numbers exactly underneath each other: ones under ones, tens under tens. Then start on the right with the ones.";
  if (sum.kind === "complement") {
    return line + (de ? " Beim Ergänzen fragst du immer: Wie viel fehlt von unten bis oben?" : " When adding on, always ask: how much is missing from the bottom number up to the top one?");
  }
  if (sum.kind === "borrow") {
    return line + (de ? " Beim Abziehen rechnest du oben minus unten." : " When taking away, work out top minus bottom.");
  }
  return line;
}

/** The finished result, plus a check using the opposite operation (die Probe). */
export function finishText(sum: WrittenSum, lang: Lang): { result: string; check: string | null } {
  const de = lang === "de";
  const result = (de ? "Fertig! " : "Done! ") + sumText(sum);
  if (sum.kind === "add") {
    if (sum.numbers.length !== 2) return { result, check: null };
    const [a, b] = sum.numbers as [number, number];
    return { result, check: `${de ? "Probe" : "Check"}: ${sum.result} − ${b} = ${a} ✓` };
  }
  const [a, b] = sum.numbers;
  return { result, check: `${de ? "Probe" : "Check"}: ${sum.result} + ${b} = ${a} ✓` };
}
