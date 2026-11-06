import { randomInt, type Random } from "./random";

/**
 * Shapes on squared paper (Kästchenpapier). A shape is a set of squares; each square is
 * named by its row and column, like "2,5". One square is 1 cm by 1 cm.
 */
export type CellKey = `${number},${number}`;
export type Shape = ReadonlySet<CellKey>;

export const cellKey = (row: number, col: number): CellKey => `${row},${col}`;
export function parseCell(key: CellKey): [row: number, col: number] {
  const [r, c] = key.split(",").map(Number);
  return [r!, c!];
}
export const shapeOf = (cells: ReadonlyArray<readonly [number, number]>): Shape => new Set(cells.map(([r, c]) => cellKey(r, c)));

const NEIGHBOURS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

/** Flächeninhalt: count the squares. */
export const area = (shape: Shape): number => shape.size;

/** Umfang: every side of a square that doesn't touch another square of the shape. */
export function perimeter(shape: Shape): number {
  let sides = 0;
  for (const key of shape) {
    const [r, c] = parseCell(key);
    for (const [dr, dc] of NEIGHBOURS) if (!shape.has(cellKey(r + dr, c + dc))) sides++;
  }
  return sides;
}

/** A side on the edge, from corner (x1, y1) to corner (x2, y2); x is the column line, y the row line. */
export interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * The outline as closed walks, clockwise around each part (and anticlockwise around holes), so
 * the edge can be counted side by side, the way a child runs a finger round it. Together the
 * walks hold every edge exactly once: their total length is the perimeter.
 */
export function outline(shape: Shape): Edge[][] {
  // Every boundary side, pointing so the shape is on its right.
  const edges: Edge[] = [];
  for (const key of shape) {
    const [r, c] = parseCell(key);
    if (!shape.has(cellKey(r - 1, c))) edges.push({ x1: c, y1: r, x2: c + 1, y2: r }); // top, going right
    if (!shape.has(cellKey(r, c + 1))) edges.push({ x1: c + 1, y1: r, x2: c + 1, y2: r + 1 }); // right, going down
    if (!shape.has(cellKey(r + 1, c))) edges.push({ x1: c + 1, y1: r + 1, x2: c, y2: r + 1 }); // bottom, going left
    if (!shape.has(cellKey(r, c - 1))) edges.push({ x1: c, y1: r + 1, x2: c, y2: r }); // left, going up
  }
  const from = new Map<string, Edge[]>();
  for (const e of edges) {
    const k = `${e.x1},${e.y1}`;
    from.set(k, [...(from.get(k) ?? []), e]);
  }
  const used = new Set<Edge>();
  // Start at the top-left so the count begins where a child would.
  const order = [...edges].sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1);
  const walks: Edge[][] = [];
  for (const start of order) {
    if (used.has(start)) continue;
    const walk: Edge[] = [];
    let e: Edge | undefined = start;
    while (e && !used.has(e)) {
      used.add(e);
      walk.push(e);
      const nextOnes: Edge[] = (from.get(`${e.x2},${e.y2}`) ?? []).filter((n) => !used.has(n));
      e = nextOnes[0];
    }
    walks.push(walk);
  }
  return walks;
}

/** Do all the squares hang together (side to side, not just at a corner)? */
export function isConnected(shape: Shape): boolean {
  const first = shape.values().next().value;
  if (first === undefined) return true;
  const seen = new Set<CellKey>([first]);
  const queue: CellKey[] = [first];
  while (queue.length) {
    const [r, c] = parseCell(queue.pop()!);
    for (const [dr, dc] of NEIGHBOURS) {
      const k = cellKey(r + dr, c + dc);
      if (shape.has(k) && !seen.has(k)) {
        seen.add(k);
        queue.push(k);
      }
    }
  }
  return seen.size === shape.size;
}

/** If the shape is a full rectangle: its sides a (across) and b (down). */
export function asRectangle(shape: Shape): { a: number; b: number } | null {
  if (shape.size === 0) return null;
  const cells = [...shape].map(parseCell);
  const rows = cells.map(([r]) => r);
  const cols = cells.map(([, c]) => c);
  const a = Math.max(...cols) - Math.min(...cols) + 1;
  const b = Math.max(...rows) - Math.min(...rows) + 1;
  return a * b === shape.size ? { a, b } : null;
}

export function rectangle(a: number, b: number, top = 0, left = 0): Shape {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < b; r++) for (let c = 0; c < a; c++) cells.push([top + r, left + c]);
  return shapeOf(cells);
}

export const rectanglePerimeter = (a: number, b: number): number => 2 * a + 2 * b;
export const rectangleArea = (a: number, b: number): number => a * b;

/**
 * For n squares that hang together: the smallest and largest possible perimeter.
 * Largest: a long snake, 2n + 2. Smallest: as close to a square as possible, 2·⌈2√n⌉.
 */
export function perimeterRange(n: number): { min: number; max: number } {
  if (!Number.isInteger(n) || n < 1) throw new Error("Need at least one square");
  return { min: 2 * Math.ceil(2 * Math.sqrt(n) - 1e-9), max: 2 * n + 2 };
}

/** Every rectangle with exactly n squares, narrow side first: 12 → 1×12, 2×6, 3×4. */
export function rectanglesWithArea(n: number): Array<{ a: number; b: number; perimeter: number }> {
  const out: Array<{ a: number; b: number; perimeter: number }> = [];
  for (let a = 1; a * a <= n; a++) if (n % a === 0) out.push({ a, b: n / a, perimeter: rectanglePerimeter(a, n / a) });
  return out;
}

/** A random shape of n squares that hang together, grown square by square inside a size × size box. */
export function randomShape(n: number, random: Random, size = 6): Shape {
  const cells = new Set<CellKey>([cellKey(randomInt(random, 1, size - 2), randomInt(random, 1, size - 2))]);
  while (cells.size < n) {
    const [r, c] = parseCell([...cells][randomInt(random, 0, cells.size - 1)]!);
    const [dr, dc] = NEIGHBOURS[randomInt(random, 0, 3)]!;
    const [nr, nc] = [r + dr, c + dc];
    if (nr >= 0 && nc >= 0 && nr < size && nc < size) cells.add(cellKey(nr, nc));
  }
  return cells;
}

// ---------- area units ----------

/** mm², cm², dm², m²: each is 100 of the one before (10 · 10 small squares). Stored in mm². */
export const AREA_UNITS = [
  { symbol: "mm²", factor: 1 },
  { symbol: "cm²", factor: 100 },
  { symbol: "dm²", factor: 10_000 },
  { symbol: "m²", factor: 1_000_000 },
] as const;
export type AreaUnit = (typeof AREA_UNITS)[number]["symbol"];
export const factorOf = (u: AreaUnit): number => AREA_UNITS.find((x) => x.symbol === u)!.factor;

// ---------- quiz ----------

export type AreaQuestion = (
  | { kind: "countArea"; shape: Shape } // how many squares?
  | { kind: "countPerimeter"; shape: Shape } // how long is the edge?
  | { kind: "rectArea"; a: number; b: number } // A = a · b
  | { kind: "rectPerimeter"; a: number; b: number } // U = 2a + 2b
  | { kind: "missingSide"; a: number; b: number } // A and a given, b = ?
  | { kind: "convert"; amount: number; from: AreaUnit; to: AreaUnit } // 3 cm² = ? mm²
) & { choices: number[]; answer: number };

const pick = <T>(xs: readonly T[], random: Random): T => xs[randomInt(random, 0, xs.length - 1)]!;

/** The right value and three wrong ones from typical mix-ups, shuffled; exactly one is right. */
function withChoices(right: number, wrongs: number[], random: Random): { choices: number[]; answer: number } {
  const picked = [...new Set(wrongs.filter((w) => w !== right && w > 0 && Number.isSafeInteger(w)))].slice(0, 3);
  for (let step = 1; picked.length < 3; step++) {
    for (const w of [right + step, right - step]) if (w > 0 && !picked.includes(w) && picked.length < 3) picked.push(w);
  }
  const all = [right, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return { choices: all, answer: all.indexOf(right) };
}

/** The right answer to a question, in the unit it asks for. */
export function rightAnswer(q: AreaQuestion): number {
  switch (q.kind) {
    case "countArea": return area(q.shape);
    case "countPerimeter": return perimeter(q.shape);
    case "rectArea": return q.a * q.b;
    case "rectPerimeter": return 2 * q.a + 2 * q.b;
    case "missingSide": return q.b;
    case "convert": return (q.amount * factorOf(q.from)) / factorOf(q.to);
  }
}

export function makeAreaQuestion(random: Random): AreaQuestion {
  const kind = pick(["countArea", "countPerimeter", "rectArea", "rectPerimeter", "missingSide", "convert"] as const, random);
  switch (kind) {
    case "countArea":
    case "countPerimeter": {
      const shape = randomShape(randomInt(random, 4, 9), random);
      const [A, U] = [area(shape), perimeter(shape)];
      return kind === "countArea"
        ? { kind, shape, ...withChoices(A, [U, A + 1, A - 1, A + 2], random) }
        : { kind, shape, ...withChoices(U, [A, U - 2, U + 2, U - 1], random) };
    }
    case "rectArea":
    case "rectPerimeter": {
      const a = randomInt(random, 2, 12);
      let b = randomInt(random, 2, 9);
      if (b === a) b++;
      const [A, U] = [a * b, 2 * a + 2 * b];
      return kind === "rectArea"
        ? { kind, a, b, ...withChoices(A, [U, a + b, A + a, 2 * A], random) }
        : { kind, a, b, ...withChoices(U, [A, a + b, 2 * a + b, U + 2], random) };
    }
    case "missingSide": {
      const a = randomInt(random, 2, 10);
      const b = randomInt(random, 2, 10);
      return { kind, a, b, ...withChoices(b, [a * b - a, b + 1, b - 1, a], random) };
    }
    case "convert": {
      // One step, either way, whole amounts: 3 cm² = 300 mm², 500 cm² = 5 dm².
      const i = randomInt(random, 0, AREA_UNITS.length - 2);
      const [small, big] = [AREA_UNITS[i]!.symbol, AREA_UNITS[i + 1]!.symbol];
      const n = randomInt(random, 2, 9) * (random() < 0.3 ? 10 : 1);
      if (random() < 0.5) return { kind, amount: n, from: big, to: small, ...withChoices(n * 100, [n * 10, n * 1000, n], random) };
      return { kind, amount: n * 100, from: small, to: big, ...withChoices(n, [n * 10, n * 1000, n * 10_000], random) };
    }
  }
}

export function makeAreaRound(random: Random, size = 10): AreaQuestion[] {
  const round: AreaQuestion[] = [];
  const counts = new Map<string, number>();
  while (round.length < size) {
    const q = makeAreaQuestion(random);
    if ((counts.get(q.kind) ?? 0) >= 2) continue; // a good mix: at most two of each kind
    counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
    round.push(q);
  }
  return round;
}
