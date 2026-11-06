import { answerOf, planOf, type MentalLevel, type MentalQuestion } from "../lib/mental";
import type { Lang } from "./lang";

const OP = { "+": "+", "-": "−" } as const;
const signed = (j: number) => `${j < 0 ? "−" : "+"} ${Math.abs(j)}`;

/** "47 + 8 = ?", "460 + ? = 500", "? − 25 = 75" */
export function questionText(q: MentalQuestion): string {
  const show = (k: "a" | "b" | "c") => (q.missing === k ? "?" : String(q[k]));
  return `${show("a")} ${OP[q.op]} ${show("b")} = ${show("c")}`;
}

/** The finished sum: "47 + 8 = 55". */
export const solvedText = (q: MentalQuestion): string => `${q.a} ${OP[q.op]} ${q.b} = ${q.c}`;

/** "47 + 8 = 47 + 3 + 5 = 50 + 5 = 55" from a start and its jumps. */
export function chain(start: number, jumps: readonly number[]): string {
  const total = jumps.reduce((x, j) => x + j, 0);
  const parts = [`${start} ${signed(total)}`];
  if (jumps.length > 1) {
    parts.push(`${start} ${jumps.map(signed).join(" ")}`);
    let now = start + jumps[0]!;
    for (let i = 1; i < jumps.length; i++) {
      parts.push(`${now} ${jumps.slice(i).map(signed).join(" ")}`);
      now += jumps[i]!;
    }
  }
  parts.push(String(start + total));
  return parts.join(" = ");
}

export const LEVEL_NAMES: Record<Lang, Record<MentalLevel | "mixed", string>> = {
  de: { 1: "Zehner und Hunderter", 2: "Über den Zehner", 3: "Zweistellig", 4: "Über den Hunderter", 5: "Ergänzen", mixed: "Alles gemischt" },
  en: { 1: "Tens and hundreds", 2: "Across a ten", 3: "Two-digit", 4: "Across a hundred", 5: "Missing numbers", mixed: "All mixed" },
};
export const LEVEL_EXAMPLES: Record<MentalLevel | "mixed", string> = {
  1: "340 + 50", 2: "47 + 8", 3: "46 + 37", 4: "380 + 45", 5: "460 + ? = 500", mixed: "1 – 5",
};

/** The working, the school way, with the child's own numbers. */
export function explainMental(q: MentalQuestion, lang: Lang): string[] {
  const de = lang === "de";
  const p = planOf(q);
  const [first, second] = p.jumps;
  switch (p.kind) {
    case "tens": {
      const unit = q.b % 100 === 0 && q.a % 100 === 0 ? 100 : 10;
      const name = unit === 100 ? (de ? "H" : "hundreds") : de ? "Z" : "tens";
      const [a, b, c] = [q.a / unit, q.b / unit, q.c / unit];
      const sp = de ? " " : " ";
      return [
        de
          ? `Rechne mit ${unit === 100 ? "Hundertern" : "Zehnern"}: ${a}${sp}${name} ${OP[q.op]} ${b}${sp}${name} = ${c}${sp}${name}.`
          : `Work in ${name}: ${a} ${name} ${OP[q.op]} ${b} ${name} = ${c} ${name}.`,
        de ? `Das ist wie ${a} ${OP[q.op]} ${b} = ${c}, nur mit ${unit === 100 ? "zwei Nullen" : "einer Null"} dran: ${solvedText(q)}`
          : `It's like ${a} ${OP[q.op]} ${b} = ${c}, with ${unit === 100 ? "two zeros" : "a zero"} on the end: ${solvedText(q)}`,
      ];
    }
    case "toTen":
    case "toHundred": {
      const round = de ? (p.kind === "toTen" ? "Zehner" : "Hunderter") : p.kind === "toTen" ? "ten" : "hundred";
      const mid = p.start + first!;
      return [
        de ? `Erst bis zum ${q.op === "+" ? "nächsten" : "vorigen"} ${round}: ${p.start} ${signed(first!)} = ${mid}.`
          : `First to the ${q.op === "+" ? "next" : "last"} ${round}: ${p.start} ${signed(first!)} = ${mid}.`,
        de ? `Dann den Rest: ${mid} ${signed(second!)} = ${mid + second!}.` : `Then the rest: ${mid} ${signed(second!)} = ${mid + second!}.`,
        chain(p.start, p.jumps),
      ];
    }
    case "stepwise":
      if (p.jumps.length === 1) return [solvedText(q)];
      return [
        de ? `Schrittweise: erst die Zehner, dann die Einer.` : `Step by step: tens first, then ones.`,
        chain(p.start, p.jumps),
      ];
    case "fill": {
      const target = p.start + p.jumps.reduce((x, j) => x + j, 0);
      const answer = answerOf(q);
      const lines = [
        q.op === "+"
          ? de ? `Ergänze: Wie weit ist es von ${p.start} bis ${target}?` : `Count on: how far is it from ${p.start} to ${target}?`
          : de ? `${q.a} − ? = ${q.c} heißt: Wie weit ist es von ${q.c} bis ${q.a}?` : `${q.a} − ? = ${q.c} asks: how far is it from ${q.c} up to ${q.a}?`,
      ];
      if (p.jumps.length === 2) {
        const mid = p.start + first!;
        lines.push(
          de ? `Von ${p.start} bis ${mid} sind es ${first}, von ${mid} bis ${target} sind es ${second}.`
            : `From ${p.start} to ${mid} is ${first}, from ${mid} to ${target} is ${second}.`,
          de ? `Zusammen: ${first} + ${second} = ${answer}` : `Together: ${first} + ${second} = ${answer}`,
        );
      } else {
        lines.push(de ? `Von ${p.start} bis ${target} sind es ${answer}.` : `From ${p.start} to ${target} is ${answer}.`);
      }
      lines.push(solvedText(q));
      return lines;
    }
    case "reverse": {
      const inverse = q.op === "-" ? "+" : "−";
      return [
        de ? `Rechne mit der Umkehraufgabe: ${questionText(q)} heißt ${q.c} ${inverse} ${q.b} = ?`
          : `Use the inverse: ${questionText(q)} means ${q.c} ${inverse} ${q.b} = ?`,
        chain(p.start, p.jumps),
        solvedText(q),
      ];
    }
  }
}
