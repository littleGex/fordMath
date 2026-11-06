import { getAt, schoolText, workedLines, type BracketTask, type Expr, type OrderLevel, type Rule } from "../lib/expression";
import type { Lang } from "./lang";

export const RULES: Record<Lang, string[]> = {
  de: ["Klammern zuerst.", "Punkt vor Strich: · und : vor + und −.", "Sonst von links nach rechts."],
  en: ["Brackets first.", "Times and divide (· and :) before plus and minus.", "Otherwise, left to right."],
};

export const LEVEL_NAMES: Record<Lang, Record<OrderLevel, string>> = {
  de: { 1: "Punkt vor Strich", 2: "Klammern", 3: "Lange Aufgaben", 4: "Profi" },
  en: { 1: "Times before plus", 2: "Brackets", 3: "Longer sums", 4: "Expert" },
};

/** The part of the sum at `path`, without its own brackets: "3 + 4". */
export function partText(e: Expr, path: string): string {
  const node = getAt(e, path);
  return schoolText(node.type === "binary" ? { ...node, paren: false } : node);
}

/** What to say when the child taps an operation that isn't next. */
export function ruleMessage(rule: Rule, first: string, lang: Lang): string {
  const de = lang === "de";
  switch (rule) {
    case "brackets":
      return de ? `Klammern zuerst! Rechne erst, was in der Klammer steht: ${first}.` : `Brackets first! Work out what's in the brackets: ${first}.`;
    case "punkt-vor-strich":
      return de
        ? `Punkt vor Strich! Erst · und :, dann + und −. Zuerst kommt ${first}.`
        : `Times and divide come before plus and minus. First comes ${first}.`;
    case "left-to-right":
      return de ? `Von links nach rechts! Zuerst kommt ${first}.` : `Left to right! First comes ${first}.`;
  }
}

/** "3 + 4 · 2 = 3 + 8 = 11" */
export const workingLine = (e: Expr): string => workedLines(e).join(" = ");

export function bracketPrompt(t: BracketTask, lang: Lang): string {
  const plain = t.numbers.map((n, i) => (i === 0 ? String(n) : `${{ "+": "+", "-": "−", "*": "·", "/": ":", "^": "^" }[t.ops[i - 1]!]} ${n}`)).join(" ");
  return lang === "de"
    ? `Setze Klammern, damit ${t.target} herauskommt: ${plain}`
    : `Put in brackets to make ${t.target}: ${plain}`;
}

/** Each option worked out, so the child sees why only one makes the target. */
export function bracketSteps(t: BracketTask, lang: Lang, parseOption: (text: string) => Expr): string[] {
  const de = lang === "de";
  return [
    ...t.options.map((o) => workingLine(parseOption(o))),
    de ? `Nur ${t.options[t.answer]} ergibt ${t.target}.` : `Only ${t.options[t.answer]} makes ${t.target}.`,
  ];
}
