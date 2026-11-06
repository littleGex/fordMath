import type { Lang } from "./explain/lang";

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** Turns typographic minus and en dash into "-". */
const asciiMinus = (s: string): string => s.replace(/[−–]/g, "-");

/**
 * Parses "3, 1.5; -2 4e2" into numbers. Dots are decimals; commas separate values.
 * In German, when the values are separated by semicolons (or only spaces), a comma is the decimal
 * mark instead: "2,5; 3; 4,5" is [2.5, 3, 4.5]. With no semicolon, commas still separate, as before.
 */
export function parseValues(text: string, lang: Lang = "en"): number[] {
  const t = asciiMinus(text);
  // German: "2,5; 3" or "2,5 3,75" use decimal commas. A word with two commas ("2,4,4") or a
  // comma next to a space ("2, 4") means the commas separate values.
  const words = t.trim().split(/\s+/).filter(Boolean);
  const commaIsDecimal = lang === "de" && (t.includes(";") || words.every((w) => /^[^,]*(\d,\d[^,]*)?$/.test(w)));
  const tokens = (commaIsDecimal ? t.split(/[\s;]+/).map((x) => x.replace(",", ".")) : t.split(/[\s,;]+/)).filter(Boolean);
  const bad = tokens.find((x) => !NUMBER.test(x));
  if (bad !== undefined) {
    throw new Error(
      lang === "de"
        ? `„${bad}“ ist keine Zahl. Erlaubt sind Ziffern, ein Minus und ein Dezimalkomma (dann mit ; trennen).`
        : `"${bad}" isn't a number. Use digits, an optional minus sign and a dot for decimals.`,
    );
  }
  return tokens.map(Number);
}

/**
 * Parses one number from its own input box, e.g. the "b" in ax² + bx + c.
 * A comma is accepted as the decimal point here (2,5), since there's nothing to separate.
 */
export function parseCoefficient(text: string, name: string, lang: Lang = "en"): number {
  const t = asciiMinus(text.trim()).replace(",", ".");
  const de = lang === "de";
  if (t === "") throw new Error(de ? `Gib einen Wert für ${name} ein (0, wenn der Teil fehlt).` : `Enter a value for ${name} (use 0 if that term is missing).`);
  if (!NUMBER.test(t)) throw new Error(de ? `${name} = „${text.trim()}“ ist keine Zahl.` : `${name} = "${text.trim()}" isn't a number.`);
  return Number(t);
}

/**
 * Readable number: up to 6 decimals, trailing zeros trimmed.
 * Very small (< 0.0001) and very large (≥ 1 000 000 000) values use exponent form
 * with up to 7 significant figures: 1e-8 instead of 0, 2.5e+15 instead of 16 digits.
 */
export function formatNumber(n: number): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs < 1e-4 || abs >= 1e9) return Number(n.toPrecision(7)).toExponential();
  return String(parseFloat(n.toFixed(6)));
}

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

/** formatNumber for maths text: a real minus sign (−), and 2.5 × 10¹⁵ instead of 2.5e+15. */
export function prettyNumber(n: number): string {
  return formatNumber(n)
    .replace(/e\+?(-?\d+)$/, (_, exp: string) => " × 10" + [...exp].map((ch) => SUPERSCRIPT[ch]).join(""))
    .replace(/^-/, "−");
}

/** formatNumber in the language's style: 2,5 in German, 2.5 in English. */
export const formatFor = (lang: Lang) => (n: number): string => (lang === "de" ? formatNumber(n).replace(".", ",") : formatNumber(n));
/** prettyNumber in the language's style. */
export const prettyFor = (lang: Lang) => (n: number): string => (lang === "de" ? prettyNumber(n).replace(".", ",") : prettyNumber(n));
/** How lists are joined: "; " in German, where the comma is the decimal mark. */
export const listSep = (lang: Lang): string => (lang === "de" ? "; " : ", ");
