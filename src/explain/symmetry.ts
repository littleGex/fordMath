import { parseCell } from "../lib/area";
import { axesOf, checkMirror, distanceToAxis, mirrorCell, type AxesQuestion, type Axis, type MirrorTask, type PictureName } from "../lib/symmetry";
import type { CellKey } from "../lib/area";
import type { Lang } from "./lang";

export function axisName(axis: Axis, lang: Lang): string {
  const de = lang === "de";
  switch (axis.kind) {
    case "vertical": return de ? "senkrechte" : "vertical";
    case "horizontal": return de ? "waagerechte" : "horizontal";
    case "diagonal":
    case "antidiagonal": return de ? "schräge" : "diagonal";
  }
}

/** After "Prüfen": what's right, what's missing, and how to find one missing square by counting. */
export function mirrorSteps(task: MirrorTask, drawn: ReadonlySet<CellKey>, lang: Lang): string[] {
  const de = lang === "de";
  const r = checkMirror(task, drawn);
  if (r.ok) {
    return [de ? "Richtig gespiegelt! Jedes Kästchen ist genauso weit von der Achse weg wie sein Spiegelbild." : "Mirrored correctly! Every square is as far from the line as its mirror image."];
  }
  const lines: string[] = [];
  const [m, w] = [r.missing.length, r.wrong.length];
  if (m) lines.push(de ? `Es ${m === 1 ? "fehlt" : "fehlen"} noch ${m} Kästchen (gestrichelt).` : `${m} square${m === 1 ? " is" : "s are"} still missing (dashed).`);
  if (w) lines.push(de ? `${w} Kästchen ${w === 1 ? "ist" : "sind"} falsch (rot).` : `${w} square${w === 1 ? " is" : "s are"} wrong (red).`);
  const example = r.missing[0] ?? r.wrong[0]!;
  const [row, col] = parseCell(example);
  const [sr, sc] = mirrorCell(row, col, task.axis);
  const gap = distanceToAxis(sr, sc, task.axis);
  if (task.axis.kind === "vertical" || task.axis.kind === "horizontal") {
    lines.push(
      gap === 0
        ? de ? "Ein Kästchen direkt an der Achse hat sein Spiegelbild direkt auf der anderen Seite der Achse." : "A square right next to the line has its mirror image right next to it on the other side."
        : de ? `Zähle: Zwischen einem Kästchen und der Achse liegen ${gap} Kästchen. Dann liegen auch auf der anderen Seite ${gap} Kästchen dazwischen.`
          : `Count: if there are ${gap} squares between a square and the line, there are ${gap} squares between the line and its mirror image too.`,
    );
  } else {
    lines.push(de
      ? `Bei einer schrägen Achse zählst du schräg über die Ecken: ${gap} Schritte bis zur Achse, dann ${gap} Schritte weiter. Oder: Zeile und Spalte tauschen die Rollen.`
      : `With a diagonal line, count diagonally from corner to corner: ${gap} steps to the line, then ${gap} steps beyond. Or: rows and columns swap roles.`);
  }
  lines.push(de ? "Tipp: Leg einen kleinen Spiegel auf die Achse und schau hinein." : "Tip: put a small mirror on the line and look into it.");
  return lines;
}

export const PICTURE_NAMES: Record<Lang, Record<PictureName, string>> = {
  de: {
    H: "das H", T: "das T", A: "das A", E: "das E", L: "das L", F: "das F", N: "das N", S: "das S", X: "das X", O: "das O",
    plus: "das Plus", heart: "das Herz", arrow: "der Pfeil", stairs: "die Treppe", pinwheel: "das Windrad", square: "das Quadrat",
    bar: "das Rechteck", flag: "der Wimpel", diamond: "die Raute",
  },
  en: {
    H: "the H", T: "the T", A: "the A", E: "the E", L: "the L", F: "the F", N: "the N", S: "the S", X: "the X", O: "the O",
    plus: "the plus", heart: "the heart", arrow: "the arrow", stairs: "the stairs", pinwheel: "the pinwheel", square: "the square",
    bar: "the rectangle", flag: "the pennant", diamond: "the diamond",
  },
};

export function axesPrompt(q: AxesQuestion, lang: Lang): string {
  return lang === "de" ? `Wie viele Symmetrieachsen hat ${PICTURE_NAMES.de[q.name]}?` : `How many lines of symmetry does ${PICTURE_NAMES.en[q.name]} have?`;
}

export function axesSteps(q: AxesQuestion, lang: Lang): string[] {
  const de = lang === "de";
  const axes = axesOf(q.shape);
  const name = PICTURE_NAMES[lang][q.name];
  if (axes.length === 0) {
    return [de ? `${name[0]!.toUpperCase()}${name.slice(1)} hat keine Symmetrieachse: Wie man es auch faltet, die Hälften passen nicht aufeinander.`
      : `${name[0]!.toUpperCase()}${name.slice(1)} has no line of symmetry: however you fold it, the halves don't match.`];
  }
  const kinds = axes.map((a) => axisName(a, lang));
  const counted = [...new Set(kinds)].map((k) => `${kinds.filter((x) => x === k).length} ${k}`).join(de ? " und " : " and ");
  return [
    de ? `${name[0]!.toUpperCase()}${name.slice(1)} hat ${axes.length} Symmetrieachse${axes.length > 1 ? "n" : ""}: ${counted}.`
      : `${name[0]!.toUpperCase()}${name.slice(1)} has ${axes.length} line${axes.length > 1 ? "s" : ""} of symmetry: ${counted}.`,
    de ? "Faltet man die Figur an einer Achse, liegen beide Hälften genau aufeinander." : "Fold the shape along a line and both halves lie exactly on top of each other.",
  ];
}
