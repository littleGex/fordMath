import { afterDiscount, afterRise, interest, percentValue, VAT, type PercentProblem, type PercentQuestion } from "../lib/percent";
import { div, isFiniteDecimal, mul, rat, sub, type Rational } from "../lib/rational";
import type { Lang } from "./lang";

/** A number for reading: exact when it has a short decimal, otherwise rounded with ≈. */
export function num(q: Rational, lang: Lang): string {
  const v = q.n / q.d;
  const exact = isFiniteDecimal(q) && Math.abs(Math.round(v * 10_000) / 10_000 - v) < 1e-12;
  const shown = exact ? String(Math.round(v * 10_000) / 10_000) : (Math.round(v * 100) / 100).toFixed(2);
  return `${exact ? "" : "≈ "}${lang === "de" ? shown.replace(".", ",") : shown}`;
}
const n = (x: number, lang: Lang) => num(rat(Math.round(x * 100), 100), lang);
/** A choice written with a point ("12.5") shown in the right language. */
export const choiceText = (c: string, lang: Lang): string => (c.includes("/") ? c : lang === "de" ? c.replace(".", ",") : c);

/** One line of the Dreisatz: "100 % ≙ 80 €", with what to do to get the next line. */
export interface DreisatzLine { left: string; right: string; op?: string }

/** The Dreisatz for whatever is missing: from what's known, down to 1, up to what's asked. */
export function dreisatz(p: PercentProblem, lang: Lang, unit = ""): DreisatzLine[] {
  const u = unit ? ` ${unit}` : "";
  const pc = (x: Rational) => `${num(x, lang)} %`;
  const val = (x: Rational) => `${num(x, lang)}${u}`;
  switch (p.find) {
    case "W": {
      const one = div(p.G, rat(100));
      return [
        { left: "100 %", right: val(p.G), op: ": 100" },
        { left: "1 %", right: val(one), op: `· ${num(p.p, lang)}` },
        { left: pc(p.p), right: val(p.W) },
      ];
    }
    case "G": {
      const one = div(p.W, p.p);
      return [
        { left: pc(p.p), right: val(p.W), op: `: ${num(p.p, lang)}` },
        { left: "1 %", right: val(one), op: "· 100" },
        { left: "100 %", right: val(p.G) },
      ];
    }
    case "p": {
      const one = div(rat(100), p.G);
      return [
        { left: val(p.G), right: "100 %", op: `: ${num(p.G, lang)}` },
        { left: `1${u}`, right: pc(one), op: `· ${num(p.W, lang)}` },
        { left: val(p.W), right: pc(p.p) },
      ];
    }
  }
}

/** The formula with the numbers put in. */
export function formula(p: PercentProblem, lang: Lang, unit = ""): string {
  const u = unit ? ` ${unit}` : "";
  switch (p.find) {
    case "W": return `W = G · p / 100 = ${num(p.G, lang)}${u} · ${num(p.p, lang)} / 100 = ${num(p.W, lang)}${u}`;
    case "G": return `G = W · 100 / p = ${num(p.W, lang)}${u} · 100 / ${num(p.p, lang)} = ${num(p.G, lang)}${u}`;
    case "p": return `p = W / G · 100 = ${num(p.W, lang)}${u} / ${num(p.G, lang)}${u} · 100 = ${num(p.p, lang)} %`;
  }
}

export const dreisatzText = (lines: DreisatzLine[]): string => lines.map((l) => `${l.left} ≙ ${l.right}`).join(" → ");

// ---------- quiz ----------

export function quizPrompt(q: PercentQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "findW": return de ? `Wie viel sind ${q.p} % von ${n(q.G, lang)} €?` : `What is ${q.p} % of ${n(q.G, lang)} €?`;
    case "findG": return de ? `${n(q.W, lang)} € sind ${q.p} %. Wie viel sind 100 %?` : `${n(q.W, lang)} € is ${q.p} %. How much is 100 %?`;
    case "findP": return de ? `${q.W} von ${q.G} Kindern fahren mit dem Rad. Wie viel Prozent sind das?` : `${q.W} of ${q.G} children cycle to school. What percentage is that?`;
    case "discount": return de ? `Ein Pulli kostet ${n(q.G, lang)} €. Es gibt ${q.p} % Rabatt. Was kostet er jetzt?` : `A jumper costs ${n(q.G, lang)} €. There's ${q.p} % off. What does it cost now?`;
    case "net": return de ? `Ein Fahrrad kostet ${n(q.gross, lang)} € mit 19 % Mehrwertsteuer. Was kostet es ohne?` : `A bike costs ${n(q.gross, lang)} € including 19 % VAT. What does it cost without?`;
    case "upDown": return de ? `Ein Preis von ${n(q.G, lang)} € steigt um ${q.p} % und fällt danach um ${q.p} %. Wie hoch ist er dann?` : `A price of ${n(q.G, lang)} € goes up by ${q.p} %, then down by ${q.p} %. What is it then?`;
    case "fraction": return de ? `Welcher Bruch ist ${String(q.percent).replace(".", ",")} %?` : `Which fraction is ${q.percent} %?`;
    case "interest": return de ? `${n(q.K, lang)} € liegen ein Jahr lang zu ${String(q.p).replace(".", ",")} % Zinsen auf der Bank. Wie viele Zinsen gibt es?` : `${n(q.K, lang)} € stay in the bank for a year at ${q.p} % interest. How much interest is that?`;
  }
}

export function quizUnit(q: PercentQuestion): string {
  return q.kind === "findP" ? " %" : q.kind === "fraction" ? "" : " €";
}

export function quizSteps(q: PercentQuestion, lang: Lang): string[] {
  const de = lang === "de";
  switch (q.kind) {
    case "findW": {
      const p = { G: rat(q.G), p: rat(q.p), W: percentValue(rat(q.G), rat(q.p)), find: "W" as const };
      return [dreisatzText(dreisatz(p, lang, "€")), formula(p, lang, "€")];
    }
    case "findG": {
      const W = rat(Math.round(q.W * 100), 100);
      const p = { W, p: rat(q.p), G: div(mul(W, rat(100)), rat(q.p)), find: "G" as const };
      return [dreisatzText(dreisatz(p, lang, "€")), formula(p, lang, "€")];
    }
    case "findP": {
      const p = { W: rat(q.W), G: rat(q.G), p: mul(div(rat(q.W), rat(q.G)), rat(100)), find: "p" as const };
      return [dreisatzText(dreisatz(p, lang)), formula(p, lang)];
    }
    case "discount": {
      const W = percentValue(rat(q.G), rat(q.p));
      const after = afterDiscount(rat(q.G), rat(q.p));
      return [
        de ? `Rabatt: ${q.p} % von ${n(q.G, lang)} € = ${num(W, lang)} €` : `Discount: ${q.p} % of ${n(q.G, lang)} € = ${num(W, lang)} €`,
        de ? `Neuer Preis: ${n(q.G, lang)} € − ${num(W, lang)} € = ${num(after, lang)} €` : `New price: ${n(q.G, lang)} € − ${num(W, lang)} € = ${num(after, lang)} €`,
        de ? `Oder in einem Schritt: Du zahlst ${100 - q.p} %, also ${n(q.G, lang)} € · ${100 - q.p} / 100.` : `Or in one step: you pay ${100 - q.p} %, so ${n(q.G, lang)} € · ${100 - q.p} / 100.`,
      ];
    }
    case "net": {
      const g = rat(Math.round(q.gross * 100), 100);
      const trap = sub(g, percentValue(g, VAT));
      return [
        de ? `Der Preis mit Steuer ist der Grundwert plus 19 %, also 119 % des Preises ohne Steuer.` : `The price with tax is the base price plus 19 %, so 119 % of the price without tax.`,
        `119 % ≙ ${num(g, lang)} € → 1 % ≙ ${num(div(g, rat(119)), lang)} € → 100 % ≙ ${num(div(mul(g, rat(100)), rat(119)), lang)} €`,
        de ? `Die Falle: ${num(g, lang)} € minus 19 % davon gibt ${num(trap, lang)} €. Die 19 % gehören aber zum kleineren Preis ohne Steuer!` : `The trap: ${num(g, lang)} € minus 19 % of it gives ${num(trap, lang)} €. But the 19 % belongs to the smaller price without tax!`,
      ];
    }
    case "upDown": {
      const up = afterRise(rat(q.G), rat(q.p));
      const down = afterDiscount(up, rat(q.p));
      return [
        de ? `Erst + ${q.p} %: ${n(q.G, lang)} € → ${num(up, lang)} €` : `First + ${q.p} %: ${n(q.G, lang)} € → ${num(up, lang)} €`,
        de ? `Dann − ${q.p} % vom neuen, größeren Preis: ${num(up, lang)} € → ${num(down, lang)} €` : `Then − ${q.p} % of the new, bigger price: ${num(up, lang)} € → ${num(down, lang)} €`,
        de ? "Der Grundwert hat sich geändert, deshalb kommt man nicht zum Anfang zurück." : "The base changed in between, so you don't get back to the start.",
      ];
    }
    case "fraction": {
      const right = q.choices[q.answer]!;
      return [de ? `${String(q.percent).replace(".", ",")} % heißt ${String(q.percent).replace(".", ",")} von 100, also ${String(q.percent).replace(".", ",")}/100 = ${right}.` : `${q.percent} % means ${q.percent} out of 100, so ${q.percent}/100 = ${right}.`];
    }
    case "interest": {
      const Z = interest(rat(q.K), rat(Math.round(q.p * 2), 2));
      const p = { G: rat(q.K), p: rat(Math.round(q.p * 2), 2), W: Z, find: "W" as const };
      return [
        de ? "Zinsen sind der Prozentwert: Kapital ist der Grundwert, Zinssatz der Prozentsatz." : "Interest is the percentage value: the money is the base, the interest rate the percentage.",
        formula(p, lang, "€").replace("W =", "Z ="),
      ];
    }
  }
}

