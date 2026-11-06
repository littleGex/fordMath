import { evaluate, formatExpr, parse, type Expr, type ExpressionProblem } from "../lib/expression";
import { prettyFor } from "../parse";
import type { Lang } from "./lang";
import type { ExplainSection } from "./types";

const MAX_STEPS = 14;
const OP_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" } as const;
const OP_SYMBOL_DE = { "+": "+", "-": "−", "*": "·", "/": ":", "^": "^" } as const;

/** Numbers, values and results written for one language. */
function writer(lang: Lang) {
  const n = prettyFor(lang);
  const de = lang === "de";
  /** A value, bracketed when negative so "3 × (−2)" reads correctly. */
  const v = (x: number): string => (Number.isNaN(x) ? (de ? "nicht definiert" : "undefined") : x < 0 ? `(${n(x)})` : n(x));
  const describe = (r: number): string => {
    if (Number.isNaN(r)) return de ? "nicht definiert (keine reelle Zahl)" : "undefined (not a real number)";
    if (r === Infinity || r === -Infinity) return `${r > 0 ? "" : "−"}∞ ${de ? "(durch null geteilt oder zu groß)" : "(division by zero or overflow)"}`;
    return n(r);
  };
  return { n, v, describe, ops: de ? OP_SYMBOL_DE : OP_SYMBOL };
}
type Writer = ReturnType<typeof writer>;

/**
 * Walks the tree children-first (post-order). That order is exactly
 * "brackets and functions, then powers, then × ÷, then + −", so each step
 * only uses values already worked out.
 */
function collectSteps(e: Expr, x: number, out: string[], w: Writer): number {
  const { n, v, describe, ops } = w;
  switch (e.type) {
    case "num":
      return e.value;
    case "var":
      return x;
    case "const":
      return evaluate(e, x);
    case "neg": {
      const a = collectSteps(e.arg, x, out, w);
      const r = -a;
      if (e.arg.type !== "num") out.push(`${formatExpr(e)} = −${v(a)} = ${n(r)}`);
      return r;
    }
    case "call": {
      const a = collectSteps(e.arg, x, out, w);
      const r = evaluate(e, x);
      out.push(`${formatExpr(e)} = ${e.fn}(${n(a)}) = ${describe(r)}`);
      return r;
    }
    case "binary": {
      const l = collectSteps(e.left, x, out, w);
      const r = collectSteps(e.right, x, out, w);
      const result = evaluate(e, x);
      out.push(`${formatExpr(e)} = ${v(l)} ${ops[e.op]} ${v(r)} = ${describe(result)}`);
      return result;
    }
  }
}

/** How the text was read, and f(x) worked out step by step for one x. */
export function explainExpression(text: string, x: number, lang: Lang = "en"): ExplainSection[] {
  const w = writer(lang);
  const { n, describe } = w;
  const de = lang === "de";
  const tree = parse(text);
  const read = formatExpr(tree);
  const steps: string[] = [];
  const result = collectSteps(tree, x, steps, w);

  const reading = [de ? `Gelesen als: f(x) = ${read}` : `Read as: f(x) = ${read}`];
  if (/·/.test(read)) reading.push(de ? "Ein · steht für ein Mal, das du ohne Zeichen geschrieben hast, wie bei 2x oder 3(x + 1)." : "A · marks a multiplication you typed without a sign, like 2x or 3(x + 1).");
  if (read !== text.replace(/\s+/g, " ").trim()) {
    reading.push(de ? "Klammern, die nichts ändern, fallen weg; Klammern, die etwas ändern, bleiben." : "Brackets that don't change the answer are left out, and ones that do are kept.");
  }

  const working = [
    de
      ? `Setze x = ${n(x)} ein und rechne von innen nach außen: erst Klammern und Funktionen, dann Potenzen, dann Punkt- vor Strichrechnung.`
      : `Put x = ${n(x)} in, then work from the inside out: brackets and functions first, then powers, then × and ÷, then + and −.`,
  ];
  if (steps.length === 0) {
    working.push(de ? `Da gibt es nichts zu rechnen: f(${n(x)}) = ${describe(result)}` : `There's nothing to work out: f(${n(x)}) = ${describe(result)}`);
  } else if (steps.length > MAX_STEPS) {
    const more = steps.length - MAX_STEPS + 1;
    working.push(...steps.slice(0, MAX_STEPS - 1), de ? `… noch ${more} Schritte …` : `… ${more} more steps …`, steps[steps.length - 1]!);
  } else {
    working.push(...steps);
  }
  working.push(de ? `Also ist f(${n(x)}) = ${describe(result)}` : `So f(${n(x)}) = ${describe(result)}`);

  return [
    { title: de ? "So wurde es gelesen" : "How it was read", steps: reading },
    { title: de ? `f(${n(x)}) ausrechnen` : `Working out f(${n(x)})`, steps: working },
  ];
}

/** What's wrong with the typed expression, in German. (The English message is the error's own.) */
export function problemText(p: ExpressionProblem, lang: Lang, english: string): string {
  if (lang === "en") return english;
  switch (p.kind) {
    case "empty": return "Gib einen Term ein, zum Beispiel x^2 + 1";
    case "unexpectedChar": return `Unerwartetes „${p.ch}“ an Stelle ${p.at}`;
    case "missingOperator": return `Vor „${p.before}“ an Stelle ${p.at} fehlt ein Rechenzeichen`;
    case "needsBrackets": return `${p.name} braucht Klammern, zum Beispiel ${p.name}(x)`;
    case "unknownName": return `„${p.name}“ an Stelle ${p.at} kenne ich nicht. Nimm x als Variable, pi oder e, oder eine Funktion wie sin(x).`;
    case "unexpectedClose": return `Unerwartete „)“ an Stelle ${p.at}`;
    case "unmatchedClose": return `Die „)“ an Stelle ${p.at} hat keine „(“ dazu`;
    case "expectedOperand": return `An Stelle ${p.at} fehlt eine Zahl, x oder „(“ statt „${p.op}“`;
    case "endsEarly": return "Der Term hört zu früh auf: Am Ende fehlt noch etwas";
    case "emptyBrackets": return `Leere Klammern an Stelle ${p.at}`;
    case "neverClosed": return `Die „(“ an Stelle ${p.at} wird nie geschlossen`;
    case "unexpectedInput": return `Unerwartete Eingabe an Stelle ${p.at}`;
  }
}
