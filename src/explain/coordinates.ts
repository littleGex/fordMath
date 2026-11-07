import { parsePointChoice, quadrant, type CoordQuestion, type Point, type ShapeKind, type ShotResult } from "../lib/coordinates";
import type { Lang } from "./lang";

const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));
/** A(3 | 2) in German, A(3, 2) in English. */
export const pointText = (p: Point, lang: Lang, name = ""): string => `${name}(${minus(p.x)}${lang === "de" ? " | " : ", "}${minus(p.y)})`;

/** How to walk to a point from the origin: along first, then up or down. */
export function walk(p: Point, lang: Lang): string {
  const de = lang === "de";
  const along = p.x === 0
    ? (de ? "bleib bei x = 0 auf der y-Achse" : "stay on the y-axis, x = 0")
    : de ? `geh ${Math.abs(p.x)} nach ${p.x > 0 ? "rechts" : "links"}` : `go ${Math.abs(p.x)} to the ${p.x > 0 ? "right" : "left"}`;
  const up = p.y === 0
    ? (de ? "bleib auf der x-Achse (y = 0)" : "stay on the x-axis (y = 0)")
    : de ? `dann ${Math.abs(p.y)} nach ${p.y > 0 ? "oben" : "unten"}` : `then ${Math.abs(p.y)} ${p.y > 0 ? "up" : "down"}`;
  return de
    ? `${pointText(p, lang)}: Starte im Ursprung (0 | 0), ${along}, ${up}.`
    : `${pointText(p, lang)}: start at the origin (0, 0), ${along}, ${up}.`;
}

export const RULE: Record<Lang, string> = {
  de: "Erst nach rechts oder links (x), dann nach oben oder unten (y). Merksatz: Erst gehen, dann steigen.",
  en: "First along, right or left (x), then up or down (y). Remember: along the corridor, then up the stairs.",
};

export function quadrantName(p: Point, lang: Lang): string {
  const q = quadrant(p);
  if (q === "axis") return lang === "de" ? "auf einer Achse" : "on an axis";
  return lang === "de" ? `${q}. Quadrant` : `quadrant ${["I", "II", "III", "IV"][q - 1]}`;
}

const SHAPE: Record<Lang, Record<ShapeKind, string>> = {
  de: { square: "Quadrat", rectangle: "Rechteck", parallelogram: "Parallelogramm", triangle: "Dreieck", other: "keine besondere Form" },
  en: { square: "square", rectangle: "rectangle", parallelogram: "parallelogram", triangle: "triangle", other: "no special shape" },
};
export const shapeName = (s: ShapeKind, lang: Lang): string => SHAPE[lang][s];

/** Schiffe versenken: what the shot did. */
export function shotText(r: ShotResult, p: Point, lang: Lang): string {
  const at = pointText(p, lang);
  const de = lang === "de";
  switch (r) {
    case "miss": return de ? `${at}: Wasser. 🌊` : `${at}: splash, a miss. 🌊`;
    case "hit": return de ? `${at}: Treffer! 💥` : `${at}: hit! 💥`;
    case "sunk": return de ? `${at}: Treffer, versenkt! 🚢` : `${at}: hit and sunk! 🚢`;
    case "again": return de ? `Auf ${at} hast du schon geschossen.` : `You've already fired at ${at}.`;
    case "outside": return de ? `${at} liegt nicht auf dem Spielfeld.` : `${at} isn't on the board.`;
  }
}

// ---------- quiz ----------

const NAMES = "ABCD";

export function quizPrompt(q: CoordQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "read": return de ? "Welche Koordinaten hat der Punkt P?" : "What are the coordinates of P?";
    case "find": return de ? `Welcher Punkt ist ${pointText(q.point, lang)}?` : `Which point is ${pointText(q.point, lang)}?`;
    case "quadrant": return de ? `In welchem Quadranten liegt ${pointText(q.point, lang, "P")}?` : `Which quadrant is ${pointText(q.point, lang, "P")} in?`;
    case "shape": {
      const list = q.points.map((p, i) => pointText(p, lang, NAMES[i]!)).join(", ");
      return de ? `Verbinde ${list} der Reihe nach. Welche Form entsteht?` : `Join ${list} in order. What shape is it?`;
    }
    case "fourth": {
      const [a, b, c] = [pointText(q.a, lang, "A"), pointText(q.b, lang, "B"), pointText(q.c, lang, "C")];
      return de ? `${a}, ${b} und ${c} sind Ecken eines Rechtecks ABCD. Wo liegt D?` : `${a}, ${b} and ${c} are corners of a rectangle ABCD. Where is D?`;
    }
  }
}

export function quizChoice(q: CoordQuestion, c: string, lang: Lang): string {
  switch (q.kind) {
    case "read": return pointText(parsePointChoice(c), lang, "P");
    case "fourth": return pointText(parsePointChoice(c), lang, "D");
    case "find": return c;
    case "quadrant": return lang === "de" ? `${c}. Quadrant` : `quadrant ${["I", "II", "III", "IV"][Number(c) - 1]}`;
    case "shape": return shapeName(c as ShapeKind, lang);
  }
}

export function quizSteps(q: CoordQuestion, lang: Lang): string[] {
  const de = lang === "de";
  switch (q.kind) {
    case "read":
      return [walk(q.point, lang), de ? "Die erste Zahl ist immer x (nach rechts), die zweite y (nach oben). Vertauscht ist es ein anderer Punkt!" : "The first number is always x (along), the second y (up). Swap them and it's a different point!"];
    case "find":
      return [walk(q.point, lang), de ? `Dort liegt ${NAMES[q.answer]}.` : `That's where ${NAMES[q.answer]} is.`];
    case "quadrant": {
      const sx = q.point.x > 0 ? "+" : "−", sy = q.point.y > 0 ? "+" : "−";
      return [
        de ? `x ist ${q.point.x > 0 ? "positiv (rechts)" : "negativ (links)"}, y ist ${q.point.y > 0 ? "positiv (oben)" : "negativ (unten)"}: Vorzeichen (${sx} | ${sy}).` : `x is ${q.point.x > 0 ? "positive (right)" : "negative (left)"}, y is ${q.point.y > 0 ? "positive (up)" : "negative (down)"}: signs (${sx}, ${sy}).`,
        de ? "Die Quadranten zählt man gegen den Uhrzeigersinn: oben rechts I (+ | +), oben links II (− | +), unten links III (− | −), unten rechts IV (+ | −)." : "Quadrants are counted anticlockwise: top right I (+, +), top left II (−, +), bottom left III (−, −), bottom right IV (+, −).",
        de ? `Also: ${quadrantName(q.point, lang)}.` : `So: ${quadrantName(q.point, lang)}.`,
      ];
    }
    case "shape":
      return shapeSteps(q.points, q.shape, lang);
    case "fourth": {
      const dx = q.c.x - q.b.x, dy = q.a.y - q.b.y;
      return [
        de ? `Von B nach C geht es ${dx} nach rechts. Denselben Weg gehst du von A aus.` : `From B to C is ${dx} to the right. Take the same path from A.`,
        de ? `Von A ${pointText(q.a, lang)} aus ${dx} nach rechts: D${pointText(q.d, lang)}.` : `From A ${pointText(q.a, lang)}, ${dx} to the right: D${pointText(q.d, lang)}.`,
        de ? `Probe: D liegt genauso hoch wie A (y = ${minus(q.a.y)}) und genau über C (x = ${minus(q.c.x)}); die Seite AB ist ${dy} lang, CD auch.` : `Check: D is as high as A (y = ${minus(q.a.y)}) and right above C (x = ${minus(q.c.x)}); side AB is ${dy} long, and so is CD.`,
      ];
    }
  }
}

/** Why the joined points make that shape: side lengths along the grid, and the corners. */
function shapeSteps(points: Point[], shape: ShapeKind, lang: Lang): string[] {
  const de = lang === "de";
  const [a, b, c] = points as [Point, Point, Point];
  const w = Math.abs(b.x - a.x), h = Math.abs(c.y - b.y);
  switch (shape) {
    case "square":
      return [de ? `AB geht ${w} nach rechts, BC ${h} nach oben: Die Seiten stehen senkrecht aufeinander und sind gleich lang.` : `AB goes ${w} to the right, BC ${h} up: the sides are at right angles and the same length.`, de ? "Vier rechte Winkel und vier gleich lange Seiten: ein Quadrat." : "Four right angles and four equal sides: a square."];
    case "rectangle":
      return [de ? `AB geht ${w} nach rechts, BC ${h} nach oben: Die Seiten stehen senkrecht aufeinander, sind aber verschieden lang.` : `AB goes ${w} to the right, BC ${h} up: the sides are at right angles but different lengths.`, de ? "Vier rechte Winkel, gegenüberliegende Seiten gleich lang: ein Rechteck." : "Four right angles, opposite sides equal: a rectangle."];
    case "parallelogram":
      return [de ? `AB und DC gehen beide ${w} nach rechts, AD und BC gehen beide gleich schräg nach oben: gegenüberliegende Seiten sind parallel.` : `AB and DC both go ${w} to the right, AD and BC both slant up the same way: opposite sides are parallel.`, de ? "Parallele Seiten, aber keine rechten Winkel: ein Parallelogramm." : "Parallel sides but no right angles: a parallelogram."];
    case "triangle":
      return [de ? "Drei Punkte, die nicht auf einer Geraden liegen, ergeben ein Dreieck." : "Three points not on one line make a triangle."];
    case "other":
      return [];
  }
}
