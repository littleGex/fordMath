import { cellKey, shapeOf } from "../lib/area";
import { seededRandom } from "../lib/random";
import { PICTURES, makeAxesQuestion, makeMirrorTask, type MirrorTask, type PictureName } from "../lib/symmetry";
import { axesPrompt, axesSteps, mirrorSteps } from "./symmetry";

const TASK: MirrorTask = {
  axis: { kind: "vertical", at: 5 },
  given: shapeOf([[2, 2], [2, 3], [2, 4]]),
  answer: shapeOf([[2, 5], [2, 6], [2, 7]]),
  size: 10,
};

describe("mirrorSteps", () => {
  it("praises a right answer", () => {
    expect(mirrorSteps(TASK, TASK.answer, "de")[0]).toContain("Richtig gespiegelt");
  });
  it("counts the gap to the line for a missing square", () => {
    const drawn = new Set([cellKey(2, 5), cellKey(2, 6)]); // 2,7 missing: its partner 2,2 has 2 squares to the line
    expect(mirrorSteps(TASK, drawn, "de")).toEqual([
      "Es fehlt noch 1 Kästchen (gestrichelt).",
      "Zähle: Zwischen einem Kästchen und der Achse liegen 2 Kästchen. Dann liegen auch auf der anderen Seite 2 Kästchen dazwischen.",
      "Tipp: Leg einen kleinen Spiegel auf die Achse und schau hinein.",
    ]);
  });
  it("names wrong squares", () => {
    const drawn = new Set([...TASK.answer, cellKey(5, 5)]);
    expect(mirrorSteps(TASK, drawn, "en")[0]).toBe("1 square is wrong (red).");
  });
  it("reads well for every kind of task", () => {
    const r = seededRandom(5);
    for (let i = 0; i < 200; i++) {
      const t = makeMirrorTask("sek1", r);
      for (const lang of ["de", "en"] as const) {
        const text = mirrorSteps(t, new Set([[...t.answer][0]!]), lang).join(" ");
        expect(text).not.toMatch(/undefined|NaN/);
      }
    }
  });
});

describe("axes", () => {
  it("names the kinds of axes", () => {
    expect(axesSteps(makeAxesQuestion("H"), "de")[0]).toBe("Das H hat 2 Symmetrieachsen: 1 senkrechte und 1 waagerechte.");
    expect(axesSteps(makeAxesQuestion("S"), "en")[0]).toContain("no line of symmetry");
    expect(axesPrompt(makeAxesQuestion("heart"), "de")).toBe("Wie viele Symmetrieachsen hat das Herz?");
  });
  it("every picture reads well", () => {
    for (const name of Object.keys(PICTURES) as PictureName[]) {
      for (const lang of ["de", "en"] as const) expect(axesSteps(makeAxesQuestion(name), lang).join(" ")).not.toMatch(/undefined/);
    }
  });
});
