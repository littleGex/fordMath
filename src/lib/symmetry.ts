import { cellKey, isConnected, parseCell, type CellKey, type Shape } from "./area";
import { randomInt, type Random } from "./random";

/**
 * Achsensymmetrie on squared paper. Grid lines are numbered like the cells' corners: column c
 * runs from x = c to x = c + 1, row r from y = r to y = r + 1 (y goes down the page).
 *
 * - vertical:     the line x = at (a whole number: on a grid line; .5: through the middle of a column)
 * - horizontal:   the line y = at
 * - diagonal:     the line y − x = d, from top-left to bottom-right through the corners
 * - antidiagonal: the line x + y = s, from bottom-left to top-right
 */
export type Axis =
  | { kind: "vertical"; at: number }
  | { kind: "horizontal"; at: number }
  | { kind: "diagonal"; d: number }
  | { kind: "antidiagonal"; s: number };

/** Where one square lands in the mirror. */
export function mirrorCell(row: number, col: number, axis: Axis): [number, number] {
  switch (axis.kind) {
    case "vertical": return [row, 2 * axis.at - col - 1];
    case "horizontal": return [2 * axis.at - row - 1, col];
    case "diagonal": return [col + axis.d, row - axis.d];
    case "antidiagonal": return [axis.s - col - 1, axis.s - row - 1];
  }
}

export function mirror(shape: Shape, axis: Axis): Set<CellKey> {
  return new Set([...shape].map((k) => {
    const [r, c] = parseCell(k);
    return cellKey(...mirrorCell(r, c, axis));
  }));
}

export function isSymmetric(shape: Shape, axis: Axis): boolean {
  if (shape.size === 0) return false;
  for (const k of mirror(shape, axis)) if (!shape.has(k)) return false;
  return true;
}

/** How far a square is from the axis, counted in squares (to the nearer edge, as a child counts). */
export function distanceToAxis(row: number, col: number, axis: Axis): number {
  switch (axis.kind) {
    case "vertical": return Math.abs(col + 0.5 - axis.at) - 0.5;
    case "horizontal": return Math.abs(row + 0.5 - axis.at) - 0.5;
    // Diagonal lines: counted in diagonal steps, corner to corner; squares cut by the line are 0.
    case "diagonal": return Math.abs(row - col - axis.d);
    case "antidiagonal": return Math.abs(row + col + 1 - axis.s);
  }
}

/** Every mirror line of a shape: vertical and horizontal ones, and the two diagonal directions. */
export function axesOf(shape: Shape): Axis[] {
  if (shape.size === 0) return [];
  const cells = [...shape].map(parseCell);
  const rows = cells.map(([r]) => r);
  const cols = cells.map(([, c]) => c);
  const [r0, r1, c0, c1] = [Math.min(...rows), Math.max(...rows) + 1, Math.min(...cols), Math.max(...cols) + 1];
  const found: Axis[] = [];
  // A mirror line must go through the middle of the shape's bounding box.
  const vx = (c0 + c1) / 2;
  const hy = (r0 + r1) / 2;
  if (isSymmetric(shape, { kind: "vertical", at: vx })) found.push({ kind: "vertical", at: vx });
  if (isSymmetric(shape, { kind: "horizontal", at: hy })) found.push({ kind: "horizontal", at: hy });
  // Diagonals only for a square bounding box; they go through its centre.
  if (r1 - r0 === c1 - c0) {
    const d = hy - vx;
    const s = hy + vx;
    if (Number.isInteger(d) && isSymmetric(shape, { kind: "diagonal", d })) found.push({ kind: "diagonal", d });
    if (Number.isInteger(s) && isSymmetric(shape, { kind: "antidiagonal", s })) found.push({ kind: "antidiagonal", s });
  }
  return found;
}

// ---------- pictures for "find the axes" ----------

/** Pixel pictures on a small grid: "#" is a square. Each has a fixed number of mirror lines. */
export const PICTURES = {
  H: ["#...#", "#...#", "#####", "#...#", "#...#"],
  T: ["#####", "..#..", "..#..", "..#..", "..#.."],
  A: [".###.", "#...#", "#####", "#...#", "#...#"],
  E: ["#####", "#....", "####.", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#####"],
  F: ["#####", "#....", "####.", "#....", "#...."],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
  S: [".####", "#....", ".###.", "....#", "####."],
  X: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", ".###."],
  plus: ["..#..", "..#..", "#####", "..#..", "..#.."],
  heart: [".#.#.", "#####", "#####", ".###.", "..#.."],
  arrow: ["..#..", ".###.", "#####", "..#..", "..#.."],
  stairs: ["#....", "##...", "###..", "####.", "#####"],
  pinwheel: ["##.#", ".#.#", "#.#.", "#.##"],
  square: ["####", "####", "####", "####"],
  bar: ["######", "######"],
  flag: ["#....", "##...", "###..", "##...", "#...."],
  diamond: ["..#..", ".###.", "#####", ".###.", "..#.."],
} as const;
export type PictureName = keyof typeof PICTURES;

export function pictureShape(name: PictureName): Shape {
  const cells = new Set<CellKey>();
  PICTURES[name].forEach((line, r) => [...line].forEach((ch, c) => { if (ch === "#") cells.add(cellKey(r, c)); }));
  return cells;
}

// ---------- tasks ----------

export type SymmetryLevel = "grundschule" | "sek1";

export interface MirrorTask {
  axis: Axis;
  given: Shape; // the half the child sees
  answer: Shape; // the squares the child has to add (the mirror image of `given`, minus squares on the axis)
  size: number; // the grid is size × size
}

/**
 * Half a figure on one side of a mirror line. Grundschule: vertical or horizontal lines on grid lines.
 * Klasse 5: also lines through the middle of a column or row, and the diagonals.
 */
export function makeMirrorTask(level: SymmetryLevel, random: Random, size = 10): MirrorTask {
  const kinds: Axis["kind"][] = level === "grundschule" ? ["vertical", "horizontal"] : ["vertical", "horizontal", "diagonal", "antidiagonal"];
  for (;;) {
    const kind = kinds[randomInt(random, 0, kinds.length - 1)]!;
    const half = level === "sek1" && random() < 0.3 ? 0.5 : 0;
    const axis: Axis =
      kind === "vertical" ? { kind, at: size / 2 + half } : kind === "horizontal" ? { kind, at: size / 2 + half }
        : kind === "diagonal" ? { kind, d: 0 } : { kind, s: size };
    // Grow a shape on the left / top / lower-left / upper-left side, touching the axis.
    const onSide = (r: number, c: number) => {
      switch (axis.kind) {
        case "vertical": return c + 1 <= axis.at; // cells left of (or, for .5, up to the middle of) the line
        case "horizontal": return r + 1 <= axis.at;
        case "diagonal": return r > c; // below the diagonal
        case "antidiagonal": return r + c < size - 1; // above the antidiagonal
      }
    };
    const target = randomInt(random, 5, level === "grundschule" ? 9 : 12);
    const cells = new Set<CellKey>();
    // Start next to the axis.
    const start: [number, number] =
      axis.kind === "vertical" ? [randomInt(random, 2, size - 3), Math.ceil(axis.at) - 1]
        : axis.kind === "horizontal" ? [Math.ceil(axis.at) - 1, randomInt(random, 2, size - 3)]
          : axis.kind === "diagonal" ? (() => { const c = randomInt(random, 1, size - 3); return [c + 1, c] as [number, number]; })()
            : (() => { const c = randomInt(random, 1, size - 3); return [size - 2 - c, c] as [number, number]; })();
    cells.add(cellKey(...start));
    for (let guard = 0; cells.size < target && guard < 400; guard++) {
      const [r, c] = parseCell([...cells][randomInt(random, 0, cells.size - 1)]!);
      const [dr, dc] = ([[0, 1], [0, -1], [1, 0], [-1, 0]] as const)[randomInt(random, 0, 3)]!;
      const [nr, nc] = [r + dr, c + dc];
      if (nr >= 0 && nc >= 0 && nr < size && nc < size && onSide(nr, nc)) cells.add(cellKey(nr, nc));
    }
    if (cells.size < 5 || !isConnected(cells)) continue;
    const image = mirror(cells, axis);
    const inside = [...image].every((k) => { const [r, c] = parseCell(k); return r >= 0 && c >= 0 && r < size && c < size; });
    if (!inside) continue;
    const answer = new Set([...image].filter((k) => !cells.has(k)));
    if (answer.size < 3) continue;
    return { axis, given: cells, answer, size };
  }
}

/** Compares the child's squares with the answer. */
export function checkMirror(task: MirrorTask, drawn: ReadonlySet<CellKey>): { missing: CellKey[]; wrong: CellKey[]; ok: boolean } {
  const missing = [...task.answer].filter((k) => !drawn.has(k));
  const wrong = [...drawn].filter((k) => !task.answer.has(k));
  return { missing, wrong, ok: missing.length === 0 && wrong.length === 0 };
}

export interface AxesQuestion {
  name: PictureName;
  shape: Shape;
  count: number;
  choices: number[];
  answer: number;
}

/** "How many mirror lines?" for a picture; choices 0 to 4. */
export function makeAxesQuestion(name: PictureName): AxesQuestion {
  const shape = pictureShape(name);
  const count = axesOf(shape).length;
  const choices = [0, 1, 2, 4];
  return { name, shape, count, choices, answer: choices.indexOf(count) };
}

export function makeAxesRound(random: Random, size = 8): AxesQuestion[] {
  const names = Object.keys(PICTURES) as PictureName[];
  for (let i = names.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [names[i], names[j]] = [names[j]!, names[i]!];
  }
  return names.slice(0, size).map(makeAxesQuestion);
}
