import {
  allSunk, BOUNDS, classify, fourthCorner, inRange, makeCoordQuestion, makeCoordRound, makeFleet, parsePointChoice, pt, quadrant, same, shoot, SHIP_LENGTHS, type Range,
} from "./coordinates";
import { seededRandom } from "./random";

describe("Koordinatensystem", () => {
  it("quadrants go anticlockwise from top right", () => {
    expect([pt(2, 3), pt(-2, 3), pt(-2, -3), pt(2, -3), pt(0, 4)].map(quadrant)).toEqual([1, 2, 3, 4, "axis"]);
  });
  it("tells shapes apart", () => {
    expect(classify([pt(1, 1), pt(4, 1), pt(4, 4), pt(1, 4)])).toBe("square");
    expect(classify([pt(1, 1), pt(5, 1), pt(5, 3), pt(1, 3)])).toBe("rectangle");
    expect(classify([pt(0, 0), pt(4, 0), pt(5, 2), pt(1, 2)])).toBe("parallelogram");
    expect(classify([pt(0, 0), pt(4, 0), pt(2, 3)])).toBe("triangle");
    expect(classify([pt(0, 0), pt(1, 1), pt(2, 2)])).toBe("other");
    expect(classify([pt(0, 0), pt(4, 0), pt(3, 2), pt(1, 2)])).toBe("other"); // a trapezium
  });
  it("finds the fourth corner", () => {
    expect(fourthCorner(pt(1, 4), pt(1, 1), pt(5, 1))).toEqual(pt(5, 4));
  });
  it("places ships that don't overlap or touch", () => {
    const r = seededRandom(30);
    for (const range of ["first", "all"] as Range[]) {
      for (let i = 0; i < 200; i++) {
        const fleet = makeFleet(range, r);
        expect(fleet.map((s) => s.length)).toEqual([...SHIP_LENGTHS]);
        const all = fleet.flat();
        for (const p of all) expect(inRange(p, range)).toBe(true);
        fleet.forEach((s, i) => fleet.forEach((t, j) => {
          if (i === j) return;
          for (const p of s) for (const q of t) expect(Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y))).toBeGreaterThan(1);
        }));
      }
    }
  });
  it("shoots: miss, hit, sunk, again", () => {
    const fleet = [[pt(1, 1), pt(2, 1)], [pt(5, 5), pt(5, 6)]];
    expect(shoot(fleet, [], pt(0, 0), "first")).toBe("miss");
    expect(shoot(fleet, [], pt(1, 1), "first")).toBe("hit");
    expect(shoot(fleet, [pt(1, 1)], pt(2, 1), "first")).toBe("sunk");
    expect(shoot(fleet, [pt(1, 1)], pt(1, 1), "first")).toBe("again");
    expect(shoot(fleet, [], pt(-1, 1), "first")).toBe("outside");
    expect(allSunk(fleet, [pt(1, 1), pt(2, 1), pt(5, 5)])).toBe(false);
    expect(allSunk(fleet, [pt(1, 1), pt(2, 1), pt(5, 5), pt(5, 6)])).toBe(true);
  });
  it("every quiz question has exactly one right answer", () => {
    const r = seededRandom(5);
    for (const range of ["first", "all"] as Range[]) {
      for (let i = 0; i < 400; i++) {
        const q = makeCoordQuestion(range, r);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(q.choices.length).toBeGreaterThanOrEqual(3);
        const right = q.choices[q.answer]!;
        switch (q.kind) {
          case "read":
            expect(same(parsePointChoice(right), q.point)).toBe(true);
            break;
          case "find":
            expect(same(q.marked[q.answer]!, q.point)).toBe(true);
            expect(q.marked.filter((p) => same(p, q.point))).toHaveLength(1);
            break;
          case "quadrant":
            expect(Number(right)).toBe(quadrant(q.point));
            break;
          case "shape":
            expect(classify(q.points)).toBe(right);
            break;
          case "fourth":
            expect(same(parsePointChoice(right), q.d)).toBe(true);
            expect(classify([q.a, q.b, q.c, q.d])).toMatch(/square|rectangle/);
            break;
        }
        for (const c of q.kind === "read" || q.kind === "fourth" ? q.choices : []) expect(inRange(parsePointChoice(c), range)).toBe(true);
        if (range === "first") expect(q.kind).not.toBe("quadrant");
      }
    }
  });
  it("a round has 10 questions, at most 3 of a kind", () => {
    const round = makeCoordRound("all", seededRandom(1));
    expect(round).toHaveLength(10);
    const counts = new Map<string, number>();
    for (const q of round) counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(3);
    expect(BOUNDS.first.min).toBe(0);
  });
});
