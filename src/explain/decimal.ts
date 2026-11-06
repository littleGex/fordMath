import {
  add, compare, formatDecimal, fromFraction, placeDigits, roundDecimal, subtract, widen,
  type Decimal, type DecimalQuestion, type DecimalRounding,
} from "../lib/decimal";
import type { Lang } from "./lang";

export const PLACE_NAMES: Record<Lang, Record<number, string>> = {
  de: { 5: "Hunderttausender", 4: "Zehntausender", 3: "Tausender", 2: "Hunderter", 1: "Zehner", 0: "Einer", [-1]: "Zehntel", [-2]: "Hundertstel", [-3]: "Tausendstel" },
  en: { 5: "hundred thousands", 4: "ten thousands", 3: "thousands", 2: "hundreds", 1: "tens", 0: "ones", [-1]: "tenths", [-2]: "hundredths", [-3]: "thousandths" },
};
export const PLACE_SHORT: Record<Lang, Record<number, string>> = {
  de: { 5: "HT", 4: "ZT", 3: "T", 2: "H", 1: "Z", 0: "E", [-1]: "z", [-2]: "h", [-3]: "t" },
  en: { 5: "HTh", 4: "TTh", 3: "Th", 2: "H", 1: "T", 0: "O", [-1]: "t", [-2]: "h", [-3]: "th" },
};

const f = (d: Decimal, lang: Lang) => formatDecimal(d, lang);
/** A choice written in German ("0,5") shown in the right language. */
export const localise = (text: string, lang: Lang): string => (lang === "de" ? text : text.replace(/\./g, "\u0000").replace(/,/g, ".").replace(/\u0000/g, ","));

/** "3 Einer, 4 Zehntel, 7 Hundertstel" and "3 + 4/10 + 7/100". */
export function placeText(d: Decimal, lang: Lang): [names: string, fractions: string] {
  const parts = placeDigits(d).filter(([p, digit]) => digit !== 0 || (p === 0 && d.n === 0));
  const names = parts.map(([p, digit]) => `${digit} ${PLACE_NAMES[lang][p]}`).join(", ");
  const fractions = parts.map(([p, digit]) => (p >= 0 ? String(digit * 10 ** p) : `${digit}/${10 ** -p}`)).join(" + ");
  return [names, fractions || "0"];
}

export function compareSteps(a: Decimal, b: Decimal, lang: Lang): string[] {
  const de = lang === "de";
  const p = Math.max(a.places, b.places);
  const [x, y] = [widen(a, p), widen(b, p)];
  const c = compare(a, b);
  const sign = c > 0 ? ">" : c < 0 ? "<" : "=";
  const steps: string[] = [];
  if (a.places !== b.places) {
    steps.push(de ? `Fülle mit Nullen auf, damit beide gleich viele Stellen nach dem Komma haben: ${f(x, lang)} und ${f(y, lang)}.`
      : `Add zeros so both have the same number of places after the point: ${f(x, lang)} and ${f(y, lang)}.`);
  }
  // The first place from the left where they differ.
  const dx = placeDigits(x);
  const dy = placeDigits(y);
  const wholeX = Math.floor(x.n / 10 ** p);
  const wholeY = Math.floor(y.n / 10 ** p);
  if (wholeX !== wholeY) {
    steps.push(de ? `Vergleiche zuerst die Zahl vor dem Komma: ${wholeX} ${sign} ${wholeY}.` : `Compare the whole numbers first: ${wholeX} ${sign} ${wholeY}.`);
  } else if (c !== 0) {
    const place = [-1, -2, -3].find((pl) => dx.find(([q]) => q === pl)?.[1] !== dy.find(([q]) => q === pl)?.[1])!;
    const [u, v] = [dx.find(([q]) => q === place)![1], dy.find(([q]) => q === place)![1]];
    steps.push(de ? `Vor dem Komma gleich. Vergleiche Stelle für Stelle von links: Bei den ${PLACE_NAMES.de[place]} ist ${u} ${sign} ${v}.`
      : `The whole numbers are equal. Compare place by place from the left: in the ${PLACE_NAMES.en[place]}, ${u} ${sign} ${v}.`);
  } else {
    steps.push(de ? "Alle Stellen sind gleich: Nullen am Ende ändern den Wert nicht." : "Every place is the same: zeros on the end don't change the value.");
  }
  steps.push(`${f(a, lang)} ${sign} ${f(b, lang)}`);
  if (c !== 0 && a.places !== b.places && (c > 0) === (a.places < b.places)) {
    steps.push(de ? "Mehr Ziffern heißt nicht größer!" : "More digits doesn't mean bigger!");
  }
  return steps;
}

export function roundSteps(r: DecimalRounding, lang: Lang): string[] {
  const de = lang === "de";
  const to = r.places === 0 ? (de ? "Ganze" : "whole numbers") : PLACE_NAMES[lang][-r.places]!;
  const next = PLACE_NAMES[lang][-(r.places + 1)]!;
  return [
    de ? `Runde ${f(r.d, lang)} auf ${to}.` : `Round ${f(r.d, lang)} to ${to}.`,
    de ? `Schau auf die Ziffer dahinter, bei den ${next}: ${r.decider}.` : `Look at the next digit, in the ${next}: ${r.decider}.`,
    r.up ? (de ? `${r.decider} ist 5 oder mehr: aufrunden.` : `${r.decider} is 5 or more: round up.`)
      : de ? `${r.decider} ist kleiner als 5: abrunden.` : `${r.decider} is less than 5: round down.`,
    de ? `${f(r.d, lang)} liegt zwischen ${f(r.lower, lang)} und ${f(r.upper, lang)}.` : `${f(r.d, lang)} is between ${f(r.lower, lang)} and ${f(r.upper, lang)}.`,
    `${f(r.d, lang)} ≈ ${f(r.result, lang)}`,
  ];
}

export function fractionSteps(num: number, den: number, lang: Lang): string[] {
  const de = lang === "de";
  const d = fromFraction(num, den);
  if (!d) return [de ? `${num}/${den} hat keine endliche Dezimalzahl.` : `${num}/${den} has no finite decimal.`];
  const target = 10 ** d.places;
  const lines: string[] = [];
  if (target !== den) {
    lines.push(de ? `Erweitere auf ${target}: ${num}/${den} = ${num * (target / den)}/${target} (mal ${target / den}).`
      : `Expand to ${target}: ${num}/${den} = ${num * (target / den)}/${target} (times ${target / den}).`);
  }
  const name = PLACE_NAMES[lang][-d.places]!;
  lines.push(de ? `${d.n}/${target} heißt ${d.n} ${name}.` : `${d.n}/${target} means ${d.n} ${name}.`);
  lines.push(`${num}/${den} = ${f(d, lang)}`);
  return lines;
}

export function sumSteps(a: Decimal, b: Decimal, op: "+" | "−", lang: Lang): string[] {
  const de = lang === "de";
  const p = Math.max(a.places, b.places);
  const [x, y] = [widen(a, p), widen(b, p)];
  const result = op === "+" ? add(a, b) : subtract(a, b);
  return [
    de ? `Schreibe Komma unter Komma und fülle mit Nullen auf: ${f(x, lang)} ${op} ${f(y, lang)}.`
      : `Put the points under each other and fill with zeros: ${f(x, lang)} ${op} ${f(y, lang)}.`,
    de ? `Rechne wie mit ganzen Zahlen: ${x.n} ${op} ${y.n} = ${result.n}.` : `Work as with whole numbers: ${x.n} ${op} ${y.n} = ${result.n}.`,
    de ? `Setze das Komma an dieselbe Stelle: ${f(result, lang)}.` : `Put the point back in the same place: ${f(result, lang)}.`,
  ];
}

// ---------- quiz ----------

export function quizPrompt(q: DecimalQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "compare": return de ? `Welche Zahl ist größer: ${f(q.a, lang)} oder ${f(q.b, lang)}?` : `Which is bigger: ${f(q.a, lang)} or ${f(q.b, lang)}?`;
    case "smallest": return de ? "Welche Zahl ist die kleinste?" : "Which number is the smallest?";
    case "digit": return de ? `Welche Ziffer steht in ${f(q.d, lang)} bei den ${PLACE_NAMES.de[q.place]}?` : `Which digit of ${f(q.d, lang)} is in the ${PLACE_NAMES.en[q.place]}?`;
    case "round": return roundSteps(roundDecimal(q.d, q.places), lang)[0]!;
    case "fraction": return de ? `Welche Dezimalzahl ist ${q.num}/${q.den}?` : `Which decimal is ${q.num}/${q.den}?`;
    case "add": return `${f(q.a, lang)} + ${f(q.b, lang)} = ?`;
    case "subtract": return `${f(q.a, lang)} − ${f(q.b, lang)} = ?`;
  }
}

export const choiceLabel = (choice: string, lang: Lang): string =>
  choice === "=" ? (lang === "de" ? "gleich groß" : "the same") : localise(choice, lang);

export function quizSteps(q: DecimalQuestion, lang: Lang): string[] {
  switch (q.kind) {
    case "compare": return compareSteps(q.a, q.b, lang);
    case "smallest": {
      const p = Math.max(...q.options.map((o) => o.places));
      const de = lang === "de";
      const filled = q.options.map((o) => f(widen(o, p), lang)).join(", ");
      return [
        de ? `Fülle alle mit Nullen auf: ${filled}.` : `Fill them all with zeros: ${filled}.`,
        de ? `Jetzt sieht man es: ${localise(q.choices[q.answer]!, lang)} ist am kleinsten.` : `Now you can see it: ${localise(q.choices[q.answer]!, lang)} is the smallest.`,
      ];
    }
    case "digit": {
      const [names] = placeText(q.d, lang);
      return [names];
    }
    case "round": return roundSteps(roundDecimal(q.d, q.places), lang).slice(1);
    case "fraction": return fractionSteps(q.num, q.den, lang);
    case "add": return sumSteps(q.a, q.b, "+", lang);
    case "subtract": return sumSteps(q.a, q.b, "−", lang);
  }
}
