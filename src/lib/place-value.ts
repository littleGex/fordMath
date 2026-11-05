import { randomInt, type Random } from "./random";

/**
 * Place values (Stellenwerte) and rounding (Runden).
 * A place is a power of ten: 0 = ones (Einer), 1 = tens (Zehner), 2 = hundreds, … 9 = billions (Milliarden).
 */

export const MAX_PLACE_NUMBER = 999_999_999_999;

export function assertPlaceNumber(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_PLACE_NUMBER) {
    throw new Error(`Use a whole number from 0 to ${MAX_PLACE_NUMBER}`);
  }
}

export interface PlacePart {
  place: number;
  digit: number;
  value: number; // digit · 10^place
}

/** 4572 → 4 thousands, 5 hundreds, 7 tens, 2 ones (highest place first, zeros included). */
export function splitPlaces(n: number): PlacePart[] {
  assertPlaceNumber(n);
  const digits = String(n);
  return [...digits].map((d, i) => {
    const place = digits.length - 1 - i;
    return { place, digit: Number(d), value: Number(d) * 10 ** place };
  });
}

/** The opposite of splitPlaces: add the place values back up. */
export function joinPlaces(parts: ReadonlyArray<{ place: number; digit: number }>): number {
  return parts.reduce((sum, p) => sum + p.digit * 10 ** p.place, 0);
}

/** The digit at a place: digitAt(4572, 2) = 5. */
export const digitAt = (n: number, place: number): number => Math.floor(n / 10 ** place) % 10;

/** Changes one digit: setDigit(4572, 2, 9) = 4972. */
export function setDigit(n: number, place: number, digit: number): number {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) throw new Error("A digit is 0 to 9");
  const result = n + (digit - digitAt(n, place)) * 10 ** place;
  assertPlaceNumber(result);
  return result;
}

/** "4 572" with a narrow no-break space between groups of three, as in German schoolbooks. */
export function groupDigits(n: number, sep = " "): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export interface Rounding {
  n: number;
  place: number; // rounding to this place: 1 = tens, 2 = hundreds, …
  decider: number; // the digit one place to the right, which decides
  up: boolean; // 5 or more rounds up
  lower: number; // the round number below (or equal)
  upper: number; // the next round number above
  result: number;
}

/** Runden: look at the digit to the right; 0–4 round down, 5–9 round up. */
export function roundTo(n: number, place: number): Rounding {
  assertPlaceNumber(n);
  if (!Number.isInteger(place) || place < 1 || place > 11) throw new Error("Round to tens (1) up to 10^11");
  const size = 10 ** place;
  const lower = Math.floor(n / size) * size;
  const upper = lower + size;
  const decider = digitAt(n, place - 1);
  const up = decider >= 5;
  return { n, place, decider, up, lower, upper, result: up ? upper : lower };
}

// ---------- practice questions ----------

/** Number sizes: up to 1 000 (class 3), a million and a billion (class 5). */
export type PlaceLevel = 1_000 | 1_000_000 | 1_000_000_000;

export type PlaceQuestion = (
  | { kind: "round"; n: number; place: number } // round n to this place
  | { kind: "digit-value"; n: number; place: number } // what is the digit at this place worth?
  | { kind: "words"; n: number } // which number is written here in words?
  | { kind: "number-line"; n: number; lower: number; step: number } // which number does the arrow show?
) & { choices: number[]; answer: number };

const placesOf = (n: number) => String(n).length;

/** A number with all its digits in use, sized for the level, sometimes with a 0 inside. */
function levelNumber(level: PlaceLevel, random: Random): number {
  const min = level / 10;
  let n = randomInt(random, min, level - 1);
  if (random() < 0.3) n = setDigit(n, randomInt(random, 1, placesOf(n) - 2), 0); // 4 052: zeros are where mistakes happen
  return n;
}

function withChoices(right: number, wrongs: number[], random: Random): { choices: number[]; answer: number } {
  const picked = [...new Set(wrongs.filter((w) => w !== right && w >= 0 && Number.isSafeInteger(w)))].slice(0, 3);
  for (let guard = 0; picked.length < 3 && guard < 100; guard++) {
    const w = right + randomInt(random, -9, 9) * 10 ** randomInt(random, 0, Math.max(0, placesOf(right) - 2));
    if (w !== right && w >= 0 && !picked.includes(w)) picked.push(w);
  }
  const all = [right, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return { choices: all, answer: all.indexOf(right) };
}

export function makePlaceQuestion(level: PlaceLevel, random: Random): PlaceQuestion {
  const n = levelNumber(level, random);
  const len = placesOf(n);
  switch (randomInt(random, 0, 3)) {
    case 0: {
      const place = randomInt(random, 1, len - 1);
      const r = roundTo(n, place);
      const other = r.up ? r.lower : r.upper;
      const neighbour = roundTo(n, place < len - 1 ? place + 1 : place - 1 || 1).result;
      return { kind: "round", n, place, ...withChoices(r.result, [other, neighbour, Math.floor(n / 10 ** place) * 10 ** place + 10 ** (place - 1) * 5], random) };
    }
    case 1: {
      const nonZero = splitPlaces(n).filter((p) => p.digit > 0 && p.place > 0);
      const part = nonZero[randomInt(random, 0, nonZero.length - 1)] ?? { place: 0, digit: n % 10, value: n % 10 };
      const { digit, place, value } = part;
      return { kind: "digit-value", n, place, ...withChoices(value, [digit, digit * 10 ** (place + 1), digit * 10 ** Math.max(0, place - 1)], random) };
    }
    case 2: {
      const swapped = Number(String(n).slice(0, -2) + String(n).slice(-1) + String(n).slice(-2, -1));
      return { kind: "words", n, ...withChoices(n, [swapped, setDigit(n, 1, (digitAt(n, 1) + 1) % 10), n * 10 > MAX_PLACE_NUMBER ? n + 1 : Math.floor(n / 10)], random) };
    }
    default: {
      // A line from a round number, with 10 ticks; the arrow points at one tick.
      const stepPlace = randomInt(random, 0, Math.max(0, len - 2));
      const step = 10 ** stepPlace;
      const lower = Math.floor(n / (step * 10)) * step * 10;
      const at = lower + randomInt(random, 1, 9) * step;
      return { kind: "number-line", n: at, lower, step, ...withChoices(at, [at + step, at - step, lower + (at - lower) / 10], random) };
    }
  }
}

export function makePlaceRound(level: PlaceLevel, random: Random, size = 10): PlaceQuestion[] {
  return Array.from({ length: size }, () => makePlaceQuestion(level, random));
}
