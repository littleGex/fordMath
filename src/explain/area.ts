import {
  area, asRectangle, factorOf, isConnected, perimeter, perimeterRange, rectanglesWithArea, rightAnswer,
  type AreaQuestion, type AreaUnit, type Shape,
} from "../lib/area";
import type { Lang } from "./lang";

const big = (n: number, lang: Lang) => n.toLocaleString(lang === "de" ? "de-DE" : "en-GB");

/** Counting first, then the formula when the shape is a rectangle; with the shape's own numbers. */
export function explainShape(shape: Shape, lang: Lang): string[] {
  const de = lang === "de";
  const A = area(shape);
  const U = perimeter(shape);
  if (A === 0) return [];
  const lines = [
    de ? `Zähle die Kästchen: ${A}. Jedes Kästchen ist 1 cm², also ist A = ${A} cm².`
      : `Count the squares: ${A}. Each square is 1 cm², so A = ${A} cm².`,
    de ? `Zähle die Kanten am Rand: ${U}. Jede Kante ist 1 cm lang, also ist U = ${U} cm.`
      : `Count the sides along the edge: ${U}. Each side is 1 cm long, so P = ${U} cm.`,
  ];
  const r = asRectangle(shape);
  if (r && A > 1) {
    lines.push(
      de ? `Es ist ein Rechteck mit a = ${r.a} cm und b = ${r.b} cm. Mit den Formeln geht es schneller:`
        : `It's a rectangle with a = ${r.a} cm and b = ${r.b} cm. The formulas are quicker:`,
      `A = a · b = ${r.a} cm · ${r.b} cm = ${A} cm²`,
      `${de ? "U" : "P"} = 2 · a + 2 · b = 2 · ${r.a} cm + 2 · ${r.b} cm = ${2 * r.a} cm + ${2 * r.b} cm = ${U} cm`,
    );
  }
  if (!isConnected(shape)) {
    lines.push(de ? "Die Kästchen hängen nicht alle zusammen: Es sind mehrere Figuren." : "Not all the squares are joined: it's more than one shape.");
  }
  return lines;
}

/** "With 12 squares the perimeter is at least 14 cm and at most 26 cm." */
export function explainRange(shape: Shape, lang: Lang): string[] {
  const de = lang === "de";
  const n = area(shape);
  if (n < 2 || !isConnected(shape)) return [];
  const { min, max } = perimeterRange(n);
  const rects = rectanglesWithArea(n).map((r) => `${r.a} × ${r.b}: ${r.perimeter} cm`).join(", ");
  const U = perimeter(shape);
  return [
    de ? `Mit ${n} Kästchen, die zusammenhängen, ist der Umfang mindestens ${min} cm (möglichst quadratisch) und höchstens ${max} cm (eine lange Schlange).`
      : `With ${n} joined squares, the perimeter is at least ${min} cm (as square as possible) and at most ${max} cm (one long snake).`,
    de ? `Rechtecke mit ${n} Kästchen: ${rects}.` : `Rectangles with ${n} squares: ${rects}.`,
    U === min ? (de ? `Deine Figur hat den kleinsten Umfang: ${U} cm. 🎉` : `Your shape has the smallest perimeter: ${U} cm. 🎉`)
      : U === max ? (de ? `Deine Figur hat den größten Umfang: ${U} cm. 🎉` : `Your shape has the largest perimeter: ${U} cm. 🎉`)
        : de ? `Deine Figur: ${U} cm. Gleicher Flächeninhalt, anderer Umfang!` : `Your shape: ${U} cm. Same area, different perimeter!`,
  ];
}

/** An amount in mm², written in one unit with a decimal comma if needed: 250 mm² in cm² → "2,5". */
export function inUnit(mm2: number, unit: AreaUnit, lang: Lang): string {
  const f = factorOf(unit);
  const whole = Math.trunc(mm2 / f);
  const rest = mm2 % f;
  if (rest === 0) return big(whole, lang);
  const digits = String(f).length - 1;
  const frac = String(rest).padStart(digits, "0").replace(/0+$/, "");
  return `${big(whole, lang)}${lang === "de" ? "," : "."}${frac}`;
}

const answerUnit = (q: AreaQuestion, lang: Lang): string => {
  switch (q.kind) {
    case "countArea": return lang === "de" ? "Kästchen" : "squares";
    case "countPerimeter": return lang === "de" ? "Kanten" : "sides";
    case "rectArea": return "cm²";
    case "rectPerimeter":
    case "missingSide": return "cm";
    case "convert": return q.to;
  }
};

export const choiceText = (q: AreaQuestion, value: number, lang: Lang): string => `${big(value, lang)} ${answerUnit(q, lang)}`;

export function quizPrompt(q: AreaQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "countArea": return de ? "Wie viele Kästchen hat die Figur?" : "How many squares does the shape have?";
    case "countPerimeter": return de ? "Wie viele Kanten hat die Figur am Rand?" : "How many sides are there along the edge?";
    case "rectArea": return de ? `Ein Rechteck ist ${q.a} cm lang und ${q.b} cm breit. Wie groß ist der Flächeninhalt?` : `A rectangle is ${q.a} cm long and ${q.b} cm wide. What is its area?`;
    case "rectPerimeter": return de ? `Ein Rechteck ist ${q.a} cm lang und ${q.b} cm breit. Wie groß ist der Umfang?` : `A rectangle is ${q.a} cm long and ${q.b} cm wide. What is its perimeter?`;
    case "missingSide": return de ? `Ein Rechteck hat den Flächeninhalt ${q.a * q.b} cm² und ist ${q.a} cm lang. Wie breit ist es?` : `A rectangle has an area of ${q.a * q.b} cm² and is ${q.a} cm long. How wide is it?`;
    case "convert": return `${big(q.amount, lang)} ${q.from} = ? ${q.to}`;
  }
}

export function quizSteps(q: AreaQuestion, lang: Lang): string[] {
  const de = lang === "de";
  const right = rightAnswer(q);
  switch (q.kind) {
    case "countArea":
    case "countPerimeter": {
      const [A, U] = [area(q.shape), perimeter(q.shape)];
      return q.kind === "countArea"
        ? [de ? `Zähle die Kästchen innen: ${A}.` : `Count the squares inside: ${A}.`, de ? `Nicht verwechseln: Die ${U} Kanten am Rand sind der Umfang.` : `Don't mix them up: the ${U} sides round the edge are the perimeter.`]
        : [de ? `Fahre mit dem Finger am Rand entlang und zähle jede Kästchenkante: ${U}.` : `Run your finger round the edge and count each side: ${U}.`, de ? `Die ${A} Kästchen innen sind der Flächeninhalt.` : `The ${A} squares inside are the area.`];
    }
    case "rectArea":
      return [`A = a · b = ${q.a} cm · ${q.b} cm = ${right} cm²`, de ? `Das sind ${q.b} Reihen mit je ${q.a} Kästchen.` : `That's ${q.b} rows of ${q.a} squares.`];
    case "rectPerimeter":
      return [`U = 2 · a + 2 · b = 2 · ${q.a} cm + 2 · ${q.b} cm = ${2 * q.a} cm + ${2 * q.b} cm = ${right} cm`, de ? "Zwei lange und zwei kurze Seiten." : "Two long sides and two short ones."];
    case "missingSide":
      return [
        de ? `A = a · b, also ${q.a * q.b} = ${q.a} · ?` : `A = a · b, so ${q.a * q.b} = ${q.a} · ?`,
        de ? `Teile: b = ${q.a * q.b} : ${q.a} = ${right} cm` : `Divide: b = ${q.a * q.b} : ${q.a} = ${right} cm`,
      ];
    case "convert": {
      const up = factorOf(q.from) > factorOf(q.to);
      const pair = up ? `1 ${q.from} = 100 ${q.to}` : `100 ${q.from} = 1 ${q.to}`;
      return [
        de ? `${pair}: Ein Quadrat mit 1 cm Seite passt 10 · 10 = 100-mal in eins mit 1 dm Seite; das gilt bei allen Flächeneinheiten.`
          : `${pair}: a square with 1 cm sides fits 10 · 10 = 100 times into one with 1 dm sides; the same goes for every area unit.`,
        up ? `${big(q.amount, lang)} ${q.from} = ${big(q.amount, lang)} · 100 ${q.to} = ${big(right, lang)} ${q.to}`
          : `${big(q.amount, lang)} ${q.from} = ${big(q.amount, lang)} : 100 ${q.to} = ${big(right, lang)} ${q.to}`,
      ];
    }
  }
}
