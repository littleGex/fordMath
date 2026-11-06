import {
  AREA_UNITS, area, asRectangle, cellKey, isConnected, makeAreaQuestion, makeAreaRound, outline, perimeter, perimeterRange,
  randomShape, rectangle, rectanglesWithArea, rightAnswer, shapeOf,
} from "./area";
import { seededRandom } from "./random";

const L = shapeOf([[0, 0], [1, 0], [2, 0], [2, 1]]); // an L of 4 squares

describe("area and perimeter by counting", () => {
  it("a rectangle: A = a · b, U = 2a + 2b", () => {
    const r = rectangle(4, 3);
    expect(area(r)).toBe(12);
    expect(perimeter(r)).toBe(14);
    expect(asRectangle(r)).toEqual({ a: 4, b: 3 });
  });
  it("an L-shape", () => {
    expect(area(L)).toBe(4);
    expect(perimeter(L)).toBe(10);
    expect(asRectangle(L)).toBeNull();
  });
  it("a hole adds to the perimeter", () => {
    const ring = new Set(rectangle(3, 3));
    ring.delete(cellKey(1, 1));
    expect(area(ring)).toBe(8);
    expect(perimeter(ring)).toBe(16);
  });
  it("an empty shape", () => {
    expect(area(new Set())).toBe(0);
    expect(perimeter(new Set())).toBe(0);
    expect(asRectangle(new Set())).toBeNull();
  });
});

describe("outline", () => {
  it("walks round the edge once, starting top-left", () => {
    const walks = outline(rectangle(2, 1));
    expect(walks).toHaveLength(1);
    expect(walks[0]![0]).toEqual({ x1: 0, y1: 0, x2: 1, y2: 0 });
    expect(walks[0]).toHaveLength(6);
    const w = walks[0]!;
    for (let i = 0; i < w.length; i++) {
      const next = w[(i + 1) % w.length]!;
      expect([w[i]!.x2, w[i]!.y2]).toEqual([next.x1, next.y1]); // each side starts where the last ended
    }
  });
  it("a ring has two walks: outside and the hole", () => {
    const ring = new Set(rectangle(3, 3));
    ring.delete(cellKey(1, 1));
    expect(outline(ring).map((w) => w.length).sort()).toEqual([12, 4]);
  });
  it("always adds up to the perimeter", () => {
    const r = seededRandom(20);
    for (let i = 0; i < 200; i++) {
      const s = randomShape(randomIntBetween(r, 1, 14), r);
      expect(outline(s).reduce((n, w) => n + w.length, 0)).toBe(perimeter(s));
    }
  });
});
function randomIntBetween(r: () => number, lo: number, hi: number) {
  return lo + Math.floor(r() * (hi - lo + 1));
}

describe("same area, different perimeter", () => {
  it("12 squares: rectangles and the range", () => {
    expect(rectanglesWithArea(12)).toEqual([
      { a: 1, b: 12, perimeter: 26 }, { a: 2, b: 6, perimeter: 16 }, { a: 3, b: 4, perimeter: 14 },
    ]);
    expect(perimeterRange(12)).toEqual({ min: 14, max: 26 });
    expect(perimeterRange(5)).toEqual({ min: 10, max: 12 });
    expect(perimeterRange(1)).toEqual({ min: 4, max: 4 });
  });
  it("every random connected shape is inside the range", () => {
    const r = seededRandom(4);
    for (let i = 0; i < 300; i++) {
      const s = randomShape(randomIntBetween(r, 1, 16), r, 8);
      expect(isConnected(s)).toBe(true);
      const { min, max } = perimeterRange(area(s));
      expect(perimeter(s)).toBeGreaterThanOrEqual(min);
      expect(perimeter(s)).toBeLessThanOrEqual(max);
    }
  });
  it("squares touching only at a corner don't hang together", () => {
    expect(isConnected(shapeOf([[0, 0], [1, 1]]))).toBe(false);
    expect(isConnected(L)).toBe(true);
  });
});

describe("the quiz", () => {
  it("every question has exactly one right choice, and it's the right answer", () => {
    const r = seededRandom(20);
    for (let i = 0; i < 600; i++) {
      const q = makeAreaQuestion(r);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices[q.answer]).toBe(rightAnswer(q));
      expect(q.choices.filter((c) => c === rightAnswer(q))).toHaveLength(1);
      for (const c of q.choices) expect(Number.isInteger(c) && c > 0).toBe(true);
    }
  });
  it("area units go up by 100", () => {
    expect(AREA_UNITS.map((u) => u.factor)).toEqual([1, 100, 10_000, 1_000_000]);
  });
  it("a round mixes the kinds", () => {
    const round = makeAreaRound(seededRandom(9));
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.kind)).size).toBeGreaterThanOrEqual(5);
  });
});
