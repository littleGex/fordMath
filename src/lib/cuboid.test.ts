import { cellKey, shapeOf } from "./area";
import {
  canonical, cubeNets, fold, hexominoes, isCubeNet, makeCuboidQuestion, makeCuboidRound, nonNets, oppositeSquare, surface, volume, volumeFactor,
} from "./cuboid";
import { seededRandom } from "./random";

const CROSS = shapeOf([[0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [3, 1]]); // the classic cross net

describe("cuboids", () => {
  it("volume and surface", () => {
    expect(volume(4, 3, 2)).toBe(24);
    expect(surface(4, 3, 2)).toBe(52);
    expect(surface(1, 1, 1)).toBe(6);
  });
  it("volume units: 1 000 between neighbours, litres are dm³", () => {
    expect(volumeFactor("dm³") / volumeFactor("cm³")).toBe(1000);
    expect(volumeFactor("l")).toBe(volumeFactor("dm³"));
    expect(volumeFactor("ml")).toBe(volumeFactor("cm³"));
  });
});

describe("folding nets", () => {
  it("the cross is a net, and its opposite squares are right", () => {
    expect(isCubeNet(CROSS)).toBe(true);
    // In the cross, the top square is opposite the middle of the long arm's end… check two pairs.
    expect(oppositeSquare(CROSS, cellKey(1, 0))).toBe(cellKey(1, 2)); // left arm ↔ right arm
    expect(oppositeSquare(CROSS, cellKey(0, 1))).toBe(cellKey(2, 1)); // top ↔ the one below the centre
    expect(oppositeSquare(CROSS, cellKey(1, 1))).toBe(cellKey(3, 1)); // centre ↔ bottom
  });
  it("a row of six isn't a net, nor is a 2 × 3 block", () => {
    expect(isCubeNet(shapeOf([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]]))).toBe(false);
    expect(isCubeNet(shapeOf([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]))).toBe(false);
  });
  it("there are 35 hexominoes, and exactly 11 of them are cube nets", () => {
    expect(hexominoes()).toHaveLength(35);
    expect(cubeNets()).toHaveLength(11);
    expect(nonNets()).toHaveLength(24);
  });
  it("every net gives each face once, and opposite squares are never neighbours", () => {
    for (const net of cubeNets()) {
      const faces = fold(net)!;
      expect(new Set(faces.values()).size).toBe(6);
      for (const k of net) {
        const opp = oppositeSquare(net, k)!;
        expect(oppositeSquare(net, opp)).toBe(k);
        const [r, c] = k.split(",").map(Number);
        const [or, oc] = opp.split(",").map(Number);
        expect(Math.abs(r! - or!) + Math.abs(c! - oc!)).toBeGreaterThan(1);
      }
    }
  });
  it("turning or flipping a net doesn't change its name", () => {
    const turned = shapeOf([...CROSS].map((k) => k.split(",").map(Number)).map(([r, c]) => [c!, -r!]));
    expect(canonical(turned)).toBe(canonical(CROSS));
  });
});

describe("the quiz", () => {
  it("every question has exactly one right answer", () => {
    const r = seededRandom(26);
    for (let i = 0; i < 400; i++) {
      const q = makeCuboidQuestion(r);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      switch (q.kind) {
        case "count":
        case "volume": expect(q.choices[q.answer]).toBe(volume(q.a, q.b, q.c)); break;
        case "surface": expect(q.choices[q.answer]).toBe(surface(q.a, q.b, q.c)); break;
        case "convert": expect(q.choices[q.answer]).toBe((q.amount * volumeFactor(q.from)) / volumeFactor(q.to)); break;
        case "net": for (const s of q.shapes) expect(s.size).toBe(6); expect(q.shapes.filter(isCubeNet)).toHaveLength(1); expect(isCubeNet(q.shapes[q.answer]!)).toBe(true); break;
        case "opposite": expect(isCubeNet(q.net)).toBe(true); expect(q.options[q.answer]).toBe(oppositeSquare(q.net, q.marked)); break;
      }
    }
  });
  it("a round mixes the kinds", () => {
    expect(new Set(makeCuboidRound(seededRandom(4)).map((q) => q.kind)).size).toBeGreaterThanOrEqual(5);
  });
});
