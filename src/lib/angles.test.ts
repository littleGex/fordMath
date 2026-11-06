import {
  ANGLE_KINDS, angleKind, closeEnough, directionGap, makeAngleRound, makeAngleTask, otherScale, readScales, restToFull, snapPose,
} from "./angles";
import { seededRandom } from "./random";

describe("kinds of angle", () => {
  it.each([
    [1, "spitz"], [89, "spitz"], [90, "recht"], [91, "stumpf"], [179, "stumpf"], [180, "gestreckt"],
    [181, "ueberstumpf"], [359, "ueberstumpf"], [360, "voll"],
  ] as const)("%i° is %s", (deg, kind) => {
    expect(angleKind(deg)).toBe(kind);
  });
  it.each([0, -5, 361, NaN])("rejects %s", (deg) => {
    expect(() => angleKind(deg)).toThrow();
  });
  it("the other scale and the rest to a full turn", () => {
    expect(otherScale(40)).toBe(140);
    expect(restToFull(250)).toBe(110);
  });
});

describe("directions", () => {
  it("the gap between two directions, either way round", () => {
    expect(directionGap(10, 350)).toBe(20);
    expect(directionGap(90, 270)).toBe(180);
    expect(closeEnough(42, 40)).toBe(true);
    expect(closeEnough(43, 40)).toBe(false);
  });
});

describe("the Geodreieck", () => {
  it("snaps onto the vertex and onto an arm, either way round", () => {
    expect(snapPose({ x: 105, y: 198, rot: 3 }, { x: 100, y: 200 }, [0, 70])).toEqual({ x: 100, y: 200, rot: 0 });
    expect(snapPose({ x: 105, y: 198, rot: 247 }, { x: 100, y: 200 }, [0, 70])).toEqual({ x: 100, y: 200, rot: 250 });
    expect(snapPose({ x: 150, y: 200, rot: 30 }, { x: 100, y: 200 }, [0, 70])).toEqual({ x: 150, y: 200, rot: 30 });
  });
  it("laid on the first arm, the outer scale shows the angle and the inner one 180° minus it", () => {
    expect(readScales(30, 30 + 40)).toEqual({ outer: 40, inner: 140 });
  });
  it("laid on the second arm the other way round, the inner scale shows it", () => {
    // Angle from 30° to 70°: lay the 0 of the inner scale (the left end, rot + 180) on the 70° arm.
    expect(readScales(70 - 180, 30)!.inner).toBe(40);
  });
  it("nothing to read behind the long edge", () => {
    expect(readScales(0, 200)).toBeNull();
  });
});

describe("tasks", () => {
  it("kind and estimate questions have exactly one right answer", () => {
    const r = seededRandom(25);
    for (let i = 0; i < 500; i++) {
      const k = makeAngleTask("kind", r);
      if (k.kind === "kind") expect(k.choices[k.answer]).toBe(angleKind(k.size));
      const e = makeAngleTask("estimate", r);
      if (e.kind === "estimate") {
        expect(e.choices[e.answer]).toBe(e.size);
        expect(new Set(e.choices).size).toBe(4);
        for (const c of e.choices) if (c !== e.size) expect(Math.abs(c - e.size)).toBeGreaterThanOrEqual(30);
      }
    }
  });
  it("every kind of angle comes up", () => {
    const r = seededRandom(1);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const k = makeAngleTask("kind", r);
      seen.add(angleKind(k.size));
    }
    expect(seen.size).toBe(ANGLE_KINDS.length);
  });
  it("measure and draw sizes stay between 10° and 170°", () => {
    const r = seededRandom(2);
    for (let i = 0; i < 300; i++) {
      for (const kind of ["measure", "draw"] as const) {
        const t = makeAngleTask(kind, r);
        expect(t.size).toBeGreaterThanOrEqual(10);
        expect(t.size).toBeLessThanOrEqual(170);
      }
    }
  });
  it("a round has two of each", () => {
    const round = makeAngleRound(seededRandom(3));
    expect(round.map((t) => t.kind).sort()).toEqual(["draw", "draw", "estimate", "estimate", "kind", "kind", "measure", "measure"]);
  });
});
