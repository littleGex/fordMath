import { randomInt, type Random } from "./random";

/**
 * "Heute üben": what was practised, how it went, and a streak of days, all kept on the device.
 * Days are plain "YYYY-MM-DD" strings in local time, so they compare and store easily.
 */
export type Day = `${number}-${number}-${number}`;

export interface TopicStats {
  seen: number;
  right: number;
  last: Day;
}
/** Per topic id. Partial: topics never practised have no entry. */
export type Progress = Partial<Record<string, TopicStats>>;

export interface Streak {
  last: Day | null; // the last day a round was finished
  days: number; // how many days in a row, up to `last`
}

export function dayOf(date: Date): Day {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` as Day;
}

/** Whole days from a to b (b later is positive), ignoring clock changes. */
export function daysBetween(a: Day, b: Day): number {
  const utc = (d: Day) => {
    const [y, m, dd] = d.split("-").map(Number);
    return Date.UTC(y!, m! - 1, dd!);
  };
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/** A new Progress with one more answer for `topic`. */
export function recordAnswer(p: Progress, topic: string, ok: boolean, today: Day): Progress {
  const old = p[topic] ?? { seen: 0, right: 0, last: today };
  return { ...p, [topic]: { seen: old.seen + 1, right: old.right + (ok ? 1 : 0), last: today } };
}

/** Finishing a round today: the streak grows if the last round was yesterday, stays if it was today, else starts again. */
export function finishRound(s: Streak, today: Day): Streak {
  if (s.last === null) return { last: today, days: 1 };
  const gap = daysBetween(s.last, today);
  if (gap === 0) return s;
  if (gap === 1) return { last: today, days: s.days + 1 };
  return { last: today, days: 1 };
}

/** The streak as it stands today: it's broken if the last round was before yesterday. */
export function currentStreak(s: Streak, today: Day): number {
  if (s.last === null) return 0;
  return daysBetween(s.last, today) <= 1 ? s.days : 0;
}

/**
 * How often a topic should come up: weak topics more, unseen ones fairly often, and topics
 * not practised for a while get a little extra.
 */
export function topicWeight(stats: TopicStats | undefined, today: Day): number {
  if (!stats || stats.seen === 0) return 2;
  const wrongShare = 1 - stats.right / stats.seen;
  const rest = Math.min(3, Math.max(0, daysBetween(stats.last, today) - 1));
  return 1 + 3 * wrongShare + rest / 3;
}

/** `n` topics for a round, weighted, with at most `maxEach` of any one topic. */
export function chooseTopics<T extends string>(topics: readonly T[], p: Progress, today: Day, random: Random, n = 10, maxEach = 2): T[] {
  if (topics.length === 0) throw new Error("No topics to choose from");
  const cap = Math.max(maxEach, Math.ceil(n / topics.length));
  const counts = new Map<T, number>();
  const out: T[] = [];
  while (out.length < n) {
    const open = topics.filter((t) => (counts.get(t) ?? 0) < cap);
    const weights = open.map((t) => topicWeight(p[t], today));
    let r = random() * weights.reduce((a, w) => a + w, 0);
    let i = 0;
    while (i < open.length - 1 && r >= weights[i]!) r -= weights[i++]!;
    const t = open[i]!;
    counts.set(t, (counts.get(t) ?? 0) + 1);
    out.push(t);
  }
  // Shuffle so the same topic doesn't come twice in a row too often.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
