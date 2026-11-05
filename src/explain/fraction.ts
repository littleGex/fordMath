import {
  add, commonDenominator, compare, isSimplified, simplify, toText, withDenominator,
  type Fraction, type FractionLevel, type FractionQuestion,
} from "../lib/fraction";
import { gcd } from "../lib/number-theory";
import type { Lang } from "./lang";
import type { ExplainSection } from "./types";

const f = toText;

export const LEVEL_NAMES: Record<Lang, Record<FractionLevel, string>> = {
  de: { 1: "Was ist gefärbt?", 2: "Erweitern", 3: "Kürzen", 4: "Größer oder kleiner?", 5: "Plus, gleicher Nenner", 6: "Plus, verschiedene Nenner" },
  en: { 1: "What's coloured?", 2: "Same amount", 3: "Simplify", 4: "Bigger or smaller?", 5: "Add, same denominator", 6: "Add, different denominators" },
};

/** The question as the child reads it. */
export function prompt(q: FractionQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "name-picture": return de ? "Welcher Bruch ist gefärbt?" : "Which fraction is coloured?";
    case "equivalent": return de ? `Welcher Bruch ist gleich viel wie ${f(q.given)}?` : `Which fraction is the same amount as ${f(q.given)}?`;
    case "simplify": return de ? `Kürze ${f(q.given)} so weit es geht.` : `Simplify ${f(q.given)} as far as you can.`;
    case "compare": return de ? "Welcher Bruch ist größer?" : "Which fraction is bigger?";
    case "add-same":
    case "add-different": return de ? "Rechne aus." : "Work it out."; // the sum itself is drawn big underneath
  }
}

/** After adding: mention when the answer can be simplified further. */
function simplifyNote(x: Fraction, de: boolean): string[] {
  if (isSimplified(x)) return [];
  const s = simplify(x);
  return [de ? `Das kannst du noch kürzen: ${f(x)} = ${f(s)}.` : `You can simplify that: ${f(x)} = ${f(s)}.`];
}

/** The working, shown after an answer. */
export function explainFraction(q: FractionQuestion, lang: Lang): ExplainSection[] {
  const de = lang === "de";
  const title = de ? "So geht's" : "How it works";
  let steps: string[];
  switch (q.kind) {
    case "name-picture": {
      const { num, den } = q.shown;
      steps = de
        ? [
            `Das Ganze ist in ${den} gleich große Teile geteilt. Das ist der Nenner (unten): ${den}.`,
            `${num} ${num === 1 ? "Teil ist" : "Teile sind"} gefärbt. Das ist der Zähler (oben): ${num}.`,
            `Also ist ${f(q.shown)} gefärbt.`,
          ]
        : [
            `The whole is split into ${den} equal parts. That's the denominator (bottom): ${den}.`,
            `${num} ${num === 1 ? "part is" : "parts are"} coloured. That's the numerator (top): ${num}.`,
            `So ${f(q.shown)} is coloured.`,
          ];
      break;
    }
    case "equivalent": {
      const k = q.factor;
      const r = q.choices[q.answer]!;
      const right = r.kind === "fraction" ? r.value : q.given;
      steps = de
        ? [
            "Erweitern: Zähler und Nenner mit derselben Zahl malnehmen. Das Stück bleibt gleich groß, es ist nur feiner geteilt.",
            `${f(q.given)} = ${q.given.num}·${k} / ${q.given.den}·${k} = ${f(right)}`,
          ]
        : [
            "Multiply the top and the bottom by the same number. The amount stays the same; it's just cut into smaller pieces.",
            `${f(q.given)} = ${q.given.num}·${k} / ${q.given.den}·${k} = ${f(right)}`,
          ];
      break;
    }
    case "simplify": {
      const g = gcd(q.given.num, q.given.den);
      const s = simplify(q.given);
      steps = de
        ? [
            "Kürzen: Zähler und Nenner durch dieselbe Zahl teilen.",
            `Am schnellsten geht es mit dem ggT: ggT(${q.given.num}, ${q.given.den}) = ${g}.`,
            `${f(q.given)} = ${q.given.num}:${g} / ${q.given.den}:${g} = ${f(s)}`,
            `Weiter geht es nicht: ${s.num} und ${s.den} haben nur den Teiler 1 gemeinsam.`,
          ]
        : [
            "Divide the top and the bottom by the same number.",
            `Quickest is the greatest common divisor: gcd(${q.given.num}, ${q.given.den}) = ${g}.`,
            `${f(q.given)} = ${q.given.num}:${g} / ${q.given.den}:${g} = ${f(s)}`,
            `You can't go further: ${s.num} and ${s.den} share no divisor except 1.`,
          ];
      break;
    }
    case "compare": {
      const { left, right } = q;
      const c = compare(left, right);
      const sign = c === 1 ? ">" : c === -1 ? "<" : "=";
      if (left.den === right.den) {
        steps = de
          ? [`Gleicher Nenner: Vergleiche die Zähler. ${left.num} ${sign} ${right.num}, also ${f(left)} ${sign} ${f(right)}.`]
          : [`Same denominator: compare the numerators. ${left.num} ${sign} ${right.num}, so ${f(left)} ${sign} ${f(right)}.`];
      } else {
        const L = commonDenominator(left, right);
        const a = withDenominator(left, L);
        const b = withDenominator(right, L);
        steps = de
          ? [
              `Bring beide auf den gleichen Nenner. Der kleinste ist ${L} (kgV von ${left.den} und ${right.den}).`,
              `${f(left)} = ${f(a)} und ${f(right)} = ${f(b)}`,
              `${a.num} ${sign} ${b.num}, also ${f(left)} ${sign} ${f(right)}.`,
            ]
          : [
              `Give both the same denominator. The smallest is ${L} (lcm of ${left.den} and ${right.den}).`,
              `${f(left)} = ${f(a)} and ${f(right)} = ${f(b)}`,
              `${a.num} ${sign} ${b.num}, so ${f(left)} ${sign} ${f(right)}.`,
            ];
      }
      break;
    }
    case "add-same": {
      const sum = add(q.left, q.right);
      steps = de
        ? [
            "Gleicher Nenner: Zähle die Zähler zusammen, der Nenner bleibt.",
            `${f(q.left)} + ${f(q.right)} = ${q.left.num}+${q.right.num} / ${sum.den} = ${f(sum)}`,
            `Achtung: Die Nenner werden nicht addiert. Es bleiben ${sum.den}tel.`,
            ...simplifyNote(sum, true),
          ]
        : [
            "Same denominator: add the numerators; the denominator stays the same.",
            `${f(q.left)} + ${f(q.right)} = ${q.left.num}+${q.right.num} / ${sum.den} = ${f(sum)}`,
            `Careful: the denominators are not added. The pieces stay the same size.`,
            ...simplifyNote(sum, false),
          ];
      break;
    }
    case "add-different": {
      const L = commonDenominator(q.left, q.right);
      const a = withDenominator(q.left, L);
      const b = withDenominator(q.right, L);
      const sum = add(q.left, q.right);
      steps = de
        ? [
            `Erst gleichnamig machen: Der gemeinsame Nenner ist ${L} (kgV von ${q.left.den} und ${q.right.den}).`,
            `${f(q.left)} = ${f(a)} und ${f(q.right)} = ${f(b)}`,
            `Jetzt die Zähler addieren: ${f(a)} + ${f(b)} = ${f(sum)}`,
            ...simplifyNote(sum, true),
          ]
        : [
            `First give them the same denominator: ${L} (lcm of ${q.left.den} and ${q.right.den}).`,
            `${f(q.left)} = ${f(a)} and ${f(q.right)} = ${f(b)}`,
            `Now add the numerators: ${f(a)} + ${f(b)} = ${f(sum)}`,
            ...simplifyNote(sum, false),
          ];
      break;
    }
  }
  return [{ title, steps }];
}

/** Fractions worth drawing as bars after an answer, so the child can see the amounts. */
export function barsFor(q: FractionQuestion): Fraction[] {
  switch (q.kind) {
    case "name-picture": return [q.shown];
    case "equivalent": {
      const r = q.choices[q.answer]!;
      return r.kind === "fraction" ? [q.given, r.value] : [q.given];
    }
    case "simplify": return [q.given, simplify(q.given)];
    case "compare": return [q.left, q.right];
    case "add-same":
    case "add-different": return [q.left, q.right, add(q.left, q.right)];
  }
}
