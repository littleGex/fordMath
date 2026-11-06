import { randomInt, type Random } from "./random";

/**
 * Ganze Zahlen (class 6): … −3, −2, −1, 0, 1, 2, 3 …
 * Every calculation a ± b is a move on the number line: start at a, then go up or down.
 */
export type Op = "+" | "-";

/**
 * The four cases a child has to tell apart:
 *   plus-pos   −3 + 5      go up 5
 *   plus-neg   −3 + (−5)   adding a negative is like subtracting: go down 5
 *   minus-pos   4 − 6      go down 6
 *   minus-neg   4 − (−3)   subtracting a negative is like adding: go up 3
 */
export type MoveRule = "plus-pos" | "plus-neg" | "minus-pos" | "minus-neg";

export interface Move {
  start: number;
  op: Op;
  b: number;
  rule: MoveRule;
  /** The signed move: +5 is up (or right), −5 is down (or left). */
  step: number;
  end: number;
  crossesZero: boolean;
}

export const opposite = (n: number): number => -n + 0; // Gegenzahl (+ 0 avoids −0)
export const distanceFromZero = (n: number): number => Math.abs(n); // Betrag |n|

export function move(start: number, op: Op, b: number): Move {
  for (const v of [start, b]) if (!Number.isSafeInteger(v)) throw new Error("Whole numbers only");
  const step = op === "+" ? b : -b;
  const rule: MoveRule = op === "+" ? (b < 0 ? "plus-neg" : "plus-pos") : b < 0 ? "minus-neg" : "minus-pos";
  const end = start + step + 0;
  return { start, op, b, rule, step: step + 0, end, crossesZero: (start < 0 && end > 0) || (start > 0 && end < 0) };
}

export const compareInts = (a: number, b: number): -1 | 0 | 1 => (a < b ? -1 : a > b ? 1 : 0);

// ---------- everyday stories ----------

export type Story =
  | { kind: "temperature"; start: number; change: number } // −4 °C, 7 degrees warmer (change +7) or colder (−7)
  | { kind: "account"; start: number; change: number } // balance −20 €, pay in 50 € (+50) or spend (−)
  | { kind: "lift"; start: number; change: number }; // floor −2, up 5 floors (+5)

export const storyMove = (s: Story): Move => move(s.start, s.change >= 0 ? "+" : "-", Math.abs(s.change));

export function makeStory(random: Random): Story {
  const kind = (["temperature", "account", "lift"] as const)[randomInt(random, 0, 2)]!;
  for (;;) {
    const [start, change] =
      kind === "temperature" ? [randomInt(random, -15, 10), randomInt(random, 2, 15) * (random() < 0.5 ? 1 : -1)]
        : kind === "account" ? [randomInt(random, -10, 10) * 10, randomInt(random, 1, 10) * 10 * (random() < 0.5 ? 1 : -1)]
          : [randomInt(random, -4, 6), randomInt(random, 1, 8) * (random() < 0.5 ? 1 : -1)];
    const end = start + change;
    // Interesting ones cross zero or stay below it; a lift has floors −4 to 10.
    if ((start < 0 || end < 0) && start !== 0 && end !== start && (kind !== "lift" || (end >= -4 && end <= 10))) return { kind, start, change };
  }
}

// ---------- quiz ----------

export type IntQuestion = (
  | { kind: "compare"; a: number; b: number } // which is bigger?
  | { kind: "smallest"; options: number[] }
  | { kind: "opposite"; n: number }
  | { kind: "distance"; n: number } // Betrag
  | { kind: "calc"; m: Move }
  | { kind: "story"; story: Story }
) & { choices: number[]; answer: number };

const shuffle = <T>(xs: T[], random: Random): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
};
const nonZero = (random: Random, lo: number, hi: number) => {
  for (;;) {
    const n = randomInt(random, lo, hi);
    if (n !== 0) return n;
  }
};

/** The right number plus up to three different wrong ones, shuffled. */
function withChoices(right: number, wrongs: number[], random: Random, count = 4): { choices: number[]; answer: number } {
  const picked = [...new Set(wrongs.map((w) => w + 0))].filter((w) => w !== right).slice(0, count - 1);
  for (let k = 1; picked.length < count - 1; k++) for (const w of [right + k, right - k]) if (!picked.includes(w) && picked.length < count - 1) picked.push(w);
  const all = shuffle([right, ...picked], random);
  return { choices: all, answer: all.indexOf(right) };
}

/** The right answer to a quiz question. */
export function intAnswer(q: IntQuestion): number {
  switch (q.kind) {
    case "compare": return Math.max(q.a, q.b);
    case "smallest": return Math.min(...q.options);
    case "opposite": return opposite(q.n);
    case "distance": return distanceFromZero(q.n);
    case "calc": return q.m.end;
    case "story": return storyMove(q.story).end;
  }
}

export function makeIntQuestion(random: Random): IntQuestion {
  const kind = (["compare", "smallest", "opposite", "distance", "calc", "calc", "story"] as const)[randomInt(random, 0, 6)]!;
  switch (kind) {
    case "compare": {
      // The trap: −7 looks bigger than −3. Mostly two negatives, sometimes one of each.
      const a = -randomInt(random, 1, 12);
      let b = random() < 0.7 ? -randomInt(random, 1, 12) : randomInt(random, 0, 5);
      if (b === a) b = a - randomInt(random, 1, 4);
      return { kind, a, b, choices: [a, b], answer: a > b ? 0 : 1 };
    }
    case "smallest": {
      const set = new Set<number>();
      while (set.size < 4) set.add(randomInt(random, -12, 8));
      const options = shuffle([...set], random);
      return { kind, options, choices: options, answer: options.indexOf(Math.min(...options)) };
    }
    case "opposite": {
      const n = nonZero(random, -15, 15);
      return { kind, n, ...withChoices(-n, [n, Math.abs(n) === n ? n + 1 : -n + 1, 0], random) };
    }
    case "distance": {
      const n = -randomInt(random, 1, 20);
      return { kind, n, ...withChoices(-n, [n, -n + 1, -n - 1], random) };
    }
    case "calc": {
      const a = nonZero(random, -12, 12);
      const b = nonZero(random, -12, 12);
      const m = move(a, random() < 0.5 ? "+" : "-", b);
      // Sign slips: the wrong direction, the answer's sign flipped, or the start's minus forgotten.
      return { kind, m, ...withChoices(m.end, [m.start - m.step, -m.end, Math.abs(m.start) + m.step], random) };
    }
    case "story": {
      const story = makeStory(random);
      const m = storyMove(story);
      return { kind, story, ...withChoices(m.end, [m.start - m.step, -m.end, Math.abs(m.step) - Math.abs(m.start)], random) };
    }
  }
}

export function makeIntRound(random: Random, size = 10): IntQuestion[] {
  const out: IntQuestion[] = [];
  const counts = new Map<string, number>();
  while (out.length < size) {
    const q = makeIntQuestion(random);
    if ((counts.get(q.kind) ?? 0) >= (q.kind === "calc" ? 3 : 2)) continue;
    counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
    out.push(q);
  }
  return out;
}
