import { pickWeighted, type Random } from "./random";

export type Mode = "multiply" | "divide" | "mixed";

/**
 * Identifies one fact, whichever way round it's shown.
 * A template literal type: only strings like "m:7x8" or "d:7x8" are allowed.
 * k is how many times, t is the table: m:7x8 is 7 · 8 (in the 8 times table),
 * d:7x8 is 56 : 8 = 7.
 */
export type FactKey = `${"m" | "d"}:${number}x${number}`;

export type Question =
  | { kind: "multiply"; a: number; b: number; key: FactKey } // a · b = ?
  | { kind: "divide"; product: number; divisor: number; key: FactKey }; // product : divisor = ?

/** Leitner box: 0 = keeps going wrong … 4 = known well. */
export interface FactStats {
  box: number;
  seen: number;
  wrong: number;
}

/** What the child knows. Partial: facts never asked yet simply have no entry. */
export type Mastery = Partial<Record<FactKey, FactStats>>;

export const MAX_BOX = 4;
export const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function assertTables(tables: readonly number[]): void {
  if (tables.length === 0) throw new Error("Choose at least one times table");
  for (const t of tables) {
    if (!Number.isInteger(t) || t < 1 || t > 10) throw new Error(`${t} isn't a table from 1 to 10`);
  }
}

/** Every question for the chosen tables: k · t and (k·t) : t for k = 1…10. */
export function questionsFor(tables: readonly number[], mode: Mode): Question[] {
  assertTables(tables);
  const out: Question[] = [];
  for (const t of new Set(tables)) {
    for (let k = 1; k <= 10; k++) {
      if (mode !== "divide") out.push({ kind: "multiply", a: k, b: t, key: `m:${k}x${t}` });
      if (mode !== "multiply") out.push({ kind: "divide", product: k * t, divisor: t, key: `d:${k}x${t}` });
    }
  }
  return out;
}

export function answerOf(q: Question): number {
  return q.kind === "multiply" ? q.a * q.b : q.product / q.divisor;
}

export const isCorrect = (q: Question, given: number): boolean => answerOf(q) === given;

/** Facts that keep going wrong come back much more often; unseen facts sit in the middle. */
export function weightOf(stats: FactStats | undefined): number {
  return 2 ** (MAX_BOX - (stats?.box ?? 2));
}

/**
 * A round of `size` questions from `pool`, favouring weak facts.
 * No question repeats unless the pool is smaller than the round.
 * Multiplications are sometimes shown the other way round (8 · 7 instead of 7 · 8).
 */
export function makeRound(pool: readonly Question[], mastery: Mastery, random: Random, size = 10): Question[] {
  if (pool.length === 0) throw new Error("No questions to choose from");
  const round: Question[] = [];
  let left = [...pool];
  while (round.length < size) {
    if (left.length === 0) left = pool.filter((q) => q.key !== round[round.length - 1]?.key);
    const q = pickWeighted(left, (x) => weightOf(mastery[x.key]), random);
    left = left.filter((x) => x !== q);
    round.push(q.kind === "multiply" && q.a !== q.b && random() < 0.5 ? { ...q, a: q.b, b: q.a } : q);
  }
  return round;
}

/** Returns updated mastery; the original object is left unchanged. Right moves a fact up a box, wrong sends it back to 0. */
export function record(mastery: Mastery, key: FactKey, correct: boolean): Mastery {
  const old = mastery[key] ?? { box: 2, seen: 0, wrong: 0 };
  const next: FactStats = {
    box: correct ? Math.min(MAX_BOX, old.box + 1) : 0,
    seen: old.seen + 1,
    wrong: old.wrong + (correct ? 0 : 1),
  };
  return { ...mastery, [key]: next };
}

/** Questions the child has got wrong and hasn't mastered since. */
export function trickyPool(pool: readonly Question[], mastery: Mastery): Question[] {
  return pool.filter((q) => {
    const s = mastery[q.key];
    return s !== undefined && s.wrong > 0 && s.box <= 1;
  });
}

/** 3 stars for all right, 2 for 80 %+, 1 for half, else 0. */
export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0) return 0;
  const ratio = correct / total;
  if (ratio === 1) return 3;
  if (ratio >= 0.8) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

/**
 * How German schools derive a fact from the "Kernaufgaben" (1·, 2·, 5·, 10·):
 *   3· = 2· + 1·    4· = double 2·    6· = 5· + 1·    7· = 5· + 2·    8· = 10· − 2·    9· = 10· − 1·
 */
export type Strategy =
  | { kind: "core" } // 1, 2, 5, 10
  | { kind: "plus"; first: number; second: number } // 7 = 5 + 2
  | { kind: "double"; half: number } // 4 = double 2
  | { kind: "minus"; from: number; take: number }; // 9 = 10 − 1

export function strategyFor(times: number): Strategy {
  switch (times) {
    case 3: return { kind: "plus", first: 2, second: 1 };
    case 4: return { kind: "double", half: 2 };
    case 6: return { kind: "plus", first: 5, second: 1 };
    case 7: return { kind: "plus", first: 5, second: 2 };
    case 8: return { kind: "minus", from: 10, take: 2 };
    case 9: return { kind: "minus", from: 10, take: 1 };
    default: return { kind: "core" };
  }
}
