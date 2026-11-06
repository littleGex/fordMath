import { randomInt, type Random } from "./random";

/**
 * Winkel in whole degrees. The kinds, as in Klasse 5:
 *   spitz 0°–90°, recht 90°, stumpf 90°–180°, gestreckt 180°, überstumpf 180°–360°, Vollwinkel 360°
 */
export type AngleKind = "spitz" | "recht" | "stumpf" | "gestreckt" | "ueberstumpf" | "voll";
export const ANGLE_KINDS: readonly AngleKind[] = ["spitz", "recht", "stumpf", "gestreckt", "ueberstumpf", "voll"];

export function angleKind(deg: number): AngleKind {
  if (!Number.isFinite(deg) || deg <= 0 || deg > 360) throw new Error("An angle here is more than 0° and at most 360°");
  if (deg < 90) return "spitz";
  if (deg === 90) return "recht";
  if (deg < 180) return "stumpf";
  if (deg === 180) return "gestreckt";
  if (deg < 360) return "ueberstumpf";
  return "voll";
}

/** What you read off the other scale of the Geodreieck: the classic mistake, 140° instead of 40°. */
export const otherScale = (deg: number): number => 180 - deg;

/** An überstumpf angle is measured through the rest of the full turn: 250° = 360° − 110°. */
export const restToFull = (deg: number): number => 360 - deg;

/** The smaller difference between two directions in degrees, 0 to 180. */
export function directionGap(a: number, b: number): number {
  const d = (((a - b) % 360) + 360) % 360;
  return Math.min(d, 360 - d);
}

/** Normalise a direction to 0 … 360. */
export const norm = (deg: number): number => ((deg % 360) + 360) % 360;

/** Close enough for measuring or drawing by hand. */
export const closeEnough = (given: number, target: number, tolerance = 2): boolean => Math.abs(given - target) <= tolerance;

// ---------- tasks ----------

/**
 * Every task shows an angle at a vertex, opening anticlockwise from `start` (the direction of the
 * first arm, in degrees, 0 = to the right) by `size` degrees.
 */
export type AngleTask = (
  | { kind: "kind"; choices: AngleKind[]; answer: number } // which kind of angle is this?
  | { kind: "estimate"; choices: number[]; answer: number } // roughly how big?
  | { kind: "measure" } // measure it with the Geodreieck, type the value
  | { kind: "draw" } // drag the second arm to make `size`
) & { size: number; start: number };

const shuffle = <T>(xs: T[], random: Random): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
};

/** A starting direction for the first arm: often flat, sometimes turned, so it's not always the same picture. */
const randomStart = (random: Random): number => (random() < 0.5 ? 0 : randomInt(random, 0, 11) * 30);

export function makeAngleTask(kind: AngleTask["kind"], random: Random): AngleTask {
  switch (kind) {
    case "kind": {
      const which = ANGLE_KINDS[randomInt(random, 0, ANGLE_KINDS.length - 1)]!;
      const size = { spitz: randomInt(random, 15, 80), recht: 90, stumpf: randomInt(random, 100, 170), gestreckt: 180, ueberstumpf: randomInt(random, 200, 340), voll: 360 }[which];
      const choices = [...ANGLE_KINDS];
      return { kind, size, start: randomStart(random), choices, answer: choices.indexOf(which) };
    }
    case "estimate": {
      const size = randomInt(random, 2, 34) * 5; // 10° … 170°
      // Wrong choices at least 30° away from the right one and from each other.
      const pool = shuffle(Array.from({ length: 17 }, (_, i) => (i + 1) * 10).filter((v) => Math.abs(v - size) >= 30), random);
      const wrong: number[] = [];
      for (const v of pool) if (wrong.length < 3 && wrong.every((w) => Math.abs(w - v) >= 30)) wrong.push(v);
      const choices = shuffle([size, ...wrong], random);
      return { kind, size, start: randomStart(random), choices, answer: choices.indexOf(size) };
    }
    case "measure":
      return { kind, size: randomInt(random, 12, 168), start: randomStart(random) };
    case "draw":
      return { kind, size: randomInt(random, 4, 34) * 5, start: random() < 0.6 ? 0 : 180 };
  }
}

/** Eight tasks: two of each kind, mixed. */
export function makeAngleRound(random: Random): AngleTask[] {
  const kinds: AngleTask["kind"][] = ["kind", "kind", "estimate", "estimate", "measure", "measure", "draw", "draw"];
  return shuffle(kinds, random).map((k) => makeAngleTask(k, random));
}

// ---------- the Geodreieck ----------

/** Where the Geodreieck lies: its zero point (middle of the long edge) and the direction of the long edge's 0 end. */
export interface GeoPose {
  x: number;
  y: number;
  rot: number; // degrees, anticlockwise; 0 = long edge horizontal, outer scale's 0 on the right
}

/**
 * Snaps the Geodreieck the way a careful child would lay it: the zero point onto the vertex when
 * it's close, and the long edge onto an arm when it's nearly in line (either way round).
 */
export function snapPose(pose: GeoPose, vertex: { x: number; y: number }, arms: readonly number[], dist = 14, turn = 5): GeoPose {
  let { x, y, rot } = pose;
  if (Math.hypot(x - vertex.x, y - vertex.y) <= dist) [x, y] = [vertex.x, vertex.y];
  for (const arm of arms) {
    for (const candidate of [arm, arm + 180]) {
      if (directionGap(rot, candidate) <= turn) rot = norm(candidate);
    }
  }
  return { x, y, rot: norm(rot) };
}

/**
 * What the two scales show at a direction, with the Geodreieck at `rot`:
 * the outer scale counts anticlockwise from the right-hand 0, the inner one from the left-hand 0.
 * Directions below the long edge (behind the Geodreieck) give null.
 */
export function readScales(rot: number, direction: number): { outer: number; inner: number } | null {
  const rel = norm(direction - rot);
  if (rel > 180) return null;
  return { outer: Math.round(rel), inner: Math.round(180 - rel) };
}
