/** A source of random numbers in [0, 1), like Math.random. Games take one as a parameter so tests can fix the seed. */
export type Random = () => number;

/**
 * Small, fast seeded generator (mulberry32). The same seed always gives the same
 * sequence, so a test can say "with seed 42 the round is exactly this".
 */
export function seededRandom(seed: number): Random {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole number from min to max, both included. */
export function randomInt(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/**
 * Picks one item, where an item with weight 4 is four times as likely as one with weight 1.
 * Generic: works for any item type T, and returns that same type.
 */
export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, random: Random): T {
  if (items.length === 0) throw new Error("Nothing to pick from");
  const weights = items.map(weight);
  const total = weights.reduce((a, w) => a + w, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r < 0) return items[i]!;
  }
  return items[items.length - 1]!; // only reached through rounding at the very top
}
