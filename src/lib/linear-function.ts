import { add, div, equals, isInteger, isZero, mul, neg, rat, sub, type Rational } from "./rational";
import { randomInt, type Random } from "./random";

/**
 * Lineare Funktionen (Klasse 7/8): y = m·x + b.
 *   m, die Steigung: how far up for 1 to the right (2/3: 3 to the right, 2 up)
 *   b, der y-Achsenabschnitt: where the line crosses the y-axis, at (0 | b)
 * Everything is exact, so a slope of 2/3 stays 2/3.
 */
export interface Line {
  m: Rational;
  b: Rational;
}
export interface RPoint {
  x: Rational;
  y: Rational;
}
export const line = (m: number | Rational, b: number | Rational): Line => ({ m: toRat(m), b: toRat(b) });
export const rpt = (x: number | Rational, y: number | Rational): RPoint => ({ x: toRat(x), y: toRat(y) });
const toRat = (v: number | Rational): Rational => (typeof v === "number" ? rat(v) : v);

export const yAt = (l: Line, x: Rational): Rational => add(mul(l.m, x), l.b);

/** Steigt, fällt or waagerecht. Proportional when b = 0 (a line through the origin). */
export type Direction = "rising" | "falling" | "flat";
export const direction = (l: Line): Direction => (l.m.n > 0 ? "rising" : l.m.n < 0 ? "falling" : "flat");
export const isProportional = (l: Line): boolean => isZero(l.b);

/** Where the line crosses the x-axis (Nullstelle): 0 = m·x + b, so x = −b : m. */
export type Zero = { kind: "point"; x: Rational } | { kind: "none" } | { kind: "all" };
export function zeroOf(l: Line): Zero {
  if (isZero(l.m)) return isZero(l.b) ? { kind: "all" } : { kind: "none" };
  return { kind: "point", x: div(neg(l.b), l.m) };
}

/** The line through two points: m = (y₂ − y₁) : (x₂ − x₁), then b = y₁ − m·x₁. */
export type FromPoints = { kind: "line"; line: Line } | { kind: "vertical"; x: Rational } | { kind: "same" };
export function throughPoints(p: RPoint, q: RPoint): FromPoints {
  if (equals(p.x, q.x)) return equals(p.y, q.y) ? { kind: "same" } : { kind: "vertical", x: p.x };
  const m = div(sub(q.y, p.y), sub(q.x, p.x));
  return { kind: "line", line: { m, b: sub(p.y, mul(m, p.x)) } };
}

/** Punktprobe: put x in and compare with y. */
export const onLine = (l: Line, p: RPoint): boolean => equals(yAt(l, p.x), p.y);

/** Two lines: one crossing point, parallel (same m), or the same line. */
export type Meeting = { kind: "point"; at: RPoint } | { kind: "parallel" } | { kind: "same" };
export function meet(l1: Line, l2: Line): Meeting {
  if (equals(l1.m, l2.m)) return equals(l1.b, l2.b) ? { kind: "same" } : { kind: "parallel" };
  const x = div(sub(l2.b, l1.b), sub(l1.m, l2.m));
  return { kind: "point", at: { x, y: yAt(l1, x) } };
}

/**
 * The slope triangle to draw: from a point on the line, `run` to the right and `rise` up.
 * For m = 2/3 that's 3 right and 2 up; for a whole m it's 1 right and m up.
 */
export const slopeTriangle = (l: Line): { run: number; rise: number } => ({ run: l.m.d, rise: l.m.n });

// ---------- quiz ----------

/** A tariff: a fixed amount plus a price per unit (minute, km). Prices in cents keep it whole. */
export interface Tariff {
  base: number; // cents
  per: number; // cents per unit
}

export type FunctionQuestion = (
  | { kind: "readM"; line: Line } // the slope of the drawn line
  | { kind: "readB"; line: Line } // where it crosses the y-axis
  | { kind: "pickGraph"; line: Line; options: Line[] } // which drawn line is y = mx + b?
  | { kind: "twoPoints"; p: RPoint; q: RPoint; line: Line } // m from two points
  | { kind: "probe"; line: Line; p: RPoint } // is P on the line?
  | { kind: "zero"; line: Line } // where it crosses the x-axis
  | { kind: "tariff"; story: "phone" | "taxi"; a: Tariff; b: Tariff; at: number } // when do both cost the same?
) & { choices: string[]; answer: number }; // Rationals as "2", "-1/2"; "yes"/"no" for the Punktprobe

export const ratText = (q: Rational): string => (q.d === 1 ? String(q.n) : `${q.n}/${q.d}`);
export const parseRat = (s: string): Rational => {
  const [n, d] = s.split("/").map(Number);
  return rat(n!, d ?? 1);
};

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;
const SLOPES: readonly Rational[] = [rat(1), rat(2), rat(3), rat(-1), rat(-2), rat(-3), rat(1, 2), rat(-1, 2), rat(2, 3), rat(-2, 3), rat(3, 2), rat(-3, 2), rat(1, 3), rat(-1, 3)];
/** Lines that fit on a grid from −6 to 6 and show both their y-axis point and a slope triangle. */
function randomLine(random: Random, whole = false): Line {
  const m = whole ? pick(SLOPES.filter((s) => s.d === 1), random) : pick(SLOPES, random);
  return { m, b: rat(randomInt(random, -4, 4)) };
}

function shuffled<T>(xs: T[], random: Random): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}

/** The right number and different wrong ones (mix-ups first), as text. */
function ratChoices(right: Rational, wrongs: Rational[], random: Random): { choices: string[]; answer: number } {
  const r = ratText(right);
  const picked: string[] = [];
  for (const w of [...wrongs, add(right, rat(1)), sub(right, rat(1)), add(right, rat(2))]) {
    const s = ratText(w);
    if (s !== r && !picked.includes(s)) picked.push(s);
    if (picked.length === 3) break;
  }
  const all = shuffled([r, ...picked], random);
  return { choices: all, answer: all.indexOf(r) };
}

const inv = (q: Rational): Rational => (isZero(q) ? q : div(rat(1), q));

export function makeFunctionQuestion(random: Random, only?: FunctionQuestion["kind"]): FunctionQuestion {
  const kind = only ?? pick(["readM", "readB", "pickGraph", "twoPoints", "probe", "zero", "tariff"] as const, random);
  switch (kind) {
    case "readM": {
      const l = randomLine(random);
      return { kind, line: l, ...ratChoices(l.m, [neg(l.m), inv(l.m), l.b], random) };
    }
    case "readB": {
      for (;;) {
        const l = randomLine(random, true);
        const z = zeroOf(l);
        if (isZero(l.b)) continue;
        return { kind, line: l, ...ratChoices(l.b, [neg(l.b), ...(z.kind === "point" ? [z.x] : []), l.m], random) };
      }
    }
    case "pickGraph": {
      for (;;) {
        const l = randomLine(random, true);
        if (isZero(l.b) || equals(l.m, l.b) || equals(l.m, neg(l.b))) continue;
        // The look-alikes: sign of m flipped, sign of b flipped, m and b swapped.
        const options = shuffled([l, { m: neg(l.m), b: l.b }, { m: l.m, b: neg(l.b) }, { m: l.b, b: l.m }], random);
        if (options.some((o, i) => options.findIndex((p) => equals(p.m, o.m) && equals(p.b, o.b)) !== i)) continue;
        return { kind, line: l, options, choices: ["1", "2", "3", "4"], answer: options.indexOf(l) };
      }
    }
    case "twoPoints": {
      const l = randomLine(random);
      const x1 = randomInt(random, -2, 1) * l.m.d;
      const x2 = x1 + l.m.d * randomInt(random, 1, 2);
      const p = { x: rat(x1), y: yAt(l, rat(x1)) }, q = { x: rat(x2), y: yAt(l, rat(x2)) };
      const dy = sub(q.y, p.y), dx = sub(q.x, p.x);
      return { kind, p, q, line: l, ...ratChoices(l.m, [div(dx, dy), neg(l.m), dy, sub(q.y, q.x)], random) };
    }
    case "probe": {
      const l = randomLine(random, true);
      const x = rat(randomInt(random, -3, 3));
      const on = random() < 0.5;
      const y = on ? yAt(l, x) : add(yAt(l, x), rat(pick([-2, -1, 1, 2], random)));
      return { kind, line: l, p: { x, y }, choices: ["yes", "no"], answer: on ? 0 : 1 };
    }
    case "zero": {
      for (;;) {
        const l = { m: rat(pick([-4, -3, -2, -1, 1, 2, 3, 4], random)), b: rat(randomInt(random, -8, 8)) };
        const z = zeroOf(l);
        if (z.kind !== "point" || !isInteger(z.x) || isZero(l.b)) continue;
        return { kind, line: l, ...ratChoices(z.x, [neg(z.x), l.b, neg(l.b), mul(l.b, l.m)], random) };
      }
    }
    case "tariff": {
      // A has a fixed amount and a lower price per unit; B only charges per unit (or a smaller fixed amount).
      for (;;) {
        const story = pick(["phone", "taxi"] as const, random);
        const unit = story === "phone" ? pick([5, 10], random) : pick([50, 100], random);
        const aPer = unit * randomInt(random, 1, 3), bPer = aPer + unit * randomInt(random, 1, 2);
        const at = story === "phone" ? randomInt(random, 2, 12) * 5 : randomInt(random, 2, 8);
        const bBase = story === "taxi" ? randomInt(random, 0, 2) * 100 : 0;
        const aBase = bBase + (bPer - aPer) * at;
        if (aBase > 2000 || aBase % 50 !== 0) continue;
        const a = { base: aBase, per: aPer }, b = { base: bBase, per: bPer };
        const wrongs = [rat(Math.round(aBase / bPer)), rat(Math.round(aBase / aPer)), rat(at * 2), rat(Math.max(1, Math.round(at / 2)))];
        return { kind, story, a, b, at, ...ratChoices(rat(at), wrongs, random) };
      }
    }
  }
}

/** Ten questions, at most two of a kind. */
export function makeFunctionRound(random: Random): FunctionQuestion[] {
  const out: FunctionQuestion[] = [];
  const count = new Map<string, number>();
  while (out.length < 10) {
    const q = makeFunctionQuestion(random);
    if ((count.get(q.kind) ?? 0) >= 2) continue;
    count.set(q.kind, (count.get(q.kind) ?? 0) + 1);
    out.push(q);
  }
  return out;
}

