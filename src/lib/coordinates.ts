import { randomInt, type Random } from "./random";

/**
 * Das Koordinatensystem (Klasse 5, from Klasse 6 with all four quadrants).
 * Points are whole-number grid points; P(3 | 2) means 3 along the x-axis, 2 up the y-axis.
 */
export interface Point {
  x: number;
  y: number;
}
export const pt = (x: number, y: number): Point => ({ x, y });
export const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const key = (p: Point) => `${p.x},${p.y}`;

/** "first": only the first quadrant, 0 to 8 (Klasse 5). "all": all four, −6 to 6. */
export type Range = "first" | "all";
export const BOUNDS: Record<Range, { min: number; max: number }> = { first: { min: 0, max: 8 }, all: { min: -6, max: 6 } };
export const inRange = (p: Point, r: Range): boolean => [p.x, p.y].every((v) => v >= BOUNDS[r].min && v <= BOUNDS[r].max);

/** I to IV counted anticlockwise from top right; points on an axis are in none. */
export type Quadrant = 1 | 2 | 3 | 4 | "axis";
export function quadrant(p: Point): Quadrant {
  if (p.x === 0 || p.y === 0) return "axis";
  if (p.y > 0) return p.x > 0 ? 1 : 2;
  return p.x < 0 ? 3 : 4;
}

// ---------- shapes ----------

export type ShapeKind = "square" | "rectangle" | "parallelogram" | "triangle" | "other";
const sub = (a: Point, b: Point): Point => pt(a.x - b.x, a.y - b.y);
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const len2 = (a: Point) => dot(a, a);

/** What the points make when joined in order. */
export function classify(points: readonly Point[]): ShapeKind {
  if (points.length === 3) {
    const [a, b, c] = points as [Point, Point, Point];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return cross === 0 ? "other" : "triangle";
  }
  if (points.length !== 4) return "other";
  const [a, b, c, d] = points as [Point, Point, Point, Point];
  const ab = sub(b, a), bc = sub(c, b), dc = sub(c, d), ad = sub(d, a);
  if (!(ab.x === dc.x && ab.y === dc.y && bc.x === ad.x && bc.y === ad.y) || len2(ab) === 0 || len2(bc) === 0) return "other";
  if (ab.x * bc.y - ab.y * bc.x === 0) return "other"; // all on one line
  if (dot(ab, bc) !== 0) return "parallelogram";
  return len2(ab) === len2(bc) ? "square" : "rectangle";
}

/** The fourth corner of a rectangle or parallelogram A B C D, when B is the corner between A and C. */
export const fourthCorner = (a: Point, b: Point, c: Point): Point => pt(a.x + c.x - b.x, a.y + c.y - b.y);

// ---------- Schiffe versenken ----------

/** A ship is a row of neighbouring grid points, across or up. */
export type Ship = Point[];
export const SHIP_LENGTHS = [3, 2, 2] as const;

/** Ships that don't overlap or touch, not even at a corner. */
export function makeFleet(range: Range, random: Random): Ship[] {
  const { min, max } = BOUNDS[range];
  for (;;) {
    const ships: Ship[] = [];
    const taken = new Set<string>();
    let ok = true;
    for (const length of SHIP_LENGTHS) {
      let placed = false;
      for (let tries = 0; tries < 100 && !placed; tries++) {
        const across = random() < 0.5;
        const x0 = randomInt(random, min, across ? max - length + 1 : max);
        const y0 = randomInt(random, min, across ? max : max - length + 1);
        const ship = Array.from({ length }, (_, i) => pt(x0 + (across ? i : 0), y0 + (across ? 0 : i)));
        if (ship.some((p) => taken.has(key(p)))) continue;
        ships.push(ship);
        for (const p of ship) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) taken.add(key(pt(p.x + dx, p.y + dy)));
        placed = true;
      }
      if (!placed) ok = false;
    }
    if (ok) return ships;
  }
}

export type ShotResult = "miss" | "hit" | "sunk" | "again" | "outside";

/** What a shot at p does, given the shots before it. */
export function shoot(fleet: readonly Ship[], shots: readonly Point[], p: Point, range: Range): ShotResult {
  if (!inRange(p, range)) return "outside";
  if (shots.some((s) => same(s, p))) return "again";
  const ship = fleet.find((s) => s.some((q) => same(q, p)));
  if (!ship) return "miss";
  const after = [...shots, p];
  return ship.every((q) => after.some((s) => same(s, q))) ? "sunk" : "hit";
}
export const allSunk = (fleet: readonly Ship[], shots: readonly Point[]): boolean =>
  fleet.every((ship) => ship.every((q) => shots.some((s) => same(s, q))));

// ---------- quiz ----------

export type CoordQuestion = (
  | { kind: "read"; point: Point } // which coordinates has the drawn point P?
  | { kind: "find"; point: Point; marked: Point[] } // which of A–D is (x | y)?
  | { kind: "quadrant"; point: Point } // which quadrant? (all four only)
  | { kind: "shape"; points: Point[]; shape: ShapeKind } // what do the joined points make?
  | { kind: "fourth"; a: Point; b: Point; c: Point; d: Point } // where is D to finish the rectangle?
) & { choices: string[]; answer: number }; // choices: "x|y" for points, "A".."D", "1".."4", or a ShapeKind

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;
const ptText = (p: Point) => `${p.x}|${p.y}`;

function shuffled<T>(xs: T[], random: Random): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}

function randomPoint(range: Range, random: Random, notOnAxis = false): Point {
  const { min, max } = BOUNDS[range];
  for (;;) {
    const p = pt(randomInt(random, min, max), randomInt(random, min, max));
    if (notOnAxis ? p.x !== 0 && p.y !== 0 : true) return p;
  }
}

/** The right point and the classic mix-ups: x and y swapped, signs lost, one step off. */
function pointChoices(right: Point, range: Range, random: Random): { choices: string[]; answer: number } {
  const near = [[1, 0], [0, -1], [-1, 1], [0, 1], [-1, 0], [1, -1], [2, 1], [-2, -1]].map(([dx, dy]) => pt(right.x + dx!, right.y + dy!));
  const tries = [pt(right.y, right.x), pt(-right.x, right.y), pt(right.x, -right.y), ...near];
  const picked: Point[] = [];
  for (const p of tries) if (!same(p, right) && inRange(p, range) && !picked.some((q) => same(q, p))) picked.push(p);
  const all = shuffled([right, ...picked.slice(0, 3)], random);
  return { choices: all.map(ptText), answer: all.findIndex((p) => same(p, right)) };
}

/** Shapes with whole-number corners that fit in the range. */
function makeShape(range: Range, random: Random): { points: Point[]; shape: ShapeKind } {
  const { min, max } = BOUNDS[range];
  for (;;) {
    const shape = pick(["square", "rectangle", "parallelogram", "triangle"] as const, random);
    const a = pt(randomInt(random, min, max - 2), randomInt(random, min, max - 2));
    const w = randomInt(random, 2, 5), h = randomInt(random, 2, 4), s = randomInt(random, 1, 2);
    const points =
      shape === "square" ? [a, pt(a.x + w, a.y), pt(a.x + w, a.y + w), pt(a.x, a.y + w)]
      : shape === "rectangle" ? [a, pt(a.x + w, a.y), pt(a.x + w, a.y + h), pt(a.x, a.y + h)]
      : shape === "parallelogram" ? [a, pt(a.x + w, a.y), pt(a.x + w + s, a.y + h), pt(a.x + s, a.y + h)]
      : [a, pt(a.x + w, a.y), pt(a.x + randomInt(random, 0, w), a.y + h)];
    if (shape === "rectangle" && w === h) continue;
    if (points.every((p) => inRange(p, range)) && classify(points) === shape) return { points, shape };
  }
}

export const SHAPES: readonly ShapeKind[] = ["square", "rectangle", "parallelogram", "triangle"];
export type CoordKind = CoordQuestion["kind"];

export function makeCoordQuestion(range: Range, random: Random, only?: CoordKind): CoordQuestion {
  const kinds: CoordKind[] = range === "all" ? ["read", "find", "quadrant", "shape", "fourth"] : ["read", "find", "shape", "fourth"];
  const kind = only ?? pick(kinds, random);
  switch (kind) {
    case "read": {
      const point = randomPoint(range, random, range === "all");
      return { kind, point, ...pointChoices(point, range, random) };
    }
    case "find": {
      const point = randomPoint(range, random);
      const others = [pt(point.y, point.x), pt(-point.x, point.y), pt(point.x, -point.y), pt(point.x + 1, point.y - 1), pt(point.x - 2, point.y + 1)]
        .filter((p, i, all) => !same(p, point) && inRange(p, range) && all.findIndex((q) => same(q, p)) === i);
      if (others.length < 2) return makeCoordQuestion(range, random, "find");
      const marked = shuffled([point, ...others.slice(0, 3)], random);
      const answer = marked.findIndex((p) => same(p, point));
      return { kind, point, marked, choices: marked.map((_, i) => "ABCD"[i]!), answer };
    }
    case "quadrant": {
      const point = randomPoint("all", random, true);
      return { kind, point, choices: ["1", "2", "3", "4"], answer: (quadrant(point) as number) - 1 };
    }
    case "shape": {
      const { points, shape } = makeShape(range, random);
      return { kind, points, shape, choices: [...SHAPES], answer: SHAPES.indexOf(shape) };
    }
    case "fourth": {
      const { min, max } = BOUNDS[range];
      for (;;) {
        const b = pt(randomInt(random, min, max - 2), randomInt(random, min, max - 2));
        const a = pt(b.x, b.y + randomInt(random, 2, 4));
        const c = pt(b.x + randomInt(random, 2, 5), b.y);
        const d = fourthCorner(a, b, c);
        if (![a, c, d].every((p) => inRange(p, range))) continue;
        return { kind, a, b, c, d, ...pointChoices(d, range, random) };
      }
    }
  }
}

/** Ten questions, at most three of one kind. */
export function makeCoordRound(range: Range, random: Random): CoordQuestion[] {
  const out: CoordQuestion[] = [];
  const count = new Map<CoordKind, number>();
  while (out.length < 10) {
    const q = makeCoordQuestion(range, random);
    if ((count.get(q.kind) ?? 0) >= 3) continue;
    count.set(q.kind, (count.get(q.kind) ?? 0) + 1);
    out.push(q);
  }
  return out;
}

/** "3|2" back to a point. */
export const parsePointChoice = (c: string): Point => {
  const [x, y] = c.split("|").map(Number);
  return pt(x!, y!);
};
