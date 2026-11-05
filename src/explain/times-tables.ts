import { answerOf, strategyFor, type Question } from "../lib/times-tables";
import type { ExplainSection } from "./types";

export type Lang = "de" | "en";

/**
 * All wording in one place per language. `satisfies Record<Lang, Words>` makes the
 * compiler check that German and English have exactly the same keys, so a
 * sentence can't be forgotten in one language.
 */
type Words = {
  howTitle: string;
  relatedTitle: string;
  rows: (a: number, b: number) => string;
  countIn: (b: number, steps: string) => string;
  one: (b: number) => string;
  two: (b: number, c: number) => string;
  five: (b: number, ten: number, c: number) => string;
  ten: (b: number, c: number) => string;
  plus: (a: number, b: number, f: number, s: number, x: number, y: number, c: number) => string;
  double: (a: number, b: number, h: number, x: number, c: number) => string;
  minus: (a: number, b: number, from: number, take: number, x: number, y: number, c: number) => string;
  swap: (a: number, b: number, c: number) => string;
  asks: (p: number, d: number) => string;
  think: (d: number, k: number, p: number) => string;
  so: (p: number, d: number, k: number) => string;
};

const WORDS = {
  de: {
    howTitle: "So rechnest du",
    relatedTitle: "Passende Aufgaben",
    rows: (a, b) => `${a} · ${b} heißt: ${a} Reihen mit je ${b} Punkten.`,
    countIn: (b, steps) => `Zähle in ${b}er-Schritten: ${steps}`,
    one: (b) => `1 · ${b} ist einfach ${b}.`,
    two: (b, c) => `2 · ${b} ist das Doppelte von ${b}: ${b} + ${b} = ${c}`,
    five: (b, ten, c) => `5 · ${b} ist die Hälfte von 10 · ${b}: ${ten} : 2 = ${c}`,
    ten: (b, c) => `10 · ${b}: hänge eine 0 an die ${b}: ${c}`,
    plus: (a, b, f, s, x, y, c) => `Nimm Aufgaben, die du kennst: ${a} · ${b} = ${f} · ${b} + ${s} · ${b} = ${x} + ${y} = ${c}`,
    double: (a, b, h, x, c) => `${a} · ${b} ist das Doppelte von ${h} · ${b}: ${x} + ${x} = ${c}`,
    minus: (a, b, from, take, x, y, c) => `Rechne von 10 aus zurück: ${a} · ${b} = ${from} · ${b} − ${take} · ${b} = ${x} − ${y} = ${c}`,
    swap: (a, b, c) => `${a} · ${b} = ${c} (Tauschaufgabe: gleiches Ergebnis)`,
    asks: (p, d) => `${p} : ${d} fragt: Wie oft passt die ${d} in die ${p}?`,
    think: (d, k, p) => `Denk an die ${d}er-Reihe: ${k} · ${d} = ${p}`,
    so: (p, d, k) => `Also ist ${p} : ${d} = ${k}`,
  },
  en: {
    howTitle: "How to work it out",
    relatedTitle: "Related facts",
    rows: (a, b) => `${a} · ${b} means ${a} rows of ${b} dots.`,
    countIn: (b, steps) => `Count in ${b}s: ${steps}`,
    one: (b) => `1 · ${b} is just ${b}.`,
    two: (b, c) => `2 · ${b} is double ${b}: ${b} + ${b} = ${c}`,
    five: (b, ten, c) => `5 · ${b} is half of 10 · ${b}: ${ten} : 2 = ${c}`,
    ten: (b, c) => `10 · ${b}: put a 0 on the end of ${b}: ${c}`,
    plus: (a, b, f, s, x, y, c) => `Use facts you know: ${a} · ${b} = ${f} · ${b} + ${s} · ${b} = ${x} + ${y} = ${c}`,
    double: (a, b, h, x, c) => `${a} · ${b} is double ${h} · ${b}: ${x} + ${x} = ${c}`,
    minus: (a, b, from, take, x, y, c) => `Count back from 10: ${a} · ${b} = ${from} · ${b} − ${take} · ${b} = ${x} − ${y} = ${c}`,
    swap: (a, b, c) => `${a} · ${b} = ${c} (swapped round: same answer)`,
    asks: (p, d) => `${p} : ${d} asks: how many ${d}s make ${p}?`,
    think: (d, k, p) => `Think of the ${d} times table: ${k} · ${d} = ${p}`,
    so: (p, d, k) => `So ${p} : ${d} = ${k}`,
  },
} satisfies Record<Lang, Words>;

/** The best way to work out a · b, using the Kernaufgaben (1·, 2·, 5·, 10·). */
function strategyStep(a: number, b: number, w: Words): string {
  const c = a * b;
  const s = strategyFor(a);
  switch (s.kind) {
    case "plus":
      return w.plus(a, b, s.first, s.second, s.first * b, s.second * b, c);
    case "double":
      return w.double(a, b, s.half, s.half * b, c);
    case "minus":
      return w.minus(a, b, s.from, s.take, s.from * b, s.take * b, c);
    case "core":
      if (a === 1) return w.one(b);
      if (a === 2) return w.two(b, c);
      if (a === 5) return w.five(b, 10 * b, c);
      return w.ten(b, c);
  }
}

function multiplyHow(a: number, b: number, w: Words): string[] {
  const steps = [w.rows(a, b), strategyStep(a, b, w)];
  if (a > 1 && a <= 6) {
    steps.push(w.countIn(b, Array.from({ length: a }, (_, i) => (i + 1) * b).join(", ")));
  }
  return steps;
}

/** All the facts from the same "family": a · b, b · a, c : a, c : b (without repeats). */
export function relatedFacts(a: number, b: number): string[] {
  const c = a * b;
  return [...new Set([`${a} · ${b} = ${c}`, `${b} · ${a} = ${c}`, `${c} : ${a} = ${b}`, `${c} : ${b} = ${a}`])];
}

/** Help after a wrong answer, in the child's language. */
export function explainQuestion(q: Question, lang: Lang): ExplainSection[] {
  const w: Words = WORDS[lang];
  if (q.kind === "multiply") {
    const c = answerOf(q);
    const related = relatedFacts(q.a, q.b).filter((f) => f !== `${q.a} · ${q.b} = ${c}`);
    if (q.a !== q.b) related[0] = w.swap(q.b, q.a, c);
    return [
      { title: w.howTitle, steps: multiplyHow(q.a, q.b, w) },
      { title: w.relatedTitle, steps: related },
    ];
  }
  const k = answerOf(q);
  return [
    { title: w.howTitle, steps: [w.asks(q.product, q.divisor), w.think(q.divisor, k, q.product), w.so(q.product, q.divisor, k)] },
    { title: w.relatedTitle, steps: relatedFacts(k, q.divisor).filter((f) => f !== `${q.product} : ${q.divisor} = ${k}`) },
  ];
}
