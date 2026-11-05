/**
 * Numbers written as words, the way they're written in school.
 * German joins everything below a million into one word ("viertausendfünfhundertzweiundsiebzig")
 * and writes Millionen and Milliarden separately. English (British) uses "and" after hundreds.
 * Both work from 0 up to 999 999 999 999.
 */

export const MAX_WORDS = 999_999_999_999;

function check(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_WORDS) throw new Error(`Words only for whole numbers from 0 to ${MAX_WORDS}`);
}

// ---------- German ----------

const DE_ONES = ["", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"];
const DE_TEENS = ["zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const DE_TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];

/**
 * 0–99. `last` is true at the very end of the number: 1 is "eins" there ("hunderteins"),
 * but "ein" in front of something ("eintausend", "einundzwanzig").
 */
function deUnder100(n: number, last: boolean): string {
  if (n === 0) return "";
  if (n < 10) return n === 1 && !last ? "ein" : DE_ONES[n]!;
  if (n < 20) return DE_TEENS[n - 10]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? DE_TENS[tens]! : `${ones === 1 ? "ein" : DE_ONES[ones]}und${DE_TENS[tens]}`;
}

function deUnder1000(n: number, last: boolean): string {
  const h = Math.floor(n / 100);
  return (h ? `${h === 1 ? "ein" : DE_ONES[h]}hundert` : "") + deUnder100(n % 100, last);
}

/** 3 405 210 → "drei Millionen vierhundertfünftausendzweihundertzehn" */
export function germanWords(n: number): string {
  check(n);
  if (n === 0) return "null";
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor(n / 1e6) % 1000;
  const thousands = Math.floor(n / 1e3) % 1000;
  const rest = n % 1000;
  const parts: string[] = [];
  if (billions) parts.push(billions === 1 ? "eine Milliarde" : `${deUnder1000(billions, true)} Milliarden`);
  if (millions) parts.push(millions === 1 ? "eine Million" : `${deUnder1000(millions, true)} Millionen`);
  const low = (thousands ? `${deUnder1000(thousands, false)}tausend` : "") + deUnder1000(rest, true);
  if (low) parts.push(low);
  return parts.join(" ");
}

// ---------- English ----------

const EN_ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enUnder100(n: number): string {
  if (n < 20) return EN_ONES[n]!;
  const ones = n % 10;
  return EN_TENS[Math.floor(n / 10)]! + (ones ? `-${EN_ONES[ones]}` : "");
}

function enUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return enUnder100(r);
  return `${EN_ONES[h]} hundred` + (r ? ` and ${enUnder100(r)}` : "");
}

/** 3 405 210 → "three million four hundred and five thousand two hundred and ten" */
export function englishWords(n: number): string {
  check(n);
  if (n === 0) return "zero";
  const parts: string[] = [];
  for (const [size, name] of [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"]] as const) {
    const chunk = Math.floor(n / size) % 1000;
    if (chunk) parts.push(`${enUnder1000(chunk)} ${name}`);
  }
  const rest = n % 1000;
  if (rest) parts.push(rest < 100 && parts.length ? `and ${enUnder100(rest)}` : enUnder1000(rest));
  return parts.join(" ");
}
