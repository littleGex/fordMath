/**
 * Units and measures (Größen): money, length, mass and time.
 *
 * Every amount is stored as a whole number in the smallest unit (cents, millimetres,
 * milligrams, seconds). Whole numbers add and convert exactly, so 0,1 m + 0,2 m is
 * exactly 300 mm, never 0.30000000000000004.
 */

export interface Unit {
  readonly symbol: string;
  readonly factor: number; // how many of the smallest unit make one of this
}

/** Biggest unit first. `as const` keeps the symbols as exact strings, so types can be built from them. */
export const UNITS = {
  money: [{ symbol: "€", factor: 100 }, { symbol: "ct", factor: 1 }],
  length: [
    { symbol: "km", factor: 1_000_000 }, { symbol: "m", factor: 1000 }, { symbol: "dm", factor: 100 },
    { symbol: "cm", factor: 10 }, { symbol: "mm", factor: 1 },
  ],
  mass: [
    { symbol: "t", factor: 1_000_000_000 }, { symbol: "kg", factor: 1_000_000 },
    { symbol: "g", factor: 1000 }, { symbol: "mg", factor: 1 },
  ],
  time: [{ symbol: "d", factor: 86_400 }, { symbol: "h", factor: 3600 }, { symbol: "min", factor: 60 }, { symbol: "s", factor: 1 }],
} as const satisfies Record<string, readonly Unit[]>;

/** "money" | "length" | "mass" | "time", worked out from UNITS. */
export type Quantity = keyof typeof UNITS;
/** The unit symbols of one quantity: UnitSymbol<"money"> is "€" | "ct". */
export type UnitSymbol<Q extends Quantity = Quantity> = (typeof UNITS)[Q][number]["symbol"];

export const QUANTITIES = Object.keys(UNITS) as Quantity[];

/** Units used when writing a mixed amount like "2 m 35 cm" (dm is skipped, as in school). */
const MIXED: Record<Quantity, readonly string[]> = {
  money: ["€", "ct"],
  length: ["km", "m", "cm", "mm"],
  mass: ["t", "kg", "g", "mg"],
  time: ["d", "h", "min", "s"],
};

export function unitOf(quantity: Quantity, symbol: string): Unit {
  const u = (UNITS[quantity] as readonly Unit[]).find((x) => x.symbol === symbol);
  if (!u) throw new UnitError("unit", symbol);
  return u;
}

/** Money, length and mass go in steps of 10, 100, 1000. Time goes in 60s and 24s. */
export const isDecimal = (quantity: Quantity): boolean => quantity !== "time";

// ---------- errors the page can put into words ----------

export type UnitErrorCode = "empty" | "format" | "unit" | "too-precise" | "too-big" | "not-enough-paid";

export class UnitError extends Error {
  constructor(
    public readonly code: UnitErrorCode,
    public readonly detail = "",
  ) {
    super(`${code}${detail ? `: ${detail}` : ""}`);
    this.name = "UnitError";
  }
}

const MAX_BASE = 1e15;

/**
 * Reads "2,35" (or "2.35") as an amount in `unit`, exactly, without going through a float.
 * "2,35" m → 2350 mm. "0,0001" m is finer than a millimetre, so it's refused.
 */
export function parseAmount(text: string, quantity: Quantity, symbol: string): number {
  const unit = unitOf(quantity, symbol);
  const t = text.trim().replace(/[\s ]/g, "");
  if (t === "") throw new UnitError("empty");
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(t);
  if (!m) throw new UnitError("format", text);
  const whole = Number(m[1]);
  const frac = m[2] ?? "";
  const scale = 10 ** frac.length;
  const fracBase = (Number(frac || "0") * unit.factor) / scale;
  if (!Number.isInteger(fracBase)) throw new UnitError("too-precise", text);
  const base = whole * unit.factor + fracBase;
  if (base > MAX_BASE) throw new UnitError("too-big", text);
  return base;
}

/** " " between thousands groups for German, "," for English. */
const group = (s: string, lang: "de" | "en") => s.replace(/\B(?=(\d{3})+(?!\d))/g, lang === "de" ? " " : ",");

/**
 * An amount written in one unit: 2350 mm in m → "2,35". Exact, with a decimal comma in German.
 * Returns null for time amounts that need more than two decimals in that unit (100 s is 1,666… min).
 * Euros always get two decimals: "3,50", "5,00".
 */
export function formatIn(base: number, quantity: Quantity, symbol: string, lang: "de" | "en" = "de"): string | null {
  const unit = unitOf(quantity, symbol);
  const whole = Math.floor(base / unit.factor);
  const rest = base % unit.factor;
  const sep = lang === "de" ? "," : ".";
  if (!isDecimal(quantity)) {
    // Time: whole, or an exact decimal with at most two places (1,5 h = 90 min; 1,25 h = 75 min).
    if (rest === 0) return group(String(whole), lang);
    const hundredths = (base * 100) / unit.factor;
    if (!Number.isInteger(hundredths)) return null;
    return group(String(whole), lang) + sep + String(hundredths % 100).padStart(2, "0").replace(/0+$/, "");
  }
  const places = Math.round(Math.log10(unit.factor));
  let decimals = places > 0 ? String(rest).padStart(places, "0") : "";
  if (!(quantity === "money" && symbol === "€")) decimals = decimals.replace(/0+$/, "");
  return group(String(whole), lang) + (decimals ? sep + decimals : "");
}

/** "2 m 35 cm", "1 h 35 min", "3 € 50 ct": biggest units first, zero parts left out. */
export function formatMixed(base: number, quantity: Quantity): string {
  const parts: string[] = [];
  let rest = base;
  for (const symbol of MIXED[quantity]) {
    const { factor } = unitOf(quantity, symbol);
    const count = Math.floor(rest / factor);
    if (count > 0) parts.push(`${count} ${symbol}`);
    rest -= count * factor;
  }
  return parts.length ? parts.join(" ") : `0 ${MIXED[quantity].at(-1)}`;
}

/** The number you multiply by to go from one unit to the next smaller one: m → cm is 100. */
export const ratio = (quantity: Quantity, from: string, to: string): number =>
  unitOf(quantity, from).factor / unitOf(quantity, to).factor;

// ---------- the place-value table for units (class 5 converts with it) ----------

export interface UnitColumn {
  unit: string;
  place: number; // within the unit: 0 = ones, 1 = tens, 2 = hundreds
  digit: number | null; // null where the number has no digit (blank on the left)
}

/**
 * Columns for a Stellenwerttafel of units, biggest unit first, smallest last:
 * 2350 mm → km: [·] | m: [·, ·, 2] | dm: [3] | cm: [5] | mm: [0].
 * Each unit gets as many columns as the step down to the next unit (m → dm is 10: one column;
 * km → m is 1000: three columns for m). The biggest unit gets as many as it needs.
 */
export function unitTable(base: number, quantity: Quantity): UnitColumn[] {
  if (!isDecimal(quantity)) throw new Error("Only money, length and mass have a place-value table");
  const units = UNITS[quantity] as readonly Unit[];
  const digits = String(base);
  // Each smaller unit gets one column per power of ten in the step from the unit above it
  // (km → m is 1000: m gets 3 columns; m → dm is 10: dm gets 1). The biggest unit takes the rest.
  const cols = units.map((u, i) => (i === 0 ? 0 : Math.round(Math.log10(units[i - 1]!.factor / u.factor))));
  cols[0] = Math.max(1, digits.length - cols.reduce((a, b) => a + b, 0));

  const result: UnitColumn[] = [];
  let position = cols.reduce((a, b) => a + b, 0) - 1; // digit position from the right
  units.forEach((u, i) => {
    for (let p = cols[i]! - 1; p >= 0; p--, position--) {
      const d = position < digits.length ? Number(digits[digits.length - 1 - position]) : null;
      result.push({ unit: u.symbol, place: p, digit: d });
    }
  });
  return result;
}

// ---------- time spans (Zeitspannen) ----------

export interface Clock {
  h: number;
  m: number;
}

export function parseClock(text: string): Clock {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(text.trim());
  if (!m) throw new UnitError("format", text);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new UnitError("format", text);
  return { h, m: min };
}

export const clockText = (c: Clock): string => `${String(c.h).padStart(2, "0")}:${String(c.m).padStart(2, "0")}`;

export interface SpanStep {
  from: Clock;
  to: Clock;
  minutes: number;
}

/**
 * How long from one time to another, in jumps the way it's drawn on a time line in school:
 * 08:45 → 09:00 (15 min), 09:00 → 10:00 (1 h), 10:00 → 10:20 (20 min). Goes past midnight if needed.
 */
export function timeSpan(from: Clock, to: Clock): { minutes: number; steps: SpanStep[] } {
  const start = from.h * 60 + from.m;
  let end = to.h * 60 + to.m;
  if (end < start) end += 24 * 60;
  const steps: SpanStep[] = [];
  const at = (t: number): Clock => ({ h: Math.floor(t / 60) % 24, m: t % 60 });
  let now = start;
  const nextHour = Math.ceil(start / 60) * 60;
  if (start % 60 !== 0 && nextHour <= end) {
    steps.push({ from: at(now), to: at(nextHour), minutes: nextHour - now });
    now = nextHour;
  }
  const fullHours = Math.floor((end - now) / 60) * 60;
  if (fullHours > 0) {
    steps.push({ from: at(now), to: at(now + fullHours), minutes: fullHours });
    now += fullHours;
  }
  if (end > now) steps.push({ from: at(now), to: at(end), minutes: end - now });
  return { minutes: end - start, steps };
}

// ---------- shopping and change (Wechselgeld) ----------

/** Euro notes and coins, in cents, biggest first. */
export const EURO_PIECES = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export interface ChangeStep {
  from: number;
  to: number;
  add: number;
}

/**
 * Change counted up from the price, the way shop assistants and schoolbooks do it (Ergänzen):
 * 3,65 € → 3,70 € → 4,00 € → 5,00 €. Also the fewest notes and coins for it.
 */
export function changeFor(price: number, paid: number): { change: number; steps: ChangeStep[]; pieces: number[] } {
  if (paid < price) throw new UnitError("not-enough-paid");
  const steps: ChangeStep[] = [];
  let now = price;
  for (const milestone of [10, 100, 500, 1000, 2000, 5000, 10000]) {
    const next = Math.ceil(now / milestone) * milestone;
    if (next > now && next <= paid) {
      steps.push({ from: now, to: next, add: next - now });
      now = next;
    }
  }
  if (now < paid) steps.push({ from: now, to: paid, add: paid - now });
  const pieces: number[] = [];
  let rest = paid - price;
  for (const p of EURO_PIECES) {
    while (rest >= p) {
      pieces.push(p);
      rest -= p;
    }
  }
  return { change: paid - price, steps, pieces };
}
