import { cellKey, isConnected, parseCell, shapeOf, type CellKey, type Shape } from "./area";
import { randomInt, type Random } from "./random";

/** Quader (cuboid) a × b × c, in whole units. */
export const volume = (a: number, b: number, c: number): number => a * b * c;
/** Oberfläche: the six faces come in three pairs. */
export const surface = (a: number, b: number, c: number): number => 2 * (a * b + a * c + b * c);

/** mm³, cm³, dm³, m³: each is 1 000 of the one before (10 · 10 · 10). Stored in mm³. Plus litres: 1 l = 1 dm³, 1 ml = 1 cm³. */
export const VOLUME_UNITS = [
  { symbol: "mm³", factor: 1 },
  { symbol: "cm³", factor: 1_000 },
  { symbol: "ml", factor: 1_000 },
  { symbol: "dm³", factor: 1_000_000 },
  { symbol: "l", factor: 1_000_000 },
  { symbol: "m³", factor: 1_000_000_000 },
] as const;
export type VolumeUnit = (typeof VOLUME_UNITS)[number]["symbol"];
export const volumeFactor = (u: VolumeUnit): number => VOLUME_UNITS.find((x) => x.symbol === u)!.factor;

// ---------- cube nets: folding by rolling a die ----------

/**
 * The six faces of a cube, as on a die: the face lying on the paper is `bottom`.
 * Rolling the cube one square to the right puts its east face on the paper, and so on.
 */
type Die = { bottom: number; top: number; north: number; south: number; east: number; west: number };
type Dir = "up" | "down" | "left" | "right";

function roll(d: Die, dir: Dir): Die {
  switch (dir) {
    case "right": return { ...d, bottom: d.east, east: d.top, top: d.west, west: d.bottom };
    case "left": return { ...d, bottom: d.west, west: d.top, top: d.east, east: d.bottom };
    case "up": return { ...d, bottom: d.north, north: d.top, top: d.south, south: d.bottom };
    case "down": return { ...d, bottom: d.south, south: d.top, top: d.north, north: d.bottom };
  }
}

const STEPS: Array<[Dir, number, number]> = [["right", 0, 1], ["left", 0, -1], ["up", -1, 0], ["down", 1, 0]];

/**
 * Folds 6 squares into a cube in the mind: start with face 0 on the first square, then roll the
 * cube square by square across the net. Each square gets the face that lands on it.
 * Returns that face for every square, or null if two squares would need the same face.
 */
export function fold(shape: Shape): Map<CellKey, number> | null {
  if (shape.size !== 6 || !isConnected(shape)) return null;
  const start = [...shape].sort()[0]!;
  const faces = new Map<CellKey, number>([[start, 0]]);
  const queue: Array<[CellKey, Die]> = [[start, { bottom: 0, top: 1, north: 2, south: 3, east: 4, west: 5 }]];
  while (queue.length) {
    const [key, die] = queue.shift()!;
    const [r, c] = parseCell(key);
    for (const [dir, dr, dc] of STEPS) {
      const next = cellKey(r + dr, c + dc);
      if (!shape.has(next) || faces.has(next)) continue;
      const rolled = roll(die, dir);
      faces.set(next, rolled.bottom);
      queue.push([next, rolled]);
    }
  }
  return new Set(faces.values()).size === 6 ? faces : null;
}

export const isCubeNet = (shape: Shape): boolean => fold(shape) !== null;

/** Faces 0–1, 2–3 and 4–5 are opposite each other (bottom–top, north–south, east–west). */
export const oppositeFace = (face: number): number => (face % 2 === 0 ? face + 1 : face - 1);

/** The square that ends up opposite `key` when the net is folded. */
export function oppositeSquare(shape: Shape, key: CellKey): CellKey | null {
  const faces = fold(shape);
  if (!faces) return null;
  const want = oppositeFace(faces.get(key)!);
  return [...faces].find(([, f]) => f === want)![0];
}

/** Moves a shape so its top-left corner is at 0,0. */
export function normalise(shape: Shape): Shape {
  const cells = [...shape].map(parseCell);
  const r0 = Math.min(...cells.map(([r]) => r));
  const c0 = Math.min(...cells.map(([, c]) => c));
  return shapeOf(cells.map(([r, c]) => [r - r0, c - c0]));
}

/** One name for a shape and all its turned and flipped copies, so equal nets count once. */
export function canonical(shape: Shape): string {
  const cells = [...shape].map(parseCell);
  const versions: string[] = [];
  for (let flip = 0; flip < 2; flip++) {
    let pts = cells.map(([r, c]) => [r, flip ? -c : c] as [number, number]);
    for (let turn = 0; turn < 4; turn++) {
      pts = pts.map(([r, c]) => [c, -r]);
      versions.push([...normalise(shapeOf(pts))].sort().join(" "));
    }
  }
  return versions.sort()[0]!;
}

/** Every shape of 6 joined squares (hexomino), each once up to turning and flipping: there are 35. */
export function hexominoes(): Shape[] {
  let level = new Map<string, Shape>([[canonical(shapeOf([[0, 0]])), shapeOf([[0, 0]])]]);
  for (let size = 2; size <= 6; size++) {
    const next = new Map<string, Shape>();
    for (const s of level.values()) {
      for (const k of s) {
        const [r, c] = parseCell(k);
        for (const [, dr, dc] of STEPS) {
          const n = cellKey(r + dr, c + dc);
          if (s.has(n)) continue;
          const grown = new Set(s).add(n);
          const name = canonical(grown);
          if (!next.has(name)) next.set(name, normalise(grown));
        }
      }
    }
    level = next;
  }
  return [...level.values()];
}

let NETS: Shape[] | null = null;
let NON_NETS: Shape[] | null = null;
/** The 11 cube nets. */
export const cubeNets = (): Shape[] => (NETS ??= hexominoes().filter(isCubeNet));
/** The 24 hexominoes that don't fold into a cube. */
export const nonNets = (): Shape[] => (NON_NETS ??= hexominoes().filter((s) => !isCubeNet(s)));

// ---------- quiz ----------

export type CuboidQuestion = (
  | { kind: "count"; a: number; b: number; c: number } // count the little cubes
  | { kind: "volume"; a: number; b: number; c: number } // V in cm³
  | { kind: "surface"; a: number; b: number; c: number } // O in cm²
  | { kind: "convert"; amount: number; from: VolumeUnit; to: VolumeUnit }
  | { kind: "net"; shapes: Shape[] } // which one folds into a cube? (choices are the shapes)
  | { kind: "opposite"; net: Shape; marked: CellKey; options: CellKey[] } // which square is opposite the marked one?
) & { choices: number[]; answer: number };

const shuffle = <T>(xs: T[], random: Random): T[] => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
};

function numberChoices(right: number, wrongs: number[], random: Random): { choices: number[]; answer: number } {
  const picked = [...new Set(wrongs.filter((w) => w !== right && w > 0 && Number.isSafeInteger(w)))].slice(0, 3);
  for (let k = 1; picked.length < 3; k++) for (const w of [right + k, right - k]) if (w > 0 && !picked.includes(w) && picked.length < 3) picked.push(w);
  const all = shuffle([right, ...picked], random);
  return { choices: all, answer: all.indexOf(right) };
}

/** Rotates a shape by a quarter turn a few times and maybe flips it, so the same net looks different. */
function scramble(shape: Shape, random: Random): Shape {
  const flip = random() < 0.5; // once for the whole shape, not per square
  let pts = [...shape].map(parseCell).map(([r, c]) => [r, flip ? -c : c] as [number, number]);
  for (let i = randomInt(random, 0, 3); i > 0; i--) pts = pts.map(([r, c]) => [c, -r]);
  return normalise(shapeOf(pts));
}

export function makeCuboidQuestion(random: Random): CuboidQuestion {
  const kind = (["count", "volume", "surface", "convert", "net", "opposite"] as const)[randomInt(random, 0, 5)]!;
  switch (kind) {
    case "count": {
      const [a, b, c] = [randomInt(random, 2, 5), randomInt(random, 2, 4), randomInt(random, 1, 4)];
      return { kind, a, b, c, ...numberChoices(a * b * c, [a * b, a * b + c, surface(a, b, c), a * b * (c + 1)], random) };
    }
    case "volume": {
      const [a, b, c] = [randomInt(random, 2, 12), randomInt(random, 2, 9), randomInt(random, 2, 8)];
      return { kind, a, b, c, ...numberChoices(volume(a, b, c), [surface(a, b, c), a + b + c, a * b, 2 * (a + b + c)], random) };
    }
    case "surface": {
      const [a, b, c] = [randomInt(random, 2, 9), randomInt(random, 2, 7), randomInt(random, 2, 6)];
      return { kind, a, b, c, ...numberChoices(surface(a, b, c), [a * b + a * c + b * c, volume(a, b, c), 6 * a * b], random) };
    }
    case "convert": {
      const pairs: Array<[VolumeUnit, VolumeUnit]> = [["dm³", "cm³"], ["cm³", "mm³"], ["m³", "dm³"], ["l", "ml"], ["dm³", "l"], ["cm³", "ml"]];
      const [big, small] = pairs[randomInt(random, 0, pairs.length - 1)]!;
      const ratio = volumeFactor(big) / volumeFactor(small);
      const n = randomInt(random, 2, 9);
      if (ratio === 1 || random() < 0.5) return { kind, amount: n, from: big, to: small, ...numberChoices(n * ratio, [n * 100, n * 10, n * ratio * 10, n + 1], random) };
      return { kind, amount: n * ratio, from: small, to: big, ...numberChoices(n, [n * 10, n * 100, n * ratio], random) };
    }
    case "net": {
      const nets = cubeNets();
      const others = shuffle([...nonNets()], random).slice(0, 3);
      const shapes = shuffle([scramble(nets[randomInt(random, 0, nets.length - 1)]!, random), ...others.map((s) => scramble(s, random))], random);
      const answer = shapes.findIndex(isCubeNet);
      return { kind, shapes, choices: [0, 1, 2, 3], answer };
    }
    case "opposite": {
      const nets = cubeNets();
      const net = scramble(nets[randomInt(random, 0, nets.length - 1)]!, random);
      const keys = [...net].sort();
      const marked = keys[randomInt(random, 0, 5)]!;
      const right = oppositeSquare(net, marked)!;
      const options = keys.filter((k) => k !== marked);
      return { kind, net, marked, options, choices: options.map((_, i) => i), answer: options.indexOf(right) };
    }
  }
}

export function makeCuboidRound(random: Random, size = 10): CuboidQuestion[] {
  const out: CuboidQuestion[] = [];
  const counts = new Map<string, number>();
  while (out.length < size) {
    const q = makeCuboidQuestion(random);
    if ((counts.get(q.kind) ?? 0) >= 2) continue;
    counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
    out.push(q);
  }
  return out;
}

/** The right answer, for checking (a number, or the index of the right shape or square). */
export function cuboidAnswer(q: CuboidQuestion): number {
  return q.choices[q.answer]!;
}
