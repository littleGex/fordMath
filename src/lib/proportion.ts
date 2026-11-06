import { div, equals, mul, rat, type Rational } from "./rational";
import { randomInt, type Random } from "./random";
import { decimalString } from "./percent";

/**
 * Zuordnungen (Klasse 6/7).
 *   proportional:     y : x is always the same (doubling x doubles y)        y = k · x
 *   antiproportional: x · y is always the same (doubling x halves y)         y = k / x
 * and the Dreisatz, which goes from what's known, down to 1, up to what's asked.
 */
export type Relation = "proportional" | "inverse" | "neither";
export type Kind = Exclude<Relation, "neither">;
export type Row = readonly [x: Rational, y: Rational];

export const quotient = ([x, y]: Row): Rational => div(y, x);
export const product = ([x, y]: Row): Rational => mul(x, y);

/** Proportional when every y : x is the same, antiproportional when every x · y is the same. */
export function classify(rows: readonly Row[]): Relation {
  if (rows.length < 2) throw new Error("A table needs at least two rows");
  if (rows.some(([x, y]) => x.n <= 0 || y.n <= 0)) throw new Error("Only positive values");
  const same = (f: (r: Row) => Rational) => rows.every((r) => equals(f(r), f(rows[0]!)));
  if (same(quotient)) return "proportional";
  if (same(product)) return "inverse";
  return "neither";
}

/** The y that belongs to x, given one known row. */
export function yFor(kind: Kind, known: Row, x: Rational): Rational {
  return kind === "proportional" ? mul(quotient(known), x) : div(product(known), x);
}

/** A Dreisatz: a ≙ b is known, what goes with c? */
export interface Dreisatz {
  kind: Kind;
  a: Rational;
  b: Rational;
  c: Rational;
}
/** The value for one: b : a when proportional, b · a when antiproportional. */
export const perOne = (d: Dreisatz): Rational => (d.kind === "proportional" ? div(d.b, d.a) : mul(d.b, d.a));
export const answer = (d: Dreisatz): Rational => yFor(d.kind, [d.a, d.b], d.c);

// ---------- quiz ----------

/** The everyday stories. Their words live in explain/proportion; here only what makes the numbers sensible. */
export const STORIES = {
  apples: "proportional",
  pens: "proportional",
  flour: "proportional",
  car: "proportional",
  pumps: "inverse",
  painters: "inverse",
  prize: "inverse",
  food: "inverse",
} as const satisfies Record<string, Kind>;
export type Story = keyof typeof STORIES;

export type ProportionQuestion = (
  | { kind: "story"; story: Story; a: number; b: number; c: number } // a ≙ b, what goes with c?
  | { kind: "classify"; xs: number[]; ys: number[]; relation: Relation } // which kind of table?
  | { kind: "fill"; xs: number[]; ys: Array<number | null>; relation: Kind } // the missing value
) & { choices: string[]; answer: number }; // numbers written with a point; for "classify" the Relation names

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;
const r100 = (v: number) => rat(Math.round(v * 100), 100);

function shuffle<T>(xs: T[], random: Random): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}

/** The right answer and three different, positive wrong ones (mix-ups first, then near misses). */
function withChoices(right: Rational, wrongs: Rational[], random: Random): { choices: string[]; answer: number } {
  const r = decimalString(right)!;
  const picked: string[] = [];
  for (const w of wrongs) {
    const s = w.n > 0 ? decimalString(w) : null;
    if (s !== null && s !== r && !picked.includes(s)) picked.push(s);
    if (picked.length === 3) break;
  }
  const step = Number(r) >= 20 ? 5 : Number(r) >= 4 ? 1 : 0.5;
  for (let k = 1; picked.length < 3; k++) {
    for (const s of [String(Number(r) + k * step), String(Number(r) - k * step)]) {
      if (picked.length < 3 && Number(s) > 0 && s !== r && !picked.includes(s)) picked.push(s);
    }
  }
  const all = shuffle([r, ...picked], random);
  return { choices: all, answer: all.indexOf(r) };
}

/** Numbers that suit each story: amounts a and c, and the value for one. */
function storyNumbers(story: Story, random: Random): { a: number; b: number; c: number } {
  const two = (lo: number, hi: number) => {
    const a = randomInt(random, lo, hi);
    let c = randomInt(random, lo, hi);
    while (c === a) c = randomInt(random, lo, hi);
    return [a, c] as const;
  };
  if (STORIES[story] === "proportional") {
    const [a, c] = two(2, story === "pens" ? 12 : 8);
    const one = {
      apples: randomInt(random, 3, 12) * 0.25, // € per kg
      pens: randomInt(random, 3, 30) * 0.1, // € per pen
      flour: randomInt(random, 2, 8) * 25, // g per person
      car: randomInt(random, 12, 22), // km per litre
    }[story as "apples" | "pens" | "flour" | "car"];
    return { a, b: Number(decimalString(mul(r100(one), rat(a)))), c };
  }
  // Antiproportional: the product stays the same, so pick it as a multiple of both amounts.
  const [a, c] = two(2, story === "prize" ? 6 : 8);
  const l = (a * c) / gcd(a, c);
  const m = randomInt(random, 1, Math.max(1, Math.floor((story === "prize" ? 120 : 72) / l)));
  return { a, b: (l * m) / a, c };
}
const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));

function storyQuestion(story: Story, random: Random): ProportionQuestion {
  const { a, b, c } = storyNumbers(story, random);
  const kind = STORIES[story];
  const d: Dreisatz = { kind, a: rat(a), b: r100(b), c: rat(c) };
  const other: Dreisatz = { ...d, kind: kind === "proportional" ? "inverse" : "proportional" };
  // Mix-ups: the wrong kind of Zuordnung, adding the difference, stopping at "for one", times c without dividing.
  const wrongs = [answer(other), rat(Math.round((b + c - a) * 100), 100), perOne(d), mul(d.b, d.c)];
  return { kind: "story", story, a, b, c, ...withChoices(answer(d), wrongs, random) };
}

/** Four x values in order, and the table they make. */
function table(relation: Relation, random: Random): { xs: number[]; ys: number[] } {
  if (relation === "inverse") {
    const T = pick([12, 24, 36, 48, 60, 72], random);
    const divisors = Array.from({ length: T }, (_, i) => i + 1).filter((x) => T % x === 0 && x <= 12);
    const xs = shuffle(divisors, random).slice(0, 4).sort((p, q) => p - q);
    return { xs, ys: xs.map((x) => T / x) };
  }
  const start = randomInt(random, 1, 3);
  const step = randomInt(random, 1, 3);
  const xs = [0, 1, 2, 3].map((i) => start + i * step);
  const k = randomInt(random, 2, 9);
  if (relation === "proportional") return { xs, ys: xs.map((x) => k * x) };
  // Neither: a fixed amount on top (like a taxi's base fare), or growing but not in step.
  return random() < 0.5 ? { xs, ys: xs.map((x) => k * x + randomInt(random, 1, 5)) } : { xs, ys: xs.map((x) => x * x + k) };
}

const RELATIONS: readonly Relation[] = ["proportional", "inverse", "neither"];

export function makeProportionQuestion(random: Random, only?: ProportionQuestion["kind"]): ProportionQuestion {
  const kind = only ?? pick(["story", "story", "classify", "fill"] as const, random);
  if (kind === "story") return storyQuestion(pick(Object.keys(STORIES) as Story[], random), random);
  if (kind === "classify") {
    const relation = pick(RELATIONS, random);
    return { kind, relation, ...table(relation, random), choices: [...RELATIONS], answer: RELATIONS.indexOf(relation) };
  }
  const relation = pick(["proportional", "inverse"] as const, random);
  const { xs, ys } = table(relation, random);
  const missing = randomInt(random, 1, 3);
  const known: Row = [rat(xs[0]!), rat(ys[0]!)];
  const right = rat(ys[missing]!);
  const otherKind = relation === "proportional" ? "inverse" : "proportional";
  // Mix-ups: the other kind of Zuordnung, carrying on the step between neighbours.
  const prev = ys[missing - 1]!;
  const wrongs = [yFor(otherKind, known, rat(xs[missing]!)), rat(prev + (prev - (ys[missing - 2] ?? 0))), rat(prev + xs[missing]! - xs[missing - 1]!)];
  return { kind, relation, xs, ys: ys.map((y, i) => (i === missing ? null : y)), ...withChoices(right, wrongs, random) };
}

/** A round of 10: four stories (two of each kind), three tables to sort, three to fill. */
export function makeProportionRound(random: Random): ProportionQuestion[] {
  const story = (k: Kind) => storyQuestion(pick((Object.keys(STORIES) as Story[]).filter((s) => STORIES[s] === k), random), random);
  const sorts = shuffle([...RELATIONS], random).map((relation) => {
    for (;;) {
      const q = makeProportionQuestion(random, "classify");
      if (q.kind === "classify" && q.relation === relation) return q;
    }
  });
  return shuffle([
    story("proportional"), story("proportional"), story("inverse"), story("inverse"),
    ...sorts,
    makeProportionQuestion(random, "fill"), makeProportionQuestion(random, "fill"), makeProportionQuestion(random, "fill"),
  ], random);
}
