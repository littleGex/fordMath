import { changeFor, clockText, formatIn, formatMixed, isDecimal, ratio, timeSpan, type Quantity } from "../lib/units";
import type { UnitsQuestion } from "../lib/units-quiz";
import type { Lang } from "./lang";

export const QUANTITY_NAMES: Record<Lang, Record<Quantity, string>> = {
  de: { money: "Geld", length: "Längen", mass: "Gewichte", time: "Zeit" },
  en: { money: "Money", length: "Length", mass: "Weight", time: "Time" },
};

/** "2,35 m", always exact; time that isn't exact falls back to "1 h 35 min". */
export function amount(base: number, quantity: Quantity, symbol: string, lang: Lang): string {
  const v = formatIn(base, quantity, symbol, lang);
  return v === null ? formatMixed(base, quantity) : `${v} ${symbol}`;
}

export const euro = (ct: number, lang: Lang): string => `${formatIn(ct, "money", "€", lang)} €`;
export const piece = (ct: number): string => (ct >= 100 ? `${ct / 100} €` : `${ct} ct`);
const group = (n: number, lang: Lang) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "de" ? " " : ",");

/** "1 h 35 min" from minutes. */
export const minutesText = (minutes: number): string => formatMixed(minutes * 60, "time");

/** How to convert from one unit to another, with the Umrechnungszahl. */
export function convertSteps(base: number, quantity: Quantity, from: string, to: string, lang: Lang): string[] {
  const de = lang === "de";
  const r = ratio(quantity, from, to);
  const down = r >= 1; // to a smaller unit: more of them
  const n = down ? r : 1 / r;
  const [big, small] = down ? [from, to] : [to, from];
  const steps = [`1 ${big} = ${group(n, lang)} ${small}. ${de ? `Die Umrechnungszahl ist ${group(n, lang)}.` : `The conversion number is ${group(n, lang)}.`}`];
  if (isDecimal(quantity)) {
    const places = Math.round(Math.log10(n));
    steps.push(
      down
        ? de
          ? `Von ${from} zu ${to} (kleinere Einheit): mal ${group(n, lang)}. Das Komma rückt ${places} ${places === 1 ? "Stelle" : "Stellen"} nach rechts.`
          : `From ${from} to ${to} (a smaller unit): times ${group(n, lang)}. The decimal point moves ${places} ${places === 1 ? "place" : "places"} right.`
        : de
          ? `Von ${from} zu ${to} (größere Einheit): durch ${group(n, lang)}. Das Komma rückt ${places} ${places === 1 ? "Stelle" : "Stellen"} nach links.`
          : `From ${from} to ${to} (a bigger unit): divided by ${group(n, lang)}. The decimal point moves ${places} ${places === 1 ? "place" : "places"} left.`,
    );
  } else {
    const value = formatIn(base, quantity, from, lang)!;
    steps.push(
      down
        ? `${value} ${from} = ${value} · ${n} ${to} = ${amount(base, quantity, to, lang)}`
        : `${amount(base, quantity, from, lang)} = ${formatIn(base, quantity, from, lang)} : ${n} ${to} = ${amount(base, quantity, to, lang)}`,
    );
  }
  steps.push(`${amount(base, quantity, from, lang)} = ${amount(base, quantity, to, lang)}`);
  const mixed = formatMixed(base, quantity);
  if (mixed !== amount(base, quantity, from, lang) && mixed !== amount(base, quantity, to, lang)) {
    steps.push(de ? `Gemischt geschrieben: ${mixed}` : `Written in mixed units: ${mixed}`);
  }
  return steps;
}

export function spanSteps(from: { h: number; m: number }, to: { h: number; m: number }, lang: Lang): string[] {
  const de = lang === "de";
  const s = timeSpan(from, to);
  const lines = s.steps.map((x, i) => {
    const note =
      i === 0 && x.from.m !== 0 && x.to.m === 0
        ? de ? " (bis zur vollen Stunde)" : " (to the full hour)"
        : "";
    return `${clockText(x.from)} → ${clockText(x.to)}: ${minutesText(x.minutes)}${note}`;
  });
  return [
    de ? "Spring in Etappen über den Zeitstrahl:" : "Jump along the time line in steps:",
    ...lines,
    s.steps.length > 1
      ? `${de ? "Zusammen" : "Altogether"}: ${s.steps.map((x) => minutesText(x.minutes)).join(" + ")} = ${minutesText(s.minutes)}`
      : `${de ? "Also" : "So"}: ${minutesText(s.minutes)}`,
  ];
}

/** One counting-up step: "5 ct", "1 €", or "1,35 €" when it isn't a whole coin amount. */
const step = (ct: number, lang: Lang): string => (ct < 100 ? `${ct} ct` : ct % 100 === 0 ? `${ct / 100} €` : euro(ct, lang));

export function changeSteps(price: number, paid: number, lang: Lang): string[] {
  const de = lang === "de";
  const c = changeFor(price, paid);
  if (c.change === 0) return [de ? "Genau bezahlt: kein Rückgeld." : "Paid exactly: no change."];
  return [
    de ? `Rechne vom Preis hoch bis ${euro(paid, lang)} (ergänzen):` : `Count up from the price to ${euro(paid, lang)}:`,
    ...c.steps.map((s) => `${euro(s.from, lang)} + ${step(s.add, lang)} = ${euro(s.to, lang)}`),
    `${de ? "Rückgeld" : "Change"}: ${c.steps.map((s) => step(s.add, lang)).join(" + ")} = ${euro(c.change, lang)}`,
    `${de ? "Mit den wenigsten Münzen und Scheinen" : "With the fewest coins and notes"}: ${c.pieces.map(piece).join(", ")}`,
  ];
}

export function compareSteps(q: Extract<UnitsQuestion, { kind: "compare" }>, lang: Lang): string[] {
  const de = lang === "de";
  const smaller = ratio(q.quantity, q.leftUnit, q.rightUnit) >= 1 ? q.rightUnit : q.leftUnit;
  const L = amount(q.left, q.quantity, smaller, lang);
  const R = amount(q.right, q.quantity, smaller, lang);
  const sign = q.left > q.right ? ">" : q.left < q.right ? "<" : "=";
  return [
    de ? `Schreib beide in derselben Einheit, am besten in ${smaller}:` : `Write both in the same unit, best in ${smaller}:`,
    `${amount(q.left, q.quantity, q.leftUnit, lang)} = ${L}`,
    `${amount(q.right, q.quantity, q.rightUnit, lang)} = ${R}`,
    `${L} ${sign} ${R}`,
  ];
}

export function questionText(q: UnitsQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "convert": return `${amount(q.base, q.quantity, q.from, lang)} = ? ${q.to}`;
    case "compare": return de ? "Was ist mehr?" : "Which is more?";
    case "change": return de
      ? `Du kaufst etwas für ${euro(q.price, lang)} und bezahlst mit ${euro(q.paid, lang)}. Wie viel Rückgeld bekommst du?`
      : `You buy something for ${euro(q.price, lang)} and pay with ${euro(q.paid, lang)}. How much change do you get?`;
    case "span": return de
      ? `Von ${clockText(q.from)} Uhr bis ${clockText(q.to)} Uhr. Wie lange ist das?`
      : `From ${clockText(q.from)} to ${clockText(q.to)}. How long is that?`;
  }
}

/** How a choice is written on its button. */
export function choiceText(q: UnitsQuestion, choice: number, lang: Lang): string {
  switch (q.kind) {
    case "convert": return amount(choice, q.quantity, q.to, lang);
    case "compare": return [amount(q.left, q.quantity, q.leftUnit, lang), "=", amount(q.right, q.quantity, q.rightUnit, lang)][choice]!;
    case "change": return euro(choice, lang);
    case "span": return minutesText(choice);
  }
}

export function questionSteps(q: UnitsQuestion, lang: Lang): string[] {
  switch (q.kind) {
    case "convert": return convertSteps(q.base, q.quantity, q.from, q.to, lang);
    case "compare": return compareSteps(q, lang);
    case "change": return changeSteps(q.price, q.paid, lang);
    case "span": return spanSteps(q.from, q.to, lang);
  }
}
