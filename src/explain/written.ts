import type { AddStep, BorrowStep, ComplementStep, DivStep, DivideSum, MulRow, MulRowStep, WrittenSum } from "../lib/written";
import type { Lang } from "./lang";

/**
 * Words for one column of a written sum, in three parts so the page can use them two ways:
 *   ask   – the question for this column, used as a hint in "Ich rechne" (your turn)
 *   work  – how to work it out
 *   write – what to write down (and carry)
 * "Zeig mir" (show me) shows `${place}: ${work} ${write}`.
 */
export interface StepText {
  place: string;
  ask: string;
  work: string;
  write: string;
}

const PLACES: Record<Lang, string[]> = {
  de: ["Einer", "Zehner", "Hunderter", "Tausender", "Zehntausender", "Hunderttausender", "Millionen"],
  en: ["Ones", "Tens", "Hundreds", "Thousands", "Ten thousands", "Hundred thousands", "Millions"],
};

/** "Einer", "Zehner"… with the singular for a single exchanged unit: "1 Zehner". */
export const placeName = (column: number, lang: Lang): string => PLACES[lang][column] ?? `10^${column}`;

const placeSingular = (column: number, lang: Lang): string =>
  lang === "de" ? placeName(column, lang) : (["one", "ten", "hundred", "thousand", "ten thousand", "hundred thousand", "million"][column] ?? `10^${column}`);

function writeText(write: number, carry: number, leadingZero: boolean, lang: Lang): string {
  if (leadingZero) {
    return lang === "de" ? "Eine 0 ganz vorne schreibt man nicht." : "A 0 at the very front isn't written.";
  }
  if (lang === "de") return carry ? `Schreibe ${write}, merke ${carry}.` : `Schreibe ${write}.`;
  return carry ? `Write ${write}, carry ${carry}.` : `Write ${write}.`;
}

function addText(s: AddStep, lang: Lang, placePrefix = ""): StepText {
  const parts = s.digits.map(String);
  if (s.carryIn) parts.push(lang === "de" ? `${s.carryIn} (Übertrag)` : `${s.carryIn} (carried)`);
  const expr = parts.join(" + ");
  const onlyCarry = s.digits.length === 0 && s.carryIn > 0;
  return {
    place: placePrefix + placeName(s.column, lang),
    ask: onlyCarry
      ? lang === "de" ? "Hier steht nur noch der Übertrag. Was schreibst du?" : "Only the carried number is left here. What do you write?"
      : `${expr} = ?`,
    work: onlyCarry
      ? lang === "de" ? `Nur der Übertrag: ${s.carryIn}.` : `Just the carried ${s.carryIn}.`
      : `${expr} = ${s.total}.`,
    write: writeText(s.write, s.carryOut, false, lang),
  };
}

function complementText(s: ComplementStep, lang: Lang): StepText {
  const de = lang === "de";
  const lowerPart = s.carryIn ? `${s.bottom} + ${s.carryIn} ${de ? "(Übertrag)" : "(carried)"} = ${s.lower}. ` : "";
  const ask = de ? `${s.lower} plus wie viel ergibt ${s.top}?` : `${s.lower} plus what makes ${s.top}?`;
  const work =
    s.target === s.top
      ? `${s.lower} + ${s.write} = ${s.top}.`
      : de
        ? `Das geht nicht, also bis ${s.target}: ${s.lower} + ${s.write} = ${s.target}.`
        : `That's not possible, so go up to ${s.target}: ${s.lower} + ${s.write} = ${s.target}.`;
  return {
    place: placeName(s.column, lang),
    ask: lowerPart + ask,
    work: lowerPart + ask + " " + work,
    write: writeText(s.write, s.carryOut, s.leadingZero, lang),
  };
}

function borrowText(s: BorrowStep, lang: Lang): StepText {
  const de = lang === "de";
  const ask = `${s.top} − ${s.bottom} = ?`;
  if (s.exchanges.length === 0) {
    return { place: placeName(s.column, lang), ask, work: `${s.top} − ${s.bottom} = ${s.write}.`, write: writeText(s.write, 0, s.leadingZero, lang) };
  }
  const source = s.exchanges[0]!;
  const chain = s.exchanges
    .map((e) => `${placeName(e.column, lang)} ${e.from} → ${e.to}`)
    .join(", ");
  const exchange = de
    ? `${s.top} − ${s.bottom} geht nicht. Entbündle: tausche 1 ${placeSingular(source.column, lang)} (${chain}), dann hast du ${s.topAfter} ${placeName(s.column, lang)}.`
    : `${s.top} − ${s.bottom} isn't possible. Exchange 1 ${placeSingular(source.column, lang)} (${chain}), so now you have ${s.topAfter} ${placeName(s.column, lang).toLowerCase()}.`;
  return {
    place: placeName(s.column, lang),
    ask,
    work: `${exchange} ${s.topAfter} − ${s.bottom} = ${s.write}.`,
    write: writeText(s.write, 0, s.leadingZero, lang),
  };
}

// ---------- multiplication ----------

function mulText(a: number, row: MulRow, s: MulRowStep, first: boolean, lang: Lang): StepText {
  const de = lang === "de";
  const start = first
    ? de ? `Jetzt mal ${row.bDigit}: das Ergebnis endet genau unter der ${row.bDigit}. ` : `Now times ${row.bDigit}: this line ends right under the ${row.bDigit}. `
    : "";
  const place = `${a} · ${row.bDigit}`;
  if (s.kind === "carry") {
    return {
      place,
      ask: de ? "Keine Ziffer mehr übrig. Was schreibst du vorne hin?" : "No digits left. What do you write at the front?",
      work: de ? `Keine Ziffer mehr übrig: die gemerkte ${s.write} kommt vorne hin.` : `No digits left: the carried ${s.write} goes at the front.`,
      write: de ? `Schreibe ${s.write}.` : `Write ${s.write}.`,
    };
  }
  const product = s.aDigit * s.bDigit;
  const ask = s.carryIn
    ? `${s.aDigit} · ${s.bDigit} + ${s.carryIn} ${de ? "(gemerkt)" : "(carried)"} = ?`
    : `${s.aDigit} · ${s.bDigit} = ?`;
  const work = s.carryIn
    ? de ? `${s.aDigit} · ${s.bDigit} = ${product}, plus ${s.carryIn} gemerkt = ${s.total}.` : `${s.aDigit} · ${s.bDigit} = ${product}, plus ${s.carryIn} carried = ${s.total}.`
    : `${s.aDigit} · ${s.bDigit} = ${s.total}.`;
  return { place, ask: start + ask, work: start + work, write: writeText(s.write, s.carryOut, false, lang) };
}

// ---------- division ----------

function divTexts(sum: DivideSum, lang: Lang): Walk[] {
  const de = lang === "de";
  const divisor = sum.numbers[1];
  const walks: Walk[] = [];
  sum.steps.forEach((s: DivStep, k) => {
    const place = `${s.part} : ${divisor}`;
    const takeMore =
      k === 0 && s.shown.length > 1 && s.part >= divisor
        ? de ? `${s.shown.slice(0, -1)} ist kleiner als ${divisor}, also nimm ${s.part}. ` : `${s.shown.slice(0, -1)} is smaller than ${divisor}, so take ${s.part}. `
        : "";
    const fits =
      s.qDigit === 0
        ? de ? `Die ${divisor} passt nicht in die ${s.part}, also 0-mal.` : `${divisor} doesn't go into ${s.part}, so 0 times.`
        : de
          ? `Die ${divisor} passt ${s.qDigit}-mal in die ${s.part}: ${s.qDigit} · ${divisor} = ${s.product} (${s.qDigit + 1} · ${divisor} = ${(s.qDigit + 1) * divisor} wäre zu viel).`
          : `${divisor} goes into ${s.part} ${s.qDigit} times: ${s.qDigit} · ${divisor} = ${s.product} (${s.qDigit + 1} · ${divisor} = ${(s.qDigit + 1) * divisor} would be too much).`;
    walks.push({
      answer: s.qDigit,
      text: {
        place,
        ask: takeMore + (de ? `Wie oft passt die ${divisor} in die ${s.part}?` : `How many times does ${divisor} go into ${s.part}?`),
        work: takeMore + fits,
        write: (de ? `Schreibe ${s.qDigit} ins Ergebnis.` : `Write ${s.qDigit} in the answer.`) +
          (s.qDigit === 0 && k > 0 ? (de ? " Die 0 nicht vergessen!" : " Don't forget the 0!") : ""),
      },
    });
    walks.push({
      answer: null,
      text: {
        place,
        ask: "",
        work: de
          ? `${s.qDigit} · ${divisor} = ${s.product}. Schreibe ${s.product} darunter und ziehe ab: ${s.part} − ${s.product} = ${s.remainder}.`
          : `${s.qDigit} · ${divisor} = ${s.product}. Write ${s.product} underneath and take it away: ${s.part} − ${s.product} = ${s.remainder}.`,
        write: "",
      },
    });
    if (s.bringDown !== null) {
      const next = s.remainder * 10 + s.bringDown;
      walks.push({
        answer: null,
        text: {
          place: de ? "Herunterholen" : "Bring down",
          ask: "",
          work: de ? `Hole die nächste Ziffer herunter: ${s.bringDown}. Jetzt hast du ${next}.` : `Bring down the next digit: ${s.bringDown}. Now you have ${next}.`,
          write: "",
        },
      });
    }
  });
  walks.push({
    answer: null,
    text: {
      place: de ? "Rest" : "Remainder",
      ask: "",
      work: sum.remainder
        ? de ? `Es gibt keine Ziffer mehr zum Herunterholen. ${sum.remainder} bleibt übrig: das ist der Rest.` : `There are no digits left to bring down. ${sum.remainder} is left over: that's the remainder.`
        : de ? "Es gibt keine Ziffer mehr und es bleibt nichts übrig: kein Rest." : "There are no digits left and nothing is left over: no remainder.",
      write: "",
    },
  });
  return walks;
}

// ---------- every operation as one list of small steps ----------

/**
 * One small step of the working. `answer` is the digit the child types in "Ich rechne";
 * null means the step happens by itself (writing a product, bringing a digit down, a blank 0).
 */
export interface Walk {
  text: StepText;
  answer: number | null;
}

export function walkthrough(sum: WrittenSum, lang: Lang): Walk[] {
  switch (sum.kind) {
    case "add":
      return sum.steps.map((s) => ({ text: addText(s, lang), answer: s.write }));
    case "complement":
      return sum.steps.map((s) => ({ text: complementText(s, lang), answer: s.leadingZero ? null : s.write }));
    case "borrow":
      return sum.steps.map((s) => ({ text: borrowText(s, lang), answer: s.leadingZero ? null : s.write }));
    case "multiply": {
      const a = sum.numbers[0];
      const lines = sum.rows.flatMap((row) => row.steps.map((s, j) => ({ text: mulText(a, row, s, j === 0, lang), answer: s.write })));
      const prefix = lang === "de" ? "Zusammenzählen, " : "Adding up, ";
      const adding = (sum.addition ?? []).map((s) => ({ text: addText(s, lang, prefix), answer: s.write }));
      return [...lines, ...adding];
    }
    case "divide":
      return divTexts(sum, lang);
  }
}

/** Just the texts, one per small step. */
export const stepTexts = (sum: WrittenSum, lang: Lang): StepText[] => walkthrough(sum, lang).map((w) => w.text);

/** "Einer: 3 + 9 = 12. Schreibe 2, merke 1." */
export const fullText = (t: StepText): string => `${t.place}: ${t.work} ${t.write}`.trim();

const SYMBOL: Record<WrittenSum["kind"], string> = { add: "+", complement: "−", borrow: "−", multiply: "·", divide: ":" };
export const sumText = (sum: WrittenSum): string => `${sum.numbers.join(` ${SYMBOL[sum.kind]} `)} = ${sum.result}`;

/** What to do before the first column. */
export function introText(sum: WrittenSum, lang: Lang): string {
  const de = lang === "de";
  const line = de
    ? "Schreibe die Zahlen genau untereinander: Einer unter Einer, Zehner unter Zehner. Dann fang rechts bei den Einern an."
    : "Write the numbers exactly underneath each other: ones under ones, tens under tens. Then start on the right with the ones.";
  if (sum.kind === "complement") {
    return line + (de ? " Beim Ergänzen fragst du immer: Wie viel fehlt von unten bis oben?" : " When adding on, always ask: how much is missing from the bottom number up to the top one?");
  }
  if (sum.kind === "borrow") {
    return line + (de ? " Beim Abziehen rechnest du oben minus unten." : " When taking away, work out top minus bottom.");
  }
  if (sum.kind === "multiply") {
    const [a, b] = sum.numbers;
    return de
      ? `Beide Zahlen stehen in einer Zeile: ${a} · ${b}. Nimm ${a} mal jede Ziffer von ${b}, von links nach rechts, und rechne jeweils rechts bei den Einern von ${a} los.` +
          (sum.rows.length > 1 ? " Am Ende zählst du die Zeilen zusammen." : "")
      : `Both numbers go on one line: ${a} · ${b}. Multiply ${a} by each digit of ${b}, left to right, starting each time with the ones of ${a}.` +
          (sum.rows.length > 1 ? " At the end, add the lines up." : "");
  }
  if (sum.kind === "divide") {
    return de
      ? "Bei der Division rechnest du von links: teilen, malnehmen, abziehen, herunterholen. Immer wieder, bis keine Ziffer mehr übrig ist."
      : "Division works from the left: divide, multiply, take away, bring down. Again and again until no digits are left.";
  }
  return line;
}

/** The finished result, plus a check using the opposite operation (die Probe). */
export function finishText(sum: WrittenSum, lang: Lang): { result: string; check: string | null } {
  const de = lang === "de";
  const result = (de ? "Fertig! " : "Done! ") + sumText(sum);
  const probe = de ? "Probe" : "Check";
  switch (sum.kind) {
    case "add": {
      if (sum.numbers.length !== 2) return { result, check: null };
      const [a, b] = sum.numbers as [number, number];
      return { result, check: `${probe}: ${sum.result} − ${b} = ${a} ✓` };
    }
    case "complement":
    case "borrow": {
      const [a, b] = sum.numbers;
      return { result, check: `${probe}: ${sum.result} + ${b} = ${a} ✓` };
    }
    case "multiply": {
      const [a, b] = sum.numbers;
      return { result, check: b === 0 ? null : `${probe}: ${sum.result} : ${b} = ${a} ✓` };
    }
    case "divide": {
      const [a, b] = sum.numbers;
      const rest = sum.remainder ? (de ? ` Rest ${sum.remainder}` : ` remainder ${sum.remainder}`) : "";
      return {
        result: result + rest,
        check: `${probe}: ${sum.result} · ${b}${sum.remainder ? ` + ${sum.remainder}` : ""} = ${a} ✓`,
      };
    }
  }
}
