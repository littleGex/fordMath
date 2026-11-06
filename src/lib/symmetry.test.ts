import { area, cellKey, shapeOf } from "./area";
import { seededRandom } from "./random";
import {
  PICTURES, axesOf, checkMirror, distanceToAxis, isSymmetric, makeAxesQuestion, makeAxesRound, makeMirrorTask, mirror, mirrorCell,
  pictureShape, type PictureName,
} from "./symmetry";

describe("mirroring one square", () => {
  it("across a vertical grid line: 2 squares to the left lands 2 to the right", () => {
    expect(mirrorCell(0, 3, { kind: "vertical", at: 5 })).toEqual([0, 6]);
    expect(distanceToAxis(0, 3, { kind: "vertical", at: 5 })).toBe(1);
    expect(distanceToAxis(0, 6, { kind: "vertical", at: 5 })).toBe(1);
  });
  it("across a line through the middle of a column", () => {
    expect(mirrorCell(0, 4, { kind: "vertical", at: 5.5 })).toEqual([0, 6]);
    expect(mirrorCell(0, 5, { kind: "vertical", at: 5.5 })).toEqual([0, 5]); // on the line: stays
  });
  it("across the diagonals", () => {
    expect(mirrorCell(3, 1, { kind: "diagonal", d: 0 })).toEqual([1, 3]);
    expect(mirrorCell(0, 0, { kind: "antidiagonal", s: 10 })).toEqual([9, 9]);
  });
  it("mirroring twice gives the shape back", () => {
    const s = shapeOf([[1, 2], [2, 2], [2, 3]]);
    for (const axis of [{ kind: "vertical", at: 4 }, { kind: "horizontal", at: 3.5 }, { kind: "diagonal", d: 1 }, { kind: "antidiagonal", s: 7 }] as const) {
      expect(mirror(mirror(s, axis), axis)).toEqual(new Set(s));
    }
  });
});

describe("axesOf", () => {
  const expected: Record<PictureName, number> = {
    H: 2, T: 1, A: 1, E: 1, L: 1, F: 0, // this L has equal arms: it mirrors across the diagonal
    N: 0, S: 0, X: 4, O: 4, plus: 4, heart: 1, arrow: 1, stairs: 1, pinwheel: 0,
    square: 4, bar: 2, flag: 1, diamond: 4,
  };
  it.each(Object.keys(PICTURES) as PictureName[])("%s", (name) => {
    expect(axesOf(pictureShape(name))).toHaveLength(expected[name]);
  });
  it("every axis it finds really is one", () => {
    for (const name of Object.keys(PICTURES) as PictureName[]) {
      const s = pictureShape(name);
      for (const a of axesOf(s)) expect(isSymmetric(s, a)).toBe(true);
    }
  });
  it("nothing for an empty shape", () => {
    expect(axesOf(new Set())).toEqual([]);
  });
});

describe("mirror tasks", () => {
  it.each(["grundschule", "sek1"] as const)("%s: the given half plus the answer is symmetric, and everything fits on the grid", (level) => {
    const r = seededRandom(24);
    const kinds = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const t = makeMirrorTask(level, r);
      kinds.add(t.axis.kind);
      const whole = new Set([...t.given, ...t.answer]);
      expect(isSymmetric(whole, t.axis)).toBe(true);
      expect(area(t.answer)).toBeGreaterThanOrEqual(3);
      for (const k of t.answer) expect(t.given.has(k)).toBe(false);
      for (const k of whole) {
        const [row, col] = k.split(",").map(Number);
        expect(row! >= 0 && col! >= 0 && row! < t.size && col! < t.size).toBe(true);
      }
      expect(checkMirror(t, t.answer).ok).toBe(true);
    }
    expect([...kinds].sort()).toEqual(level === "grundschule" ? ["horizontal", "vertical"] : ["antidiagonal", "diagonal", "horizontal", "vertical"]);
  });
  it("checkMirror names missing and wrong squares", () => {
    const t = makeMirrorTask("grundschule", seededRandom(1));
    const [first, ...rest] = [...t.answer];
    const drawn = new Set([...rest, cellKey(-5, -5)]);
    expect(checkMirror(t, drawn)).toEqual({ missing: [first], wrong: [cellKey(-5, -5)], ok: false });
  });
});

describe("axes quiz", () => {
  it("one right choice, and it's the number of axes", () => {
    for (const name of Object.keys(PICTURES) as PictureName[]) {
      const q = makeAxesQuestion(name);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.choices[q.answer]).toBe(axesOf(pictureShape(name)).length);
    }
    expect(new Set(makeAxesRound(seededRandom(3)).map((q) => q.name)).size).toBe(8);
  });
});
