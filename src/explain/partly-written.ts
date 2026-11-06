import type { SplitTask } from "../lib/partly-written";
import type { Lang } from "./lang";

const zeros = (n: number): number => {
  let k = 0;
  while (n % 10 ** (k + 1) === 0) k++;
  return k;
};

/** How a factor sits in the sum: a single digit goes first (7 · 46), a two-digit factor after (23 · 14). */
const smallFirst = (t: Extract<SplitTask, { kind: "multiply" }>) => t.b < 10;

/** The task as the child reads it: "7 · 46", "96 : 4". */
export function taskText(t: SplitTask): string {
  if (t.kind === "multiply") return smallFirst(t) ? `${t.b} · ${t.a}` : `${t.a} · ${t.b}`;
  return `${t.dividend} : ${t.divisor}`;
}

/** The parts as written in school: with a rest, the last part keeps it (87 : 4 → 80 + 7, and 7 : 4 = 1 R 3). */
const shownParts = (t: Extract<SplitTask, { kind: "divide" }>): number[] => t.parts.map((p, i) => (i === t.parts.length - 1 ? p + t.rest : p));

/** The split line: "7 · 40 + 7 · 6" or "80 : 4 + 16 : 4". */
export function splitLine(t: SplitTask): string {
  if (t.kind === "multiply") return t.parts.map((p) => (smallFirst(t) ? `${t.b} · ${p}` : `${p} · ${t.b}`)).join(" + ");
  return shownParts(t).map((p) => `${p} : ${t.divisor}`).join(" + ");
}

/** The whole working on one line: "7 · 46 = 7 · 40 + 7 · 6 = 280 + 42 = 322". */
export function workingLine(t: SplitTask, lang: Lang): string {
  const rest = lang === "de" ? "R" : "r";
  if (t.kind === "multiply") return `${taskText(t)} = ${splitLine(t)} = ${t.products.join(" + ")} = ${t.result}`;
  const sum = t.quotients.join(" + ");
  return `${taskText(t)} = ${splitLine(t)} = ${sum}${t.rest ? ` ${rest} ${t.rest}` : ""} = ${t.result}${t.rest ? ` ${rest} ${t.rest}` : ""}`;
}

/** Step by step, with the "multiply the digit, then add the zeros" trick. */
export function explainSplit(t: SplitTask, lang: Lang): string[] {
  const de = lang === "de";
  const zeroWords = (k: number) => (de ? (k === 1 ? "eine 0" : `${k} Nullen`) : k === 1 ? "a 0" : `${k} zeros`);
  if (t.kind === "multiply") {
    const lines = [de ? `Zerlege ${t.a} in ${t.parts.join(" + ")}.` : `Split ${t.a} into ${t.parts.join(" + ")}.`];
    t.parts.forEach((p, i) => {
      const k = zeros(p);
      const product = t.products[i]!;
      if (k > 0 && t.b < 10) {
        const small = p / 10 ** k;
        lines.push(de ? `${t.b} · ${p} = ${product}: Rechne ${t.b} · ${small} = ${t.b * small} und hänge ${zeroWords(k)} an.`
          : `${t.b} · ${p} = ${product}: work out ${t.b} · ${small} = ${t.b * small} and add ${zeroWords(k)}.`);
      } else lines.push(`${smallFirst(t) ? `${t.b} · ${p}` : `${p} · ${t.b}`} = ${product}`);
    });
    lines.push(de ? `Zusammen: ${t.products.join(" + ")} = ${t.result}` : `Together: ${t.products.join(" + ")} = ${t.result}`);
    return lines;
  }
  const parts = shownParts(t);
  const lines = [
    de ? `Zerlege ${t.dividend} so, dass sich die Teile leicht durch ${t.divisor} teilen lassen: ${parts.join(" + ")}.`
      : `Split ${t.dividend} into parts that are easy to divide by ${t.divisor}: ${parts.join(" + ")}.`,
  ];
  parts.forEach((p, i) => {
    const k = zeros(p);
    const q = t.quotients[i]!;
    const small = p / 10 ** k;
    const last = i === parts.length - 1;
    if (last && t.rest) {
      lines.push(de ? `${p} : ${t.divisor} = ${q} Rest ${t.rest}, denn ${q} · ${t.divisor} = ${q * t.divisor} und es bleiben ${t.rest} übrig.`
        : `${p} : ${t.divisor} = ${q} remainder ${t.rest}, because ${q} · ${t.divisor} = ${q * t.divisor} and ${t.rest} is left over.`);
    } else if (k > 0 && small % t.divisor === 0) {
      lines.push(de ? `${p} : ${t.divisor} = ${q}: Rechne ${small} : ${t.divisor} = ${small / t.divisor} und hänge ${zeroWords(k)} an.`
        : `${p} : ${t.divisor} = ${q}: work out ${small} : ${t.divisor} = ${small / t.divisor} and add ${zeroWords(k)}.`);
    } else lines.push(`${p} : ${t.divisor} = ${q}`);
  });
  lines.push(de ? `Zusammen: ${t.quotients.join(" + ")} = ${t.result}${t.rest ? ` Rest ${t.rest}` : ""}` : `Together: ${t.quotients.join(" + ")} = ${t.result}${t.rest ? ` remainder ${t.rest}` : ""}`);
  if (t.rest) {
    lines.push(de ? `Probe: ${t.result} · ${t.divisor} + ${t.rest} = ${t.dividend}` : `Check: ${t.result} · ${t.divisor} + ${t.rest} = ${t.dividend}`);
  }
  return lines;
}
