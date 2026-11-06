import { makeAngleRound } from "../lib/angles";
import { seededRandom } from "../lib/random";
import { drawSteps, estimateSteps, kindSteps, measureSteps, prompt } from "./angles";

describe("angle explanations", () => {
  it("kinds", () => {
    expect(kindSteps(40, "de")[0]).toBe("Der Winkel ist 40° groß, also kleiner als 90°: ein spitzer Winkel.");
    expect(kindSteps(250, "de")[1]).toBe("Er ist größer als eine gerade Linie (180°). Der Rest bis zur vollen Drehung ist 110°.");
    expect(kindSteps(120, "en")[0]).toBe("The angle is 120°, which is between 90° and 180°: an obtuse angle.");
    expect(kindSteps(90, "en")[0]).toBe("The angle is 90°, which is exactly 90°: a right angle.");
  });
  it("measuring warns about the other scale", () => {
    expect(measureSteps(40, "de").at(-1)).toBe("Hier: 40°. Auf der anderen Skala stünde 140°: Ein spitzer Winkel kann nicht 140° haben!");
  });
  it("estimating names the nearest landmark", () => {
    expect(estimateSteps(50, "de")[1]).toBe("Dieser Winkel ist 50°, also nahe bei 45°.");
  });
  it("drawing says how far off", () => {
    expect(drawSteps(60, 64, "de")[0]).toBe("Gezeichnet: 64°, gewünscht: 60°, also 4° zu groß.");
  });
  it("every task has a prompt in both languages", () => {
    for (const t of makeAngleRound(seededRandom(1))) for (const lang of ["de", "en"] as const) expect(prompt(t, lang)).not.toMatch(/undefined/);
  });
});
