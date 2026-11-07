import {
  apply, bestOperation, hasBracket, solveAll, valueAt, type LinearEquation, type Operation, type Outcome, type Side, type Verdict,
} from "../lib/linear-equation";
import { abs, div, isInteger, isZero, mul, neg, rat, sign, ONE, type Rational } from "../lib/rational";
import { linear, num } from "./linear-system";
import type { Lang } from "./lang";

/** In brackets when needed inside a product: 3·(−1), 2·(7/5). */
const numP = (q: Rational): string => (q.n < 0 || q.d !== 1 ? `(${num(q)})` : num(q));
const isOne = (q: Rational) => q.n === q.d;

/** Joins "4(x − 1)", "2x", "−3" with the right signs. */
const joinSigned = (parts: string[]): string =>
  parts.map((p, i) => (i === 0 ? p : p.startsWith("−") ? `− ${p.slice(1)}` : `+ ${p}`)).join(" ") || "0";

/** One side as written in the book: "4(x − 1) + 2x", "x/2 + 3" is shown as "1/2·x + 3". */
export function sideText(s: Side): string {
  const parts: string[] = [];
  if (hasBracket(s)) {
    const inner = linear([[s.bx, "x"]], s.bc);
    const k = isOne(s.k) ? "" : s.k.n === -s.k.d ? "−" : s.k.d === 1 ? num(s.k) : `${num(s.k)}·`;
    parts.push(`${k}(${inner})`);
  }
  const rest = linear([[s.x, "x"]], s.c);
  if (rest !== "0") parts.push(rest);
  return joinSigned(parts);
}
export const equationText = (e: LinearEquation): string => `${sideText(e.left)} = ${sideText(e.right)}`;

/** "| − 2x", "| + 3", "| : 3", "| · 2", or "Klammer auflösen" ("| Klammer" when short, beside a line in the book). */
export function opLabel(op: Operation, lang: Lang, short = false): string {
  switch (op.kind) {
    case "expand":
      if (short) return lang === "de" ? "| Klammer" : "| expand";
      return lang === "de" ? "Klammer auflösen" : "Expand the bracket";
    case "add": {
      const [v, unit] = isZero(op.x) ? [op.c, ""] : [op.x, "x"];
      const size = unit ? linear([[abs(v), "x"]]) : num(abs(v));
      return `| ${sign(v) < 0 ? "−" : "+"} ${size}`;
    }
    case "mul": {
      const inv = div(ONE, op.f);
      return isInteger(op.f) || !isInteger(inv) ? `| · ${numP(op.f)}` : `| : ${numP(inv)}`;
    }
  }
}

/** The term a step gets rid of, as it stands in the equation: "+ 2", "2x". */
const signedTerm = (v: Rational, unit: string): string => {
  const t = unit ? linear([[abs(v), unit]]) : num(abs(v));
  return `${sign(v) < 0 ? "−" : "+"} ${t}`;
};

/** What a step does, in a sentence. */
export function opSay(op: Operation, before: LinearEquation, lang: Lang): string {
  const de = lang === "de";
  switch (op.kind) {
    case "expand": {
      const b = hasBracket(before.left) ? before.left : before.right;
      const out = linear([[mul(b.k, b.bx), "x"]], mul(b.k, b.bc));
      const both = hasBracket(before.left) && hasBracket(before.right);
      return de
        ? `Löse die Klammer${both ? "n" : ""} auf: Jedes Glied in der Klammer wird mit ${numP(b.k)} malgenommen, ${num(b.k)}·(${linear([[b.bx, "x"]], b.bc)}) = ${out}. Dann fasse zusammen.`
        : `Expand the bracket${both ? "s" : ""}: everything inside is multiplied by ${numP(b.k)}, ${num(b.k)}·(${linear([[b.bx, "x"]], b.bc)}) = ${out}. Then collect like terms.`;
    }
    case "add":
      if (!isZero(op.x)) {
        return de
          ? `Bring die x-Glieder nach links: Rechne auf beiden Seiten ${opLabel(op, lang).slice(2)}, dann ist ${signedTerm(neg(op.x), "x").replace(/^\+ /, "")} rechts weg.`
          : `Bring the x terms to the left: do ${opLabel(op, lang).slice(2)} on both sides, and ${signedTerm(neg(op.x), "x").replace(/^\+ /, "")} on the right is gone.`;
      }
      return de
        ? `Bring die Zahlen nach rechts: Rechne auf beiden Seiten ${opLabel(op, lang).slice(2)}, dann steht links nur noch das x-Glied.`
        : `Bring the numbers to the right: do ${opLabel(op, lang).slice(2)} on both sides, and only the x term is left on the left.`;
    case "mul": {
      const a = before.left.x;
      if (isInteger(div(ONE, op.f)) && !isInteger(op.f)) {
        const d = numP(div(ONE, op.f));
        return de ? `Teile beide Seiten durch ${d}, dann steht x allein: ${linear([[a, "x"]])} : ${d} = x.` : `Divide both sides by ${d}, and x stands alone: ${linear([[a, "x"]])} ÷ ${d} = x.`;
      }
      return de ? `Nimm beide Seiten mal ${numP(op.f)}, dann steht x allein: ${linear([[a, "x"]])} · ${numP(op.f)} = x.` : `Multiply both sides by ${numP(op.f)}, and x stands alone: ${linear([[a, "x"]])} × ${numP(op.f)} = x.`;
    }
  }
}

/** Why a choice isn't the best next step, with the child's numbers. */
export function verdictText(verdict: Verdict, chosen: Operation, e: LinearEquation, lang: Lang): string {
  const de = lang === "de";
  const best = bestOperation(e)!;
  const bestL = opLabel(best, lang);
  const { left: l, right: r } = e;
  switch (verdict) {
    case "best":
      return de ? "Genau! ⭐" : "Exactly! ⭐";
    case "insideBracket": {
      const b = hasBracket(l) ? l : r;
      return de
        ? `Die ${num(abs(b.bc))} steht in der Klammer und wird noch mit ${numP(b.k)} malgenommen. Darum zuerst: Klammer auflösen.`
        : `The ${num(abs(b.bc))} is inside the bracket and still gets multiplied by ${numP(b.k)}. So first: expand the bracket.`;
    }
    case "bracketFirst":
      return de
        ? "Das darfst du, aber solange die Klammer da ist, kommst du nicht an das x heran. Löse zuerst die Klammer auf."
        : "You may, but while the bracket is there you can't get at the x. Expand the bracket first.";
    case "wrongSign": {
      const term = best.kind === "add" && !isZero(best.x) ? signedTerm(r.x, "x") : signedTerm(l.c, "");
      return de
        ? `Mit ${opLabel(chosen, lang)} wird es nicht weniger, sondern mehr. Um ${term.replace(/^\+ /, "+")} wegzubekommen, rechnest du das Gegenteil: ${bestL}.`
        : `${opLabel(chosen, lang)} makes it more, not less. To get rid of ${term.replace(/^\+ /, "+")}, do the opposite: ${bestL}.`;
    }
    case "divideEarly":
      return de
        ? `Das ist erlaubt, aber dann musst du jedes Glied umrechnen und bekommst schnell Brüche. Sortiere erst: x-Glieder nach links, Zahlen nach rechts. Geteilt wird zum Schluss. Jetzt: ${bestL}.`
        : `That's allowed, but then every term changes and you soon get fractions. Sort first: x terms left, numbers right. Divide at the end. Now: ${bestL}.`;
    case "subtractCoef":
      return de
        ? `${linear([[l.x, "x"]])} heißt ${num(l.x)} · x. Das Gegenteil von · ${numP(l.x)} ist ${bestL.slice(2)}, nicht ${opLabel(chosen, lang).slice(2)}.`
        : `${linear([[l.x, "x"]])} means ${num(l.x)} × x. The opposite of × ${numP(l.x)} is ${bestL.slice(2).replace(":", "÷")}, not ${opLabel(chosen, lang).slice(2)}.`;
    case "multiplyCoef":
      return de
        ? `Dann stünde ${linear([[mul(l.x, l.x), "x"]])} da. Um ${linear([[l.x, "x"]])} zu x zu machen, rechnest du das Gegenteil: ${bestL}.`
        : `That would give ${linear([[mul(l.x, l.x), "x"]])}. To turn ${linear([[l.x, "x"]])} into x, do the opposite: ${bestL}.`;
    case "wrongDivisor":
      return de
        ? `Du willst x allein haben. Teile durch die Zahl vor dem x (${num(l.x)}), nicht durch ${num(r.c)}.`
        : `You want x on its own. Divide by the number in front of x (${num(l.x)}), not by ${num(r.c)}.`;
    case "xGone":
      return de
        ? `Dann ist das x auf beiden Seiten weg, und du kannst es nicht mehr ausrechnen. Links stört nur noch die ${num(abs(l.c))}: ${bestL}.`
        : `Then x is gone from both sides and you can't work it out any more. Only the ${num(abs(l.c))} on the left is in the way: ${bestL}.`;
  }
}

/** The end: "x = 5, L = {5}", "3 = 5 ist falsch: L = { }", "every number". */
export function resultText(e: LinearEquation, o: Outcome, lang: Lang): string {
  const de = lang === "de";
  switch (o.kind) {
    case "value":
      return de ? `Lösung: x = ${num(o.x)}, also L = {${num(o.x)}}` : `Solution: x = ${num(o.x)}, so L = {${num(o.x)}}`;
    case "none":
      return de
        ? `Das x ist weggefallen und ${equationText(e)} ist falsch, egal was x ist. Keine Zahl passt: L = { }`
        : `x has disappeared and ${equationText(e)} is false whatever x is. No number works: L = { }`;
    case "all":
      return de
        ? `Das x ist weggefallen und ${equationText(e)} stimmt immer. Jede Zahl ist eine Lösung: L = ℚ`
        : `x has disappeared and ${equationText(e)} is always true. Every number is a solution: L = ℚ`;
  }
}

/** One side with a number put in for x: "4·(5 − 1) = 16". */
function substitute(s: Side, x: Rational): string {
  const termAt = (c: Rational): string => (isOne(c) ? numP(x) : c.n === -c.d ? `−${numP(x)}` : `${num(c)}·${numP(x)}`);
  const lin = (c: Rational, d: Rational): string[] => [...(isZero(c) ? [] : [termAt(c)]), ...(isZero(d) ? [] : [num(d)])];
  const parts: string[] = [];
  if (hasBracket(s)) {
    const k = isOne(s.k) ? "" : s.k.n === -s.k.d ? "−" : `${num(s.k)}·`;
    parts.push(`${k}(${joinSigned(lin(s.bx, s.bc))})`);
  }
  parts.push(...lin(s.x, s.c));
  const shown = joinSigned(parts);
  const value = num(valueAt(s, x));
  return shown === value ? value : `${shown} = ${value}`;
}

/** Putting the answer back in (Probe). For "every number" it tries x = 1 as an example. */
export function probeText(original: LinearEquation, o: Outcome, lang: Lang): string | null {
  if (o.kind === "none") return null;
  const de = lang === "de";
  const x = o.kind === "value" ? o.x : rat(1);
  const intro = o.kind === "value" ? (de ? `Probe mit x = ${num(x)}` : `Check with x = ${num(x)}`) : de ? "Probe, zum Beispiel mit x = 1" : "Check, for example with x = 1";
  return de
    ? `${intro}: links ${substitute(original.left, x)}, rechts ${substitute(original.right, x)} ✓`
    : `${intro}: left ${substitute(original.left, x)}, right ${substitute(original.right, x)} ✓`;
}

export interface WorkedLine { math: string; op?: string }

/** The whole worked solution, exercise-book style, for "show me" and for the daily mix. */
export function workedSolution(e: LinearEquation, lang: Lang): { lines: WorkedLine[]; result: string; probe: string | null } {
  const s = solveAll(e);
  const lines = s.lines.map((line, i) => ({ math: equationText(line), op: s.ops[i] ? opLabel(s.ops[i]!, lang) : undefined }));
  return { lines, result: resultText(s.lines[s.lines.length - 1]!, s.result, lang), probe: probeText(e, s.result, lang) };
}

/** Steps as plain sentences, for the shared quiz. */
export function workedSteps(e: LinearEquation, lang: Lang): string[] {
  const w = workedSolution(e, lang);
  return [w.lines.map((l) => `${l.math}${l.op ? `   ${l.op}` : ""}`).join("  →  "), w.result, ...(w.probe ? [w.probe] : [])];
}

export { apply };
