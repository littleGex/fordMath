import { simplify, toMixed, work, type CalcQuestion, type Frac, type Op, type Working } from "../lib/fraction-calc";
import type { Lang } from "./lang";

const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));
/** "3/4", "5", "−1/2" */
export const fracText = (f: Frac): string => (f.d === 1 ? minus(f.n) : `${minus(f.n)}/${f.d}`);
/** "1 7/8" for 15/8, "2" for 6/3, "3/4" for 3/4 */
export function mixedText(f: Frac): string {
  const { whole, part } = toMixed(f);
  if (part.n === 0) return minus(whole);
  if (whole === 0) return fracText(simplify(f).result);
  return `${minus(whole)} ${part.n}/${part.d}`;
}
const isImproper = (f: Frac) => Math.abs(f.n) > f.d && f.n % f.d !== 0;
export const opSign = (op: Op, lang: Lang): string => (op === "+" ? "+" : op === "-" ? "−" : op === "*" ? "·" : lang === "de" ? ":" : "÷");

/** The task as written, with mixed numbers when asked: "2 1/3 + 1 1/2". */
export const taskText = (op: Op, a: Frac, b: Frac, lang: Lang, mixed = false): string =>
  `${mixed ? mixedText(a) : fracText(a)} ${opSign(op, lang)} ${mixed ? mixedText(b) : fracText(b)}`;

/** Turning mixed numbers into fractions first: 2 1/3 = (2 · 3 + 1)/3 = 7/3. */
function unmix(fs: Frac[], lang: Lang): string[] {
  const parts = fs.filter(isImproper).map((f) => {
    const { whole, part } = toMixed(f);
    return `${mixedText(f)} = (${whole} · ${part.d} + ${part.n})/${part.d} = ${fracText(f)}`;
  });
  if (parts.length === 0) return [];
  return [lang === "de" ? `Wandle die gemischten Zahlen in Brüche um: ${parts.join(", ")}` : `Turn the mixed numbers into fractions: ${parts.join(", ")}`];
}

function finish(raw: Frac, result: Frac, by: number, lang: Lang): string[] {
  const de = lang === "de";
  const out: string[] = [];
  if (by > 1) out.push(de ? `Kürze mit ${by}: ${fracText(raw)} = ${fracText(result)}` : `Simplify by ${by}: ${fracText(raw)} = ${fracText(result)}`);
  if (isImproper(result)) out.push(de ? `Als gemischte Zahl: ${fracText(result)} = ${mixedText(result)}` : `As a mixed number: ${fracText(result)} = ${mixedText(result)}`);
  return out;
}

function timesSteps(w: Extract<Working, { op: "*" }>, lang: Lang): string[] {
  const de = lang === "de";
  const out: string[] = [];
  const [g1, g2] = w.cross;
  if (g1 > 1 || g2 > 1) {
    const pairs = [
      g1 > 1 ? `${w.a.n} ${de ? "und" : "and"} ${w.b.d} ${de ? "durch" : "by"} ${g1}` : "",
      g2 > 1 ? `${w.b.n} ${de ? "und" : "and"} ${w.a.d} ${de ? "durch" : "by"} ${g2}` : "",
    ].filter(Boolean).join(", ");
    out.push(de ? `Kürze über Kreuz, bevor du malnimmst: ${pairs}. Dann steht da ${fracText(w.ca)} · ${fracText(w.cb)}.` : `Cancel across before multiplying: ${pairs}. That leaves ${fracText(w.ca)} × ${fracText(w.cb)}.`);
  }
  out.push(
    de
      ? `Zähler mal Zähler, Nenner mal Nenner: (${w.ca.n} · ${w.cb.n})/(${w.ca.d} · ${w.cb.d}) = ${fracText(w.raw)}`
      : `Top times top, bottom times bottom: (${w.ca.n} × ${w.cb.n})/(${w.ca.d} × ${w.cb.d}) = ${fracText(w.raw)}`,
  );
  return [...out, ...finish(w.raw, w.result, w.by, lang)];
}

/** The whole working for a task, with the child's own numbers. */
export function steps(op: Op, a: Frac, b: Frac, lang: Lang): string[] {
  const de = lang === "de";
  const w = work(op, a, b);
  const out = unmix([a, b], lang);
  if (w.op === "+" || w.op === "-") {
    const verb = de ? (w.op === "+" ? "Addiere" : "Subtrahiere") : w.op === "+" ? "Add" : "Subtract";
    if (a.d === b.d) {
      out.push(de ? `Die Nenner sind gleich (${a.d}). ${verb} nur die Zähler, der Nenner bleibt.` : `The denominators are the same (${a.d}). ${verb} just the numerators; the denominator stays.`);
    } else {
      out.push(
        de ? `Bring beide auf den Hauptnenner: kgV(${a.d}, ${b.d}) = ${w.common}.` : `Bring both to a common denominator: lcm(${a.d}, ${b.d}) = ${w.common}.`,
        de
          ? `Erweitere: ${fracText(a)} = ${fracText(w.ea)} (mit ${w.ka})${w.kb > 1 ? `, ${fracText(b)} = ${fracText(w.eb)} (mit ${w.kb})` : ""}.`
          : `Expand: ${fracText(a)} = ${fracText(w.ea)} (× ${w.ka})${w.kb > 1 ? `, ${fracText(b)} = ${fracText(w.eb)} (× ${w.kb})` : ""}.`,
      );
    }
    out.push(
      de
        ? `${verb} die Zähler, der Nenner bleibt: ${fracText(w.ea)} ${opSign(op, lang)} ${fracText(w.eb)} = (${w.ea.n} ${opSign(op, lang)} ${w.eb.n})/${w.common} = ${fracText(w.raw)}`
        : `${verb} the numerators, the denominator stays: ${fracText(w.ea)} ${opSign(op, lang)} ${fracText(w.eb)} = (${w.ea.n} ${opSign(op, lang)} ${w.eb.n})/${w.common} = ${fracText(w.raw)}`,
      ...finish(w.raw, w.result, w.by, lang),
    );
    return out;
  }
  if (w.op === ":") {
    out.push(
      de
        ? `Durch einen Bruch teilen heißt: mit dem Kehrwert malnehmen. Der Kehrwert von ${fracText(b)} ist ${fracText(w.flipped)}: ${fracText(a)} : ${fracText(b)} = ${fracText(a)} · ${fracText(w.flipped)}`
        : `Dividing by a fraction means multiplying by its reciprocal. The reciprocal of ${fracText(b)} is ${fracText(w.flipped)}: ${fracText(a)} ÷ ${fracText(b)} = ${fracText(a)} × ${fracText(w.flipped)}`,
      ...timesSteps(w.times, lang),
    );
    return out;
  }
  if (w.op === "*") out.push(...timesSteps(w, lang));
  return out;
}

/** The mistake children make most with each kind of task. */
export function trap(op: Op, a: Frac, b: Frac, lang: Lang): string {
  const de = lang === "de";
  switch (op) {
    case "+":
    case "-":
      return de
        ? `Achtung: Nenner werden nie addiert oder subtrahiert! ${fracText(a)} ${opSign(op, lang)} ${fracText(b)} ist nicht (${a.n} ${opSign(op, lang)} ${b.n})/(${a.d} ${opSign(op, lang)} ${b.d}).`
        : `Careful: never add or subtract the denominators! ${fracText(a)} ${opSign(op, lang)} ${fracText(b)} isn't (${a.n} ${opSign(op, lang)} ${b.n})/(${a.d} ${opSign(op, lang)} ${b.d}).`;
    case "*":
      return de ? "Beim Malnehmen brauchst du keinen Hauptnenner: einfach Zähler mal Zähler und Nenner mal Nenner." : "For multiplying you don't need a common denominator: just top times top and bottom times bottom.";
    case ":":
      return de ? "Nicht vergessen: Den Kehrwert nimmst du nur vom zweiten Bruch, dem, durch den du teilst." : "Don't forget: take the reciprocal only of the second fraction, the one you divide by.";
  }
}

// ---------- quiz ----------

export const quizPrompt = (q: CalcQuestion, lang: Lang): string => `${taskText(q.op, q.a, q.b, lang, q.mixed)} = ?`;
export const quizChoice = (f: Frac): string => mixedText(f);
export const quizSteps = (q: CalcQuestion, lang: Lang): string[] => [...steps(q.op, q.a, q.b, lang), trap(q.op, q.a, q.b, lang)];
