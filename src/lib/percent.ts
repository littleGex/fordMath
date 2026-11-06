import { add, div, isFiniteDecimal, isZero, mul, rat, sub, type Rational } from "./rational";
import { randomInt, type Random } from "./random";

/**
 * Prozentrechnung (Klasse 7) with exact fractions:
 *   Grundwert G (the whole, 100 %), Prozentwert W (the part), Prozentsatz p (how many percent).
 *   W = G · p / 100        G = W · 100 / p        p = W / G · 100
 */
export type Unknown = "G" | "W" | "p";

export interface PercentProblem {
  G: Rational;
  W: Rational;
  p: Rational;
  find: Unknown;
}

const HUNDRED = rat(100);

export const percentValue = (G: Rational, p: Rational): Rational => div(mul(G, p), HUNDRED);
export function baseValue(W: Rational, p: Rational): Rational {
  if (isZero(p)) throw new Error("With 0 % there's no Grundwert to find");
  return div(mul(W, HUNDRED), p);
}
export function percentRate(W: Rational, G: Rational): Rational {
  if (isZero(G)) throw new Error("The Grundwert can't be 0");
  return mul(div(W, G), HUNDRED);
}

/** Works out the missing one of G, W and p from the other two. */
export function solve(known: { G?: Rational; W?: Rational; p?: Rational }): PercentProblem {
  const { G, W, p } = known;
  if (G && p && !W) return { G, p, W: percentValue(G, p), find: "W" };
  if (W && p && !G) return { W, p, G: baseValue(W, p), find: "G" };
  if (W && G && !p) return { W, G, p: percentRate(W, G), find: "p" };
  throw new Error("Give exactly two of Grundwert, Prozentwert and Prozentsatz");
}

/** Common percentages as fractions: 50 % = 1/2 … */
export const PERCENT_FRACTIONS: Array<[percent: number, num: number, den: number]> = [
  [50, 1, 2], [25, 1, 4], [75, 3, 4], [20, 1, 5], [10, 1, 10], [5, 1, 20], [1, 1, 100], [40, 2, 5], [12.5, 1, 8],
];

// ---------- everyday uses ----------

/** A price after a discount of p %: G − W, which is G · (100 − p) / 100. */
export const afterDiscount = (G: Rational, p: Rational): Rational => sub(G, percentValue(G, p));
/** A price after a rise of p %. */
export const afterRise = (G: Rational, p: Rational): Rational => add(G, percentValue(G, p));
/** Mehrwertsteuer 19 %: from the net price to the gross price. */
export const VAT = rat(19);
export const gross = (net: Rational): Rational => afterRise(net, VAT);
/** And back: the gross price is 119 %, so the net price is gross : 1,19 (not gross minus 19 % of it). */
export const net = (grossPrice: Rational): Rational => baseValue(grossPrice, rat(119));
/** Zinsen for one year: Kapital · Zinssatz / 100. */
export const interest = (capital: Rational, rate: Rational): Rational => percentValue(capital, rate);

// ---------- quiz ----------

export type PercentQuestion = (
  | { kind: "findW"; G: number; p: number } // 15 % von 80 € = ?
  | { kind: "findG"; W: number; p: number } // 12 € sind 15 %. Wie viel sind 100 %?
  | { kind: "findP"; W: number; G: number } // 12 von 80 sind wie viel Prozent?
  | { kind: "discount"; G: number; p: number } // price after a discount
  | { kind: "net"; gross: number } // gross → net (the trap: minus 19 %)
  | { kind: "upDown"; G: number; p: number } // +p % then −p %: not the same as before!
  | { kind: "fraction"; percent: number } // 25 % = which fraction?
  | { kind: "interest"; K: number; p: number }
) & { choices: string[]; answer: number }; // choices as numbers written with a point; the page formats them

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;

/** A Rational as a plain decimal string with a point ("12.5"), if it has at most 2 places; else null. */
export function decimalString(q: Rational): string | null {
  if (!isFiniteDecimal(q)) return null;
  const v = q.n / q.d;
  const s = String(Math.round(v * 100) / 100);
  return Math.abs(Number(s) - v) < 1e-9 ? s : null;
}

function withChoices(right: string, wrongs: string[], random: Random): { choices: string[]; answer: number } {
  const picked = [...new Set(wrongs.filter((w) => w !== right && !w.startsWith("-") && Number(w) !== Number(right)))].slice(0, 3);
  for (let k = 1; picked.length < 3; k++) {
    const w = String(Number(right) + k * (Number(right) >= 20 ? 5 : 1));
    if (!picked.includes(w)) picked.push(w);
  }
  const all = [right, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return { choices: all, answer: all.indexOf(right) };
}

const s = (q: Rational) => decimalString(q)!;

export function makePercentQuestion(random: Random): PercentQuestion {
  const kinds = ["findW", "findG", "findP", "discount", "net", "upDown", "fraction", "interest"] as const;
  for (;;) {
    const kind = pick(kinds, random);
    switch (kind) {
      case "findW": {
        const G = randomInt(random, 2, 40) * 10;
        const p = pick([5, 10, 15, 20, 25, 30, 40, 50, 75], random);
        const W = percentValue(rat(G), rat(p));
        if (!decimalString(W)) continue;
        // Mix-ups: p instead of p/100, G·100/p, or dividing G by p.
        return { kind, G, p, ...withChoices(s(W), [s(rat(G * p)), s(div(rat(G), rat(p))), s(add(W, rat(10)))].filter(Boolean), random) };
      }
      case "findG": {
        const p = pick([5, 10, 20, 25, 40, 50], random);
        const G = randomInt(random, 2, 30) * 20;
        const W = percentValue(rat(G), rat(p));
        if (!decimalString(W)) continue;
        return { kind, W: Number(s(W)), p, ...withChoices(String(G), [s(percentValue(W, rat(p))), s(add(W, rat(p))), String(G / 2)].filter((x) => x !== null) as string[], random) };
      }
      case "findP": {
        const G = pick([20, 25, 40, 50, 80, 120, 200, 250, 400], random);
        const p = pick([5, 10, 15, 20, 25, 30, 40, 60, 75], random);
        const W = percentValue(rat(G), rat(p));
        if (!decimalString(W) || !Number.isInteger(Number(s(W)))) continue;
        return { kind, W: Number(s(W)), G, ...withChoices(String(p), [String(Number(s(W))), s(div(rat(G), W)) ?? "1", String(100 - p)], random) };
      }
      case "discount": {
        const G = randomInt(random, 4, 30) * 5;
        const p = pick([10, 20, 25, 30, 50], random);
        const after = afterDiscount(rat(G), rat(p));
        return { kind, G, p, ...withChoices(s(after), [s(percentValue(rat(G), rat(p))), String(G - p), s(afterRise(rat(G), rat(p)))], random) };
      }
      case "net": {
        // A gross price that gives a whole net price, so the answer is exact.
        const n = randomInt(random, 2, 30) * 100;
        const g = gross(rat(n));
        const trap = sub(g, percentValue(g, VAT));
        if (!decimalString(g) || !decimalString(trap)) continue;
        return { kind, gross: Number(s(g)), ...withChoices(String(n), [s(trap), s(sub(g, rat(19))), s(div(g, rat(19)))].filter((x) => x !== null) as string[], random) };
      }
      case "upDown": {
        const G = pick([100, 200, 400, 500, 1000], random);
        const p = pick([10, 20, 50], random);
        const end = afterDiscount(afterRise(rat(G), rat(p)), rat(p));
        return { kind, G, p, ...withChoices(s(end), [String(G), s(afterRise(rat(G), rat(p))), String(G - p)], random) };
      }
      case "fraction": {
        const [percent, num, den] = pick(PERCENT_FRACTIONS.filter(([pc]) => pc !== 12.5), random);
        // Choices are fractions written "num/den"; wrong ones use the percent's digits.
        const wrongs = [`1/${percent}`, `${percent}/10`, `${num}/${den * 2}`, `${den}/${num}`].filter((w) => w !== `${num}/${den}`);
        const right = `${num}/${den}`;
        const picked = [...new Set(wrongs)].slice(0, 3);
        const all = [right, ...picked];
        for (let i = all.length - 1; i > 0; i--) {
          const j = randomInt(random, 0, i);
          [all[i], all[j]] = [all[j]!, all[i]!];
        }
        return { kind, percent, choices: all, answer: all.indexOf(right) };
      }
      case "interest": {
        const K = pick([200, 500, 800, 1000, 1500, 2000, 2500], random);
        const p = pick([1, 1.5, 2, 2.5, 3, 4], random);
        const Z = interest(rat(K), rat(p * 2, 2));
        if (!decimalString(Z)) continue;
        return { kind, K, p, ...withChoices(s(Z), [String(K * p), s(add(rat(K), Z)), s(div(rat(K), rat(p * 2, 2)))].filter((x) => x !== null) as string[], random) };
      }
    }
  }
}

export function makePercentRound(random: Random, size = 10): PercentQuestion[] {
  const out: PercentQuestion[] = [];
  const counts = new Map<string, number>();
  while (out.length < size) {
    const q = makePercentQuestion(random);
    if ((counts.get(q.kind) ?? 0) >= 2) continue;
    counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
    out.push(q);
  }
  return out;
}
