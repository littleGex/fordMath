import {
  coef, isEmpty, other, solveSystem, type Equation, type SystemSolution, type Var,
} from "../lib/linear-system";
import {
  abs, add, div, isFiniteDecimal, isInteger, isZero, mul, neg, rat, sign, sub, toNumber, ZERO, type Rational,
} from "../lib/rational";
import type { Lang } from "./lang";

/**
 * The three school methods for two equations (Klasse 8), written the way they look in the
 * exercise book: one equation per line, with the operation for the next line on the right
 * ("| − 2x", "| : 3").
 */

export interface WorkLine {
  tag?: string; // "(I)", "(II)", "(I')"
  math: string;
  op?: string; // what is done to get the next line
}
export interface WorkStep {
  say: string;
  lines: WorkLine[];
}
export type Method = "gleich" | "einsetz" | "addition" | "graph";
export const METHODS: readonly Method[] = ["gleich", "einsetz", "addition", "graph"];
export type MethodWork = { ok: true; steps: WorkStep[] } | { ok: false; why: string };

const TAG = { 1: "(I)", 2: "(II)" } as const;
type Index = 1 | 2;

// ---------- writing numbers and terms ----------

/** 3, −4, 7/5, −2/3 (a real minus sign, as in the book). */
export function num(q: Rational): string {
  const t = q.d === 1 ? String(Math.abs(q.n)) : `${Math.abs(q.n)}/${q.d}`;
  return q.n < 0 ? `−${t}` : t;
}
/** In brackets when needed inside a product: 3·(−1), 2·(7/5). */
const numP = (q: Rational): string => (q.n < 0 || q.d !== 1 ? `(${num(q)})` : num(q));

/** "x", "−x", "3x", "−2/3·x" */
function termText(c: Rational, v: string): string {
  if (c.n === c.d) return v;
  if (c.n === -c.d) return `−${v}`;
  return c.d === 1 ? `${num(c)}${v}` : `${num(c)}·${v}`;
}

/** Joins terms with the right signs: [[2,"x"],[−3,"y"]] and 4 → "2x − 3y + 4"; nothing → "0". */
export function linear(terms: ReadonlyArray<readonly [Rational, string]>, constant: Rational = ZERO): string {
  const parts: string[] = [];
  for (const [c, v] of terms) if (!isZero(c)) parts.push(termText(c, v));
  if (!isZero(constant)) parts.push(num(constant));
  if (parts.length === 0) return "0";
  return parts.map((p, i) => (i === 0 ? p : p.startsWith("−") ? `− ${p.slice(1)}` : `+ ${p}`)).join(" ");
}

/** "2y", "−2", "+ 3y" → "2y − 2 + 3y" */
const joinSigned = (parts: string[]): string =>
  parts.map((p, i) => (i === 0 ? p : p.startsWith("−") ? `− ${p.slice(1)}` : `+ ${p}`)).join(" ") || "0";

export const equationText = (e: Equation): string => `${linear([[e.a, "x"], [e.b, "y"]])} = ${num(e.c)}`;

/** "| − 3x", "| + 2", "| : 3", "| · (−3/5)" */
const minusOp = (c: Rational, v = ""): string => `| ${sign(c) < 0 ? "+" : "−"} ${termText(abs(c), v) || num(abs(c))}`;
const minusConst = (c: Rational): string => `| ${sign(c) < 0 ? "+" : "−"} ${num(abs(c))}`;
const divideOp = (k: Rational): string => (isInteger(k) ? `| : ${numP(k)}` : `| · ${numP(div(rat(1), k))}`);

// ---------- solving one equation in one variable, line by line ----------

type OneResult = { kind: "value"; value: Rational } | { kind: "true" } | { kind: "false" };

/** k·v + n = m·v + p, solved for v with one operation per line. */
function solveOne(v: string, k: Rational, n: Rational, m: Rational, p: Rational, tag?: string): { lines: WorkLine[]; result: OneResult } {
  const side = (c: Rational, d: Rational) => linear([[c, v]], d);
  const lines: WorkLine[] = [{ tag, math: `${side(k, n)} = ${side(m, p)}` }];
  const step = (op: string, math: string) => {
    lines[lines.length - 1]!.op = op;
    lines.push({ math });
  };
  if (!isZero(m)) {
    step(minusOp(m, v), `${side(sub(k, m), n)} = ${num(p)}`);
    k = sub(k, m);
  }
  if (!isZero(n)) {
    step(minusConst(n), `${side(k, ZERO)} = ${num(sub(p, n))}`);
    p = sub(p, n);
  }
  if (isZero(k)) return { lines, result: isZero(p) ? { kind: "true" } : { kind: "false" } };
  if (!(k.n === 1 && k.d === 1)) step(divideOp(k), `${v} = ${num(div(p, k))}`);
  return { lines, result: { kind: "value", value: div(p, k) } };
}

/** a·v + b·w = c → v = q·w + p, line by line. */
function isolate(e: Equation, v: Var, tag: string): { lines: WorkLine[]; q: Rational; p: Rational } {
  const w = other(v);
  const a = coef(e, v);
  const b = coef(e, w);
  const lines: WorkLine[] = [{ tag, math: equationText(e) }];
  const step = (op: string, math: string) => {
    lines[lines.length - 1]!.op = op;
    lines.push({ math });
  };
  if (!isZero(b)) step(minusOp(b, w), `${termText(a, v)} = ${linear([[neg(b), w]], e.c)}`);
  const q = div(neg(b), a);
  const p = div(e.c, a);
  if (!(a.n === 1 && a.d === 1)) step(divideOp(a), `${v} = ${linear([[q, w]], p)}`);
  lines[lines.length - 1]!.tag = `${tag.slice(0, -1)}')`;
  return { lines, q, p };
}

/** "y = −2/3·2 + 13/3 = 3" */
function backLine(v: Var, q: Rational, wValue: Rational, p: Rational): WorkLine {
  const product = q.n === q.d ? numP(wValue) : `${num(q)}·${numP(wValue)}`;
  const value = add(mul(q, wValue), p);
  const middle = isZero(q) ? num(p) : isZero(p) ? product : `${product} ${sign(p) < 0 ? "−" : "+"} ${num(abs(p))}`;
  return { math: middle === num(value) ? `${v} = ${num(value)}` : `${v} = ${middle} = ${num(value)}` };
}

/** "2x + 3·3 = 13": putting a known value into an equation. */
function insertText(e: Equation, known: Var, value: Rational): string {
  const unknown = other(known);
  const parts: Array<[Var, string]> = [];
  if (!isZero(coef(e, unknown))) parts.push([unknown, termText(coef(e, unknown), unknown)]);
  const k = coef(e, known);
  if (!isZero(k)) parts.push([known, k.n === k.d ? numP(value) : k.n === -k.d ? `−${numP(value)}` : `${num(k)}·${numP(value)}`]);
  parts.sort((s, t) => (s[0] < t[0] ? -1 : 1)); // x before y, as written
  const joined = parts.map(([, t], i) => (i === 0 ? t : t.startsWith("−") ? `− ${t.slice(1)}` : `+ ${t}`)).join(" ");
  return `${joined || "0"} = ${num(e.c)}`;
}

// ---------- the words ----------

const T = {
  de: {
    eq: (i: Index) => TAG[i],
    isolateBoth: (v: Var) => `Löse beide Gleichungen nach ${v} auf.`,
    setEqual: (v: Var, w: Var) => `Die rechten Seiten sind beide gleich ${v}, also sind sie auch gleich groß. Setze sie gleich und löse nach ${w} auf.`,
    putBack: (w: Var, val: string, tag: string) => `Setze ${w} = ${val} in ${tag} ein.`,
    isolateOne: (i: Index, v: Var, easy: boolean) => `Löse ${TAG[i]} nach ${v} auf${easy ? `, denn dort steht ${v} ohne Vorfaktor` : ""}.`,
    substitute: (v: Var, j: Index, w: Var) => `Setze den Term für ${v} in ${TAG[j]} ein. Jetzt kommt nur noch ${w} vor: ausmultiplizieren, zusammenfassen, lösen.`,
    missing: (i: Index, v: Var, w: Var) => `In ${TAG[i]} kommt kein ${v} vor. Löse ${TAG[i]} direkt nach ${w} auf.`,
    multiply: (v: Var, a: string, b: string) => `Multipliziere die Gleichungen so, dass vor ${v} entgegengesetzte Zahlen stehen (${a} und ${b}).`,
    alreadyOpposite: (v: Var, a: string, b: string) => `Vor ${v} stehen schon entgegengesetzte Zahlen (${a} und ${b}).`,
    addUp: (v: Var, w: Var) => `Addiere die beiden Gleichungen: ${v} fällt weg, und es bleibt eine Gleichung nur mit ${w}.`,
    lineForm: "Schreibe beide Gleichungen als Geradengleichung y = mx + n.",
    vertical: (tag: string) => `${tag} enthält kein y: Das ist eine senkrechte Gerade.`,
    slope: (tag: string, m: string, n: string) => `Gerade ${tag}: Sie schneidet die y-Achse bei ${n} und hat die Steigung ${m}.`,
    crossing: (p: string) => `Zeichne beide Geraden. Sie schneiden sich im Punkt S${p}. Ablesen ist nur so genau wie die Zeichnung; bei Brüchen hilft die Rechnung.`,
    parallelLines: "Beide Geraden haben dieselbe Steigung, aber schneiden die y-Achse an verschiedenen Stellen: Sie sind parallel und treffen sich nie.",
    sameLine: "Beide Gleichungen beschreiben dieselbe Gerade: Jeder Punkt auf ihr ist eine Lösung.",
    falseStatement: "Das ist eine falsche Aussage. Das Gleichungssystem hat keine Lösung: Die Geraden sind parallel.",
    trueStatement: "Das ist eine wahre Aussage, egal was man einsetzt. Es gibt unendlich viele Lösungen: Beide Gleichungen beschreiben dieselbe Gerade.",
    check: (x: string, y: string) => `Probe: Setze x = ${x} und y = ${y} in beide Gleichungen ein.`,
    noGleich: "Hier passt das Gleichsetzungsverfahren nicht: Keine Variable kommt in beiden Gleichungen vor. Nimm das Einsetzungsverfahren.",
    empty: (i: Index, c: string, ok: boolean) =>
      `${TAG[i]} enthält weder x noch y: Sie heißt 0 = ${c}. ${ok ? "Das stimmt immer und sagt nichts über x und y." : "Das ist nie wahr, also gibt es keine Lösung."}`,
  },
  en: {
    eq: (i: Index) => TAG[i],
    isolateBoth: (v: Var) => `Rearrange both equations to make ${v} the subject.`,
    setEqual: (v: Var, w: Var) => `Both right-hand sides equal ${v}, so they equal each other. Set them equal and solve for ${w}.`,
    putBack: (w: Var, val: string, tag: string) => `Put ${w} = ${val} into ${tag}.`,
    isolateOne: (i: Index, v: Var, easy: boolean) => `Rearrange ${TAG[i]} to make ${v} the subject${easy ? `, because there ${v} has no number in front` : ""}.`,
    substitute: (v: Var, j: Index, w: Var) => `Substitute that for ${v} in ${TAG[j]}. Now only ${w} is left: expand, collect, solve.`,
    missing: (i: Index, v: Var, w: Var) => `${TAG[i]} has no ${v} in it. Solve ${TAG[i]} for ${w} straight away.`,
    multiply: (v: Var, a: string, b: string) => `Multiply the equations so that ${v} has opposite numbers in front (${a} and ${b}).`,
    alreadyOpposite: (v: Var, a: string, b: string) => `${v} already has opposite numbers in front (${a} and ${b}).`,
    addUp: (v: Var, w: Var) => `Add the two equations: ${v} cancels out, leaving an equation with only ${w}.`,
    lineForm: "Write both equations as straight lines y = mx + c.",
    vertical: (tag: string) => `${tag} has no y: it's a vertical line.`,
    slope: (tag: string, m: string, n: string) => `Line ${tag}: it crosses the y-axis at ${n} and has gradient ${m}.`,
    crossing: (p: string) => `Draw both lines. They cross at the point ${p}. Reading off is only as exact as the drawing; with fractions, the calculation helps.`,
    parallelLines: "Both lines have the same gradient but cross the y-axis in different places: they are parallel and never meet.",
    sameLine: "Both equations describe the same line: every point on it is a solution.",
    falseStatement: "That's false whatever x and y are. The system has no solution: the lines are parallel.",
    trueStatement: "That's true whatever you put in. There are infinitely many solutions: both equations describe the same line.",
    check: (x: string, y: string) => `Check: put x = ${x} and y = ${y} into both equations.`,
    noGleich: "Equating doesn't fit here: no variable appears in both equations. Use substitution instead.",
    empty: (i: Index, c: string, ok: boolean) =>
      `${TAG[i]} has neither x nor y: it says 0 = ${c}. ${ok ? "That's always true and says nothing about x and y." : "That's never true, so there is no solution."}`,
  },
};

const point = (x: Rational, y: Rational) => `(${num(x)} | ${num(y)})`;

/** What to say after reaching 0 = 0 or 0 = 5 instead of a value. */
function verdict(r: OneResult, lang: Lang): WorkStep | null {
  if (r.kind === "value") return null;
  return { say: r.kind === "true" ? T[lang].trueStatement : T[lang].falseStatement, lines: [] };
}

// ---------- the methods ----------

function gleichsetzung(e: [Equation, Equation], lang: Lang): MethodWork {
  const t = T[lang];
  const both = (v: Var) => !isZero(coef(e[0], v)) && !isZero(coef(e[1], v));
  const v: Var | null = both("y") ? "y" : both("x") ? "x" : null;
  if (v === null) return { ok: false, why: t.noGleich };
  const w = other(v);
  const i1 = isolate(e[0], v, TAG[1]);
  const i2 = isolate(e[1], v, TAG[2]);
  const steps: WorkStep[] = [{ say: t.isolateBoth(v), lines: [...i1.lines, ...i2.lines] }];
  const solved = solveOne(w, i1.q, i1.p, i2.q, i2.p);
  steps.push({ say: t.setEqual(v, w), lines: solved.lines });
  const end = verdict(solved.result, lang);
  if (end || solved.result.kind !== "value") return { ok: true, steps: end ? [...steps, end] : steps };
  steps.push({ say: t.putBack(w, num(solved.result.value), "(I')"), lines: [backLine(v, i1.q, solved.result.value, i1.p)] });
  return { ok: true, steps };
}

/** Which equation and variable is easiest to isolate: a coefficient of ±1 first, then y before x. */
function easiestToIsolate(e: [Equation, Equation]): { i: Index; v: Var } {
  const options: Array<{ i: Index; v: Var; score: number }> = [];
  for (const i of [1, 2] as const) {
    for (const v of ["x", "y"] as const) {
      const c = coef(e[i - 1]!, v);
      if (isZero(c)) continue;
      const unit = c.d === 1 && Math.abs(c.n) === 1;
      options.push({ i, v, score: (unit ? 0 : isInteger(c) ? 10 + Math.abs(c.n) : 100) + (c.n < 0 ? 0.5 : 0) });
    }
  }
  options.sort((a, b) => a.score - b.score);
  return options[0]!; // a system with no x and no y anywhere is handled before this
}

function einsetzung(e: [Equation, Equation], lang: Lang): MethodWork {
  const t = T[lang];
  const { i, v } = easiestToIsolate(e);
  const j: Index = i === 1 ? 2 : 1;
  const w = other(v);
  const iso = isolate(e[i - 1]!, v, TAG[i]);
  const c = coef(e[i - 1]!, v);
  const steps: WorkStep[] = [{ say: t.isolateOne(i, v, c.n === c.d), lines: iso.lines }];

  const target = e[j - 1]!;
  const a = coef(target, v);
  const b = coef(target, w);
  const inner = `(${linear([[iso.q, w]], iso.p)})`;
  const vPart = isZero(a) ? "" : a.n === a.d ? inner : a.n === -a.d ? `−${inner}` : `${num(a)}·${inner}`;
  const wPart = isZero(b) ? "" : termText(b, w);
  const ordered = (v === "x" ? [vPart, wPart] : [wPart, vPart]).filter(Boolean);
  const subst = ordered.map((p, k) => (k === 0 ? p : p.startsWith("−") ? `− ${p.slice(1)}` : `+ ${p}`)).join(" ") || "0";
  const solved = solveOne(w, add(mul(a, iso.q), b), mul(a, iso.p), ZERO, target.c);
  // The brackets multiplied out, before collecting: 2·(y − 1) + 3y → 2y − 2 + 3y.
  const expandedParts: Array<[Rational, string]> = [[mul(a, iso.q), w], [mul(a, iso.p), ""], [b, w]];
  const expanded = joinSigned(
    (v === "x" ? expandedParts : [expandedParts[2]!, expandedParts[0]!, expandedParts[1]!])
      .filter(([c]) => !isZero(c))
      .map(([c, name]) => (name ? termText(c, name) : num(c))),
  );
  const substLines: WorkLine[] = [{ tag: TAG[j], math: `${subst} = ${num(target.c)}` }];
  const expandedLine = `${expanded} = ${num(target.c)}`;
  if (!isZero(a) && !(a.n === a.d) && expandedLine !== solved.lines[0]!.math) substLines.push({ math: expandedLine });
  steps.push({ say: t.substitute(v, j, w), lines: [...substLines, ...solved.lines] });
  const end = verdict(solved.result, lang);
  if (end || solved.result.kind !== "value") return { ok: true, steps: end ? [...steps, end] : steps };
  steps.push({ say: t.putBack(w, num(solved.result.value), `${TAG[i].slice(0, -1)}')`), lines: [backLine(v, iso.q, solved.result.value, iso.p)] });
  return { ok: true, steps };
}

/** Multipliers k1, k2 that make k1·p + k2·r = 0, as small as possible. */
function multipliers(p: Rational, r: Rational): [Rational, Rational] {
  if (isInteger(p) && isInteger(r)) {
    const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
    const L = (Math.abs(p.n) * Math.abs(r.n)) / g(Math.abs(p.n), Math.abs(r.n));
    const k1 = L / Math.abs(p.n);
    const k2 = (L / Math.abs(r.n)) * (sign(p) === sign(r) ? -1 : 1);
    // Prefer making the second equation negative: "(II) · (−2)" rather than "(I) · (−1)".
    return [rat(k1), rat(k2)];
  }
  return [r, neg(p)];
}

function addition(e: [Equation, Equation], lang: Lang): MethodWork {
  const t = T[lang];
  // A variable that is missing from one equation is already "eliminated" there.
  for (const i of [1, 2] as const) {
    for (const v of ["x", "y"] as const) {
      if (!isZero(coef(e[i - 1]!, v))) continue;
      const w = other(v);
      const solved = solveOne(w, coef(e[i - 1]!, w), ZERO, ZERO, e[i - 1]!.c, TAG[i]);
      const steps: WorkStep[] = [{ say: t.missing(i, v, w), lines: solved.lines }];
      if (solved.result.kind !== "value") return { ok: true, steps };
      return { ok: true, steps: [...steps, insertStep(e, i === 1 ? 2 : 1, w, solved.result.value, lang)] };
    }
  }
  const cost = (v: Var) => {
    const [k1, k2] = multipliers(coef(e[0], v), coef(e[1], v));
    return toNumber(abs(k1)) + toNumber(abs(k2)) + (isInteger(k1) && isInteger(k2) ? 0 : 100);
  };
  const v: Var = cost("x") <= cost("y") ? "x" : "y";
  const w = other(v);
  const [k1, k2] = multipliers(coef(e[0], v), coef(e[1], v));
  const scaled = (eq: Equation, k: Rational): Equation => ({ a: mul(eq.a, k), b: mul(eq.b, k), c: mul(eq.c, k) });
  const s1 = scaled(e[0], k1);
  const s2 = scaled(e[1], k2);
  const one = (k: Rational) => k.n === 1 && k.d === 1;
  const lines: WorkLine[] = [];
  for (const [i, k, s] of [[1, k1, s1], [2, k2, s2]] as const) {
    if (one(k)) continue;
    lines.push({ tag: TAG[i], math: equationText(e[i - 1]!), op: `| · ${numP(k)}` }, { tag: `${TAG[i].slice(0, -1)}')`, math: equationText(s) });
  }
  const cv1 = termText(coef(s1, v), v);
  const cv2 = termText(coef(s2, v), v);
  const steps: WorkStep[] = [];
  if (lines.length) steps.push({ say: t.multiply(v, cv1, cv2), lines });
  else steps.push({ say: t.alreadyOpposite(v, cv1, cv2), lines: [{ tag: TAG[1], math: equationText(e[0]) }, { tag: TAG[2], math: equationText(e[1]) }] });

  const name = (i: Index, k: Rational) => (one(k) ? TAG[i] : `${TAG[i].slice(0, -1)}')`);
  const sumTag = `${name(1, k1)} + ${name(2, k2)}`;
  const solved = solveOne(w, add(coef(s1, w), coef(s2, w)), ZERO, ZERO, add(s1.c, s2.c), sumTag);
  steps.push({ say: t.addUp(v, w), lines: solved.lines });
  const end = verdict(solved.result, lang);
  if (end || solved.result.kind !== "value") return { ok: true, steps: end ? [...steps, end] : steps };
  steps.push(insertStep(e, 1, w, solved.result.value, lang));
  return { ok: true, steps };
}

/** Put a found value into equation i and solve for the other variable. */
function insertStep(e: [Equation, Equation], i: Index, known: Var, value: Rational, lang: Lang): WorkStep {
  const eqn = e[i - 1]!;
  const unknown = other(known);
  const solved = solveOne(unknown, coef(eqn, unknown), mul(coef(eqn, known), value), ZERO, eqn.c);
  const first: WorkLine = { tag: TAG[i], math: insertText(eqn, known, value) };
  const rest = solved.lines[0]!.math === first.math ? solved.lines.slice(1) : solved.lines;
  if (first.math === solved.lines[0]!.math) first.op = solved.lines[0]!.op;
  return { say: T[lang].putBack(known, num(value), TAG[i]), lines: [first, ...rest] };
}

function graph(e: [Equation, Equation], sol: SystemSolution, lang: Lang): MethodWork {
  const t = T[lang];
  const lines: WorkLine[] = [];
  const notes: string[] = [];
  e.forEach((eqn, k) => {
    const tag = TAG[(k + 1) as Index];
    if (isZero(eqn.b)) {
      lines.push({ tag, math: equationText(eqn) }, { math: `x = ${num(div(eqn.c, eqn.a))}` });
      notes.push(t.vertical(tag));
      return;
    }
    const iso = isolate(eqn, "y", tag);
    lines.push(...iso.lines);
    notes.push(t.slope(tag, num(iso.q), num(iso.p)));
  });
  const steps: WorkStep[] = [{ say: t.lineForm, lines }, ...notes.map((say) => ({ say, lines: [] }))];
  const end =
    sol.kind === "unique" ? t.crossing(point(sol.x, sol.y)) : sol.kind === "none" ? t.parallelLines : t.sameLine;
  steps.push({ say: end, lines: [] });
  return { ok: true, steps };
}

/** The working for one method. Systems with an equation 0 = c are explained once, the same for every method. */
export function methodWork(e1: Equation, e2: Equation, method: Method, lang: Lang): MethodWork {
  const e: [Equation, Equation] = [e1, e2];
  const sol = solveSystem(e1, e2);
  const empties = ([1, 2] as const).filter((i) => isEmpty(e[i - 1]!));
  if (empties.length) {
    return {
      ok: true,
      steps: empties.map((i) => ({ say: T[lang].empty(i, num(e[i - 1]!.c), isZero(e[i - 1]!.c)), lines: [] })),
    };
  }
  switch (method) {
    case "gleich": return gleichsetzung(e, lang);
    case "einsetz": return einsetzung(e, lang);
    case "addition": return addition(e, lang);
    case "graph": return graph(e, sol, lang);
    default: {
      const never: never = method;
      throw new Error(`Unknown method ${String(never)}`);
    }
  }
}

/** The Probe: x and y put back into both equations. Only for a single solution. */
export function checkStep(e1: Equation, e2: Equation, x: Rational, y: Rational, lang: Lang): WorkStep {
  const line = (e: Equation, i: Index): WorkLine => {
    const shown = ([[e.a, x], [e.b, y]] as const).filter(([c]) => !isZero(c));
    // "2·2 + 3·3", "2 − 3", "−5·(−3) − 4·(−6)": the coefficient's sign becomes the joining sign.
    const written = shown.map(([c, val], k) => {
      const size = abs(c);
      const product = size.n === size.d ? numP(val) : `${num(size)}·${numP(val)}`;
      if (k === 0) return sign(c) < 0 ? (size.n === size.d ? `−${numP(val)}` : `−${product}`) : product;
      return `${sign(c) < 0 ? "−" : "+"} ${product}`;
    });
    const values = shown.map(([c, val]) => mul(c, val));
    const total = values.reduce(add, ZERO);
    const chain = [written.join(" ") || "0"];
    if (values.length > 1) chain.push(joinSigned(values.map(num)), num(total));
    else if (chain[0] !== num(total)) chain.push(num(total));
    const ok = total.n === e.c.n && total.d === e.c.d;
    return { tag: TAG[i], math: `${[...new Set(chain)].join(" = ")}${ok ? " ✓" : ` ≠ ${num(e.c)} ✗`}` };
  };
  return { say: T[lang].check(num(x), num(y)), lines: [line(e1, 1), line(e2, 2)] };
}

/** "L = {(2 | 3)}" and a sentence about it. */
export function solutionText(sol: SystemSolution, lang: Lang): { set: string; say: string } {
  const de = lang === "de";
  const dec = (q: Rational) => (isInteger(q) || !isFiniteDecimal(q) ? "" : ` = ${String(toNumber(q)).replace(".", de ? "," : ".").replace("-", "−")}`);
  switch (sol.kind) {
    case "unique":
      return {
        set: `L = {${point(sol.x, sol.y)}}`,
        say: `x = ${num(sol.x)}${dec(sol.x)}, y = ${num(sol.y)}${dec(sol.y)}. ${de ? `Die Geraden schneiden sich im Punkt S${point(sol.x, sol.y)}.` : `The lines cross at ${point(sol.x, sol.y)}.`}`,
      };
    case "none":
      return {
        set: "L = { }",
        say: de
          ? sol.why === "parallel" ? "Keine Lösung: Die Geraden sind parallel." : "Keine Lösung: Eine Gleichung kann nie stimmen."
          : sol.why === "parallel" ? "No solution: the lines are parallel." : "No solution: one equation can never be true.",
      };
    case "infinite":
      return {
        set: de ? "unendlich viele Lösungen" : "infinitely many solutions",
        say: de ? `Jeder Punkt auf der Geraden ${equationText(sol.line)} ist eine Lösung.` : `Every point on the line ${equationText(sol.line)} is a solution.`,
      };
    case "all":
      return { set: de ? "alle Zahlenpaare" : "every pair", say: de ? "Jedes Zahlenpaar (x | y) ist eine Lösung." : "Every pair (x | y) is a solution." };
  }
}
