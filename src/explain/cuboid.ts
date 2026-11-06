import { surface, volume, volumeFactor, type CuboidQuestion, type VolumeUnit } from "../lib/cuboid";
import type { Lang } from "./lang";

const n = (x: number, lang: Lang) => x.toLocaleString(lang === "de" ? "de-DE" : "en-GB");

/** Layers first, then V = a · b · c. */
export function volumeSteps(a: number, b: number, c: number, lang: Lang, unit = "cm"): string[] {
  const de = lang === "de";
  return [
    de ? `Eine Schicht hat ${a} · ${b} = ${a * b} Würfel.` : `One layer has ${a} · ${b} = ${a * b} cubes.`,
    de ? `Es sind ${c} Schicht${c === 1 ? "" : "en"}: ${a * b} · ${c} = ${volume(a, b, c)} Würfel.` : `There ${c === 1 ? "is" : "are"} ${c} layer${c === 1 ? "" : "s"}: ${a * b} · ${c} = ${volume(a, b, c)} cubes.`,
    `V = a · b · c = ${a} ${unit} · ${b} ${unit} · ${c} ${unit} = ${n(volume(a, b, c), lang)} ${unit}³`,
  ];
}

/** The six faces in three pairs. */
export function surfaceSteps(a: number, b: number, c: number, lang: Lang, unit = "cm"): string[] {
  const de = lang === "de";
  return [
    de ? `Ein Quader hat 6 Flächen, immer 2 gleiche: oben und unten ${a} · ${b} = ${a * b}, vorne und hinten ${a} · ${c} = ${a * c}, links und rechts ${b} · ${c} = ${b * c}.`
      : `A cuboid has 6 faces in equal pairs: top and bottom ${a} · ${b} = ${a * b}, front and back ${a} · ${c} = ${a * c}, left and right ${b} · ${c} = ${b * c}.`,
    `O = 2 · (a·b + a·c + b·c) = 2 · (${a * b} + ${a * c} + ${b * c}) = 2 · ${a * b + a * c + b * c} = ${n(surface(a, b, c), lang)} ${unit}²`,
    de ? "Nicht das 2 · vergessen: Jede Fläche gibt es zweimal!" : "Don't forget the 2 ·: every face is there twice!",
  ];
}

export function convertSteps(amount: number, from: VolumeUnit, to: VolumeUnit, lang: Lang): string[] {
  const de = lang === "de";
  const f = volumeFactor(from) / volumeFactor(to);
  const result = amount * f;
  const lines: string[] = [];
  if (f === 1) {
    lines.push(de ? "1 dm³ = 1 l und 1 cm³ = 1 ml: Es ist dieselbe Menge, nur ein anderer Name." : "1 dm³ = 1 l and 1 cm³ = 1 ml: the same amount, just another name.");
  } else {
    lines.push(de ? "Von einer Volumeneinheit zur nächsten ist es 1 000, weil 10 · 10 · 10 kleine Würfel in einen großen passen. Bei l und ml auch." : "From one volume unit to the next is 1 000, because 10 · 10 · 10 small cubes fit in a big one. The same for l and ml.");
  }
  lines.push(f >= 1 ? `${n(amount, lang)} ${from} = ${n(amount, lang)} · ${n(f, lang)} ${to} = ${n(result, lang)} ${to}` : `${n(amount, lang)} ${from} = ${n(amount, lang)} : ${n(1 / f, lang)} ${to} = ${n(result, lang)} ${to}`);
  return lines;
}

export function quizPrompt(q: CuboidQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "count": return de ? "Aus wie vielen kleinen Würfeln besteht der Quader?" : "How many small cubes make up the cuboid?";
    case "volume": return de ? `Ein Quader ist ${q.a} cm lang, ${q.b} cm breit und ${q.c} cm hoch. Wie groß ist das Volumen?` : `A cuboid is ${q.a} cm long, ${q.b} cm wide and ${q.c} cm high. What is its volume?`;
    case "surface": return de ? `Ein Quader ist ${q.a} cm lang, ${q.b} cm breit und ${q.c} cm hoch. Wie groß ist die Oberfläche?` : `A cuboid is ${q.a} cm long, ${q.b} cm wide and ${q.c} cm high. What is its surface area?`;
    case "convert": return `${n(q.amount, lang)} ${q.from} = ? ${q.to}`;
    case "net": return de ? "Welches Netz lässt sich zu einem Würfel falten?" : "Which net folds into a cube?";
    case "opposite": return de ? "Falte das Netz in Gedanken zum Würfel. Welches Feld liegt dem Feld mit dem ● gegenüber?" : "Fold the net into a cube in your head. Which square ends up opposite the one with the ●?";
  }
}

export function choiceText(q: CuboidQuestion, value: number, lang: Lang): string {
  switch (q.kind) {
    case "count": return n(value, lang);
    case "volume": return `${n(value, lang)} cm³`;
    case "surface": return `${n(value, lang)} cm²`;
    case "convert": return `${n(value, lang)} ${q.to}`;
    case "net": return "";
    case "opposite": return "ABCDE"[value]!;
  }
}

export function quizSteps(q: CuboidQuestion, lang: Lang): string[] {
  const de = lang === "de";
  switch (q.kind) {
    case "count": return volumeSteps(q.a, q.b, q.c, lang).slice(0, 2);
    case "volume": return volumeSteps(q.a, q.b, q.c, lang);
    case "surface": return surfaceSteps(q.a, q.b, q.c, lang);
    case "convert": return convertSteps(q.amount, q.from, q.to, lang);
    case "net":
      return [
        de ? "Ein Würfelnetz hat 6 Felder, und beim Falten darf sich keine Fläche doppeln." : "A cube net has 6 squares, and when it's folded no face may be covered twice.",
        de ? "Typische Fehler: 4 Felder nebeneinander mit beiden Deckeln auf derselben Seite, oder ein 2 · 3-Block." : "Typical mistakes: 4 in a row with both lids on the same side, or a 2 · 3 block.",
      ];
    case "opposite":
      return [
        de ? "Gegenüberliegende Felder berühren sich im Netz nie." : "Opposite squares never touch in the net.",
        de ? "In einer Reihe von drei Feldern liegen das erste und das dritte einander gegenüber." : "In a row of three squares, the first and third end up opposite each other.",
      ];
  }
}
