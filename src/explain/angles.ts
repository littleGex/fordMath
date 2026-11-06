import { angleKind, otherScale, restToFull, type AngleKind, type AngleTask } from "../lib/angles";
import type { Lang } from "./lang";

export const KIND_NAMES: Record<Lang, Record<AngleKind, string>> = {
  de: { spitz: "spitzer Winkel", recht: "rechter Winkel", stumpf: "stumpfer Winkel", gestreckt: "gestreckter Winkel", ueberstumpf: "überstumpfer Winkel", voll: "Vollwinkel" },
  en: { spitz: "acute", recht: "right angle", stumpf: "obtuse", gestreckt: "straight angle", ueberstumpf: "reflex", voll: "full turn" },
};

const RANGES: Record<Lang, Record<AngleKind, string>> = {
  de: { spitz: "kleiner als 90°", recht: "genau 90°", stumpf: "zwischen 90° und 180°", gestreckt: "genau 180°", ueberstumpf: "zwischen 180° und 360°", voll: "genau 360°" },
  en: { spitz: "less than 90°", recht: "exactly 90°", stumpf: "between 90° and 180°", gestreckt: "exactly 180°", ueberstumpf: "between 180° and 360°", voll: "exactly 360°" },
};

export function prompt(t: AngleTask, lang: Lang): string {
  const de = lang === "de";
  switch (t.kind) {
    case "kind": return de ? "Was für ein Winkel ist das?" : "What kind of angle is this?";
    case "estimate": return de ? "Schätze: Wie groß ist der Winkel ungefähr?" : "Estimate: about how big is the angle?";
    case "measure": return de ? "Miss den Winkel mit dem Geodreieck. Wie groß ist er?" : "Measure the angle with the protractor. How big is it?";
    case "draw": return de ? `Zieh am gelben Punkt, bis der Winkel ${t.size}° groß ist.` : `Drag the yellow dot until the angle is ${t.size}°.`;
  }
}

export function kindSteps(size: number, lang: Lang): string[] {
  const kind = angleKind(size);
  const de = lang === "de";
  const lines = [de ? `Der Winkel ist ${size}° groß, also ${RANGES.de[kind]}: ein ${KIND_NAMES.de[kind]}.` : `The angle is ${size}°, which is ${RANGES.en[kind]}: ${kind === "recht" || kind === "gestreckt" || kind === "voll" ? "a " : "an "}${KIND_NAMES.en[kind]}${kind === "spitz" || kind === "stumpf" || kind === "ueberstumpf" ? " angle" : ""}.`];
  if (kind === "spitz" || kind === "stumpf") {
    lines.push(de ? "Vergleich mit der Ecke eines Blatts Papier (90°): Ist der Winkel kleiner, ist er spitz; ist er größer, ist er stumpf." : "Compare with the corner of a sheet of paper (90°): smaller is acute, bigger is obtuse.");
  }
  if (kind === "ueberstumpf") {
    lines.push(de ? `Er ist größer als eine gerade Linie (180°). Der Rest bis zur vollen Drehung ist ${restToFull(size)}°.` : `It's more than a straight line (180°). The rest of the full turn is ${restToFull(size)}°.`);
  }
  return lines;
}

export function estimateSteps(size: number, lang: Lang): string[] {
  const de = lang === "de";
  const near = [0, 45, 90, 135, 180].reduce((a, b) => (Math.abs(b - size) < Math.abs(a - size) ? b : a));
  return [
    de ? "Merkhilfen: Eine Blattecke ist 90°, eine halbe Blattecke 45°, eine gerade Linie 180°." : "Landmarks: a paper corner is 90°, half of it 45°, a straight line 180°.",
    de ? `Dieser Winkel ist ${size}°, also ${near === size ? "genau" : "nahe bei"} ${near}°.` : `This angle is ${size}°, so ${near === size ? "exactly" : "close to"} ${near}°.`,
  ];
}

export function measureSteps(size: number, lang: Lang): string[] {
  const de = lang === "de";
  return [
    de ? "Leg den Nullpunkt des Geodreiecks (die Mitte der langen Kante) genau auf den Scheitelpunkt S." : "Put the protractor's zero point (the middle of the long edge) exactly on the vertex S.",
    de ? "Dreh es, bis die lange Kante genau auf einem Schenkel liegt." : "Turn it until the long edge lies exactly along one arm.",
    de ? "Lies an der Skala ab, die bei diesem Schenkel mit 0 anfängt, und folge ihr bis zum anderen Schenkel." : "Read the scale that starts at 0 on that arm, and follow it round to the other arm.",
    de ? `Hier: ${size}°. Auf der anderen Skala stünde ${otherScale(size)}°: Ein ${size < 90 ? "spitzer" : "stumpfer"} Winkel kann nicht ${otherScale(size)}° haben!`
      : `Here: ${size}°. The other scale would show ${otherScale(size)}°, but an ${size < 90 ? "acute" : "obtuse"} angle can't be ${otherScale(size)}°!`,
  ];
}

export function drawSteps(target: number, drawn: number, lang: Lang): string[] {
  const de = lang === "de";
  const diff = drawn - target;
  return [
    de ? `Gezeichnet: ${drawn}°, gewünscht: ${target}°${diff === 0 ? "." : `, also ${Math.abs(diff)}° zu ${diff > 0 ? "groß" : "klein"}.`}` : `You drew ${drawn}°; the goal was ${target}°${diff === 0 ? "." : `, so ${Math.abs(diff)}° too ${diff > 0 ? "big" : "small"}.`}`,
    de ? `So geht es auf Papier: Geodreieck mit dem Nullpunkt auf S und der langen Kante auf den ersten Schenkel legen, bei ${target}° einen Punkt machen und ihn mit S verbinden.`
      : `On paper: put the zero point on S and the long edge along the first arm, make a dot at ${target}°, and join it to S.`,
  ];
}
