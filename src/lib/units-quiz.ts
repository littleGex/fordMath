import { randomInt, type Random } from "./random";
import { UNITS, changeFor, formatIn, timeSpan, type Clock, type Quantity, type Unit } from "./units";

/** Grundschule: whole amounts, everyday units. Klasse 5: decimals, every unit, seconds, midnight. */
export type UnitsLevel = "grundschule" | "sek1";

export type UnitsQuestion = (
  | { kind: "convert"; quantity: Quantity; base: number; from: string; to: string } // 2,35 m = ? cm
  | { kind: "compare"; quantity: Quantity; left: number; leftUnit: string; right: number; rightUnit: string } // more or less?
  | { kind: "change"; price: number; paid: number } // in cents
  | { kind: "span"; from: Clock; to: Clock } // how long?
) & {
  /** convert: amounts in the smallest unit; change: cents; span: minutes; compare: 0 left, 1 equal, 2 right */
  choices: number[];
  answer: number;
};

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;

function shuffleIn(right: number, wrongs: number[], ok: (x: number) => boolean, random: Random): { choices: number[]; answer: number } {
  const picked = [...new Set(wrongs.filter((w) => w !== right && w > 0 && Number.isSafeInteger(w) && ok(w)))].slice(0, 3);
  for (let guard = 0; picked.length < 3 && guard < 200; guard++) {
    const w = right + pick([-3, -2, -1, 1, 2, 3], random) * pick([1, 5, 10, 50, 100], random) * Math.max(1, Math.floor(right / 1000));
    if (w > 0 && w !== right && !picked.includes(w) && ok(w)) picked.push(w);
  }
  const all = [right, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return { choices: all, answer: all.indexOf(right) };
}

const units = (q: Quantity) => UNITS[q] as readonly Unit[];

// Pairs a Grundschule child converts: from the bigger unit to the smaller, whole amounts (money may use cents).
const GS_PAIRS: Array<[Quantity, string, string]> = [
  ["money", "€", "ct"], ["length", "m", "cm"], ["length", "cm", "mm"], ["length", "km", "m"],
  ["mass", "kg", "g"], ["time", "h", "min"], ["time", "min", "s"],
];

function convertQuestion(level: UnitsLevel, random: Random): UnitsQuestion {
  let quantity: Quantity;
  let from: Unit;
  let to: Unit;
  let base: number;
  if (level === "grundschule") {
    const [q, f, t] = pick(GS_PAIRS, random);
    quantity = q;
    from = units(q).find((u) => u.symbol === f)!;
    to = units(q).find((u) => u.symbol === t)!;
    base = q === "money" ? randomInt(random, 101, 1999) : from.factor * randomInt(random, 2, 12);
  } else {
    quantity = pick(["money", "length", "mass", "time"] as const, random);
    const us = units(quantity);
    const i = randomInt(random, 0, us.length - 2);
    // Time only between neighbouring units (h ↔ min), so the numbers stay sensible.
    const j = quantity === "time" ? i + 1 : randomInt(random, i + 1, us.length - 1);
    const [big, small] = [us[i]!, us[j]!];
    const down = random() < 0.5; // big → small, or small → big
    from = down ? big : small;
    to = down ? small : big;
    if (quantity === "time") {
      // whole in both units: a multiple of the bigger unit's factor, or a half of it
      base = big.factor * randomInt(random, 1, 6) + (random() < 0.5 ? big.factor / 2 : 0);
      if (!Number.isInteger(base / small.factor)) base = big.factor * randomInt(random, 2, 6);
    } else {
      base = small.factor * randomInt(random, 2, 999) * (random() < 0.4 ? 10 : 1);
    }
  }
  const r = from.factor / to.factor;
  const shown = (x: number) => formatIn(x, quantity, to.symbol) !== null;
  const wrongs =
    quantity === "time"
      ? [Math.round((base / from.factor) * 100) * to.factor, base * 60, base / 60, base + to.factor * 10]
      : [base * 10, base / 10, base * (r >= 1 ? 100 : 1) / (r >= 1 ? 1 : 100), base * 100];
  return { kind: "convert", quantity, base, from: from.symbol, to: to.symbol, ...shuffleIn(base, wrongs, shown, random) };
}

function compareQuestion(level: UnitsLevel, random: Random): UnitsQuestion {
  const quantity = pick(level === "grundschule" ? (["money", "length", "mass"] as const) : (["money", "length", "mass", "time"] as const), random);
  const us = units(quantity);
  const i = randomInt(random, 0, us.length - 2);
  const big = us[i]!;
  const small = us[randomInt(random, i + 1, us.length - 1)]!;
  // Amounts a bit either side of one round number in the bigger unit, so the units matter.
  const around = big.factor * randomInt(random, 1, 9);
  const nudge = () => Math.round((around * randomInt(random, 50, 150)) / 100 / small.factor) * small.factor;
  const left = nudge();
  const right = random() < 0.2 ? left : nudge();
  const flip = random() < 0.5;
  const [leftUnit, rightUnit] = flip ? [small.symbol, big.symbol] : [big.symbol, small.symbol];
  // Each side must be writable exactly in its unit; round to that unit if needed.
  const fit = (x: number, symbol: string) => {
    if (formatIn(x, quantity, symbol) !== null) return x;
    const { factor } = units(quantity).find((u) => u.symbol === symbol)!;
    return Math.round(x / factor) * factor;
  };
  const L = fit(left, leftUnit);
  const R = fit(right, rightUnit);
  return {
    kind: "compare", quantity, left: L, leftUnit, right: R, rightUnit,
    choices: [0, 1, 2], answer: L > R ? 0 : L === R ? 1 : 2,
  };
}

function changeQuestion(level: UnitsLevel, random: Random): UnitsQuestion {
  const price = level === "grundschule" ? randomInt(random, 21, 399) * 5 : randomInt(random, 101, 4999);
  const paid = [500, 1000, 2000, 5000].find((n) => n > price) ?? 10000;
  const change = changeFor(price, paid).change;
  // Typical mistake: taking away digit by digit, the smaller from the bigger.
  const digitWise = Number(
    [...String(paid).padStart(5, "0")].map((d, k) => Math.abs(Number(d) - Number(String(price).padStart(5, "0")[k]))).join(""),
  );
  return { kind: "change", price, paid, ...shuffleIn(change, [digitWise, change + 10, change - 10, change + 100], () => true, random) };
}

function spanQuestion(level: UnitsLevel, random: Random): UnitsQuestion {
  const step = level === "grundschule" ? 5 : 1;
  const startMin = randomInt(random, 6 * 60, 20 * 60) - (level === "grundschule" ? 0 : 0);
  const length = level === "grundschule" ? randomInt(random, 2, 36) * 5 : randomInt(random, 15, 600);
  let start = Math.round(startMin / step) * step;
  if (level === "sek1" && random() < 0.25) start = randomInt(random, 21 * 60, 23 * 60 + 50); // past midnight
  const end = (start + length) % (24 * 60);
  const from = { h: Math.floor(start / 60), m: start % 60 };
  const to = { h: Math.floor(end / 60), m: end % 60 };
  const minutes = timeSpan(from, to).minutes;
  // Typical mistake: subtracting the clock times like decimal numbers (10:20 − 8:45 → 1 h 75 min).
  const asDecimal = (to.h * 100 + to.m + (end < start ? 2400 : 0)) - (from.h * 100 + from.m);
  const decimalMistake = Math.floor(asDecimal / 100) * 60 + (asDecimal % 100);
  return { kind: "span", from, to, ...shuffleIn(minutes, [decimalMistake, minutes + 60, minutes - 60, minutes + 10], () => true, random) };
}

export function makeUnitsQuestion(level: UnitsLevel, random: Random): UnitsQuestion {
  return pick([convertQuestion, convertQuestion, compareQuestion, changeQuestion, spanQuestion], random)(level, random);
}

export function makeUnitsRound(level: UnitsLevel, random: Random, size = 10): UnitsQuestion[] {
  return Array.from({ length: size }, () => makeUnitsQuestion(level, random));
}
