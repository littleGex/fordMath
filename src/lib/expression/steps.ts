import { randomInt, type Random } from "../random";
import type { Expr } from "./ast";
import { evaluate } from "./evaluate";
import { parse } from "./parse";
import type { Operator } from "./tokenize";

/**
 * Working out an expression one operation at a time, by the school rules:
 *   1. Klammern zuerst (brackets first, innermost first)
 *   2. Punkt vor Strich (· and : before + and −)
 *   3. Von links nach rechts (left to right)
 *
 * A node is addressed by its path from the root: "" is the root, "L" its left child, "LR" … .
 */

type Binary = Extract<Expr, { type: "binary" }>;
type Step = "L" | "R";

/** Higher goes first: powers, then · and :, then + and −. */
export const opClass = (op: Operator): number => (op === "^" ? 3 : op === "*" || op === "/" ? 2 : 1);

export function getAt(e: Expr, path: string): Expr {
  let node = e;
  for (const s of path as Iterable<Step>) {
    if (node.type !== "binary") throw new Error(`No node at ${path}`);
    node = s === "L" ? node.left : node.right;
  }
  return node;
}

/** A new tree with the node at `path` replaced (the original isn't changed). */
function replaceAt(e: Expr, path: string, replacement: Expr): Expr {
  if (path === "") return replacement;
  if (e.type !== "binary") throw new Error(`No node at ${path}`);
  const [first, rest] = [path[0] as Step, path.slice(1)];
  return first === "L" ? { ...e, left: replaceAt(e.left, rest, replacement) } : { ...e, right: replaceAt(e.right, rest, replacement) };
}

/** Every operation node, with its path. */
function operations(e: Expr, path = ""): Array<{ path: string; node: Binary }> {
  if (e.type !== "binary") return [];
  return [...operations(e.left, `${path}L`), { path, node: e }, ...operations(e.right, `${path}R`)];
}

/** How many brackets surround the node (its own included). */
function bracketDepth(e: Expr, path: string): number {
  let depth = 0;
  let node = e;
  for (let i = 0; i <= path.length; i++) {
    if (node.type === "binary" && node.paren) depth++;
    if (i === path.length || node.type !== "binary") break;
    node = path[i] === "L" ? node.left : node.right;
  }
  return depth;
}

/** Operations whose two sides are already plain numbers: any of these can be worked out now. */
export function readyPaths(e: Expr): string[] {
  return operations(e)
    .filter(({ node }) => node.left.type === "num" && node.right.type === "num")
    .map(({ path }) => path);
}

/**
 * The operations the school rules allow next: of the ready ones, those inside the most brackets,
 * then those with · or : rather than + or −. (Left to right inside a chain like 10 − 3 − 2 is
 * already built into the tree: only 10 − 3 is ready.)
 */
export function allowedPaths(e: Expr): string[] {
  const ready = readyPaths(e).map((path) => ({ path, depth: bracketDepth(e, path), cls: opClass((getAt(e, path) as Binary).op) }));
  if (ready.length === 0) return [];
  const maxDepth = Math.max(...ready.map((r) => r.depth));
  const deepest = ready.filter((r) => r.depth === maxDepth);
  const maxCls = Math.max(...deepest.map((r) => r.cls));
  return deepest.filter((r) => r.cls === maxCls).map((r) => r.path);
}

export type Rule = "brackets" | "punkt-vor-strich" | "left-to-right";

/** Why an operation can't be done yet: which rule says something else comes first. null if it's allowed. */
export function whyNot(e: Expr, path: string): Rule | null {
  const allowed = allowedPaths(e);
  if (allowed.includes(path)) return null;
  const tapped = getAt(e, path);
  if (tapped.type !== "binary") throw new Error("Only operations can be tapped");
  const first = allowed[0]!;
  if (bracketDepth(e, first) > bracketDepth(e, path)) return "brackets";
  if (opClass((getAt(e, first) as Binary).op) > opClass(tapped.op)) return "punkt-vor-strich";
  return "left-to-right";
}

/** Works out one operation and puts its value in its place: 3 + 4 · 2 → 3 + 8. */
export function collapse(e: Expr, path: string): Expr {
  const node = getAt(e, path);
  return replaceAt(e, path, { type: "num", value: evaluate(node, 0) });
}

// ---------- showing it the school way ----------

export type SchoolToken =
  | { kind: "num"; text: string }
  | { kind: "op"; text: string; path: string }
  | { kind: "paren"; text: "(" | ")" };

const OP_TEXT: Record<Operator, string> = { "+": "+", "-": "−", "*": "·", "/": ":", "^": "^" };

/** The expression as tokens, with brackets where the child wrote them; each operator knows its node. */
export function toTokens(e: Expr, path = ""): SchoolToken[] {
  if (e.type === "num") return [{ kind: "num", text: String(e.value) }];
  if (e.type !== "binary") throw new Error("The trainer only uses numbers and operations");
  const inner = [...toTokens(e.left, `${path}L`), { kind: "op" as const, text: OP_TEXT[e.op], path }, ...toTokens(e.right, `${path}R`)];
  return e.paren ? [{ kind: "paren", text: "(" }, ...inner, { kind: "paren", text: ")" }] : inner;
}

export const schoolText = (e: Expr): string => toTokens(e).map((t) => t.text).join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");

/** Every step of the working, in an allowed order: ["3 + 4 · 2", "3 + 8", "11"]. */
export function workedLines(e: Expr): string[] {
  const lines = [schoolText(e)];
  let now = e;
  while (now.type === "binary") {
    now = collapse(now, allowedPaths(now)[0]!);
    lines.push(schoolText(now));
  }
  return lines;
}

// ---------- tasks ----------

export type OrderLevel = 1 | 2 | 3 | 4;

/** a, b, c, d are filled with numbers; the rest is the shape of the sum. */
const TEMPLATES: Record<OrderLevel, string[]> = {
  1: ["a + b · c", "a · b + c", "a − b · c", "a + b : c", "a : b − c", "a · b − c", "a − b : c", "a : b + c"],
  2: ["(a + b) · c", "a · (b + c)", "(a − b) · c", "(a + b) : c", "a · (b − c)", "a − (b + c)", "(a − b) : c", "a + (b − c) · d"],
  3: ["a + b · c − d", "a − b : c + d", "a · b + c · d", "a · b − c : d", "a + b − c · d", "a : b + c · d", "a − b − c", "a : b · c"],
  4: ["a · (b + c) − d", "(a + b) · (c − d)", "a + (b − c) · d", "(a · b − c) : d", "a − (b + c · d)", "a · (b + c · d)", "(a + b · c) : d", "a − (b − c) · d"],
};

/**
 * Checks a task fits class 5: every step is a whole number from 0 to `max`, divisions come out
 * exactly, and multiplications stay near the times tables.
 */
function fitsClass5(e: Expr, max: number): boolean {
  const value = (x: Expr) => (x.type === "num" ? x.value : NaN);
  let now = e;
  while (now.type === "binary") {
    const path = allowedPaths(now)[0]!;
    const node = getAt(now, path) as Binary; // allowed paths always point at operations
    const l = value(node.left);
    const r = value(node.right);
    if (node.op === "/" && (r < 2 || l % r !== 0 || l / r > 12)) return false;
    if (node.op === "*" && (Math.min(l, r) > 10 || Math.max(l, r) > 25)) return false;
    now = collapse(now, path);
    const result = value(getAt(now, path));
    if (!Number.isInteger(result) || result < 0 || result > max) return false;
  }
  return true;
}

export function makeOrderTask(level: OrderLevel, random: Random): Expr {
  const max = level === 4 ? 500 : 200;
  for (;;) {
    const template = TEMPLATES[level][randomInt(random, 0, TEMPLATES[level].length - 1)]!;
    const text = template.replace(/[abcd]/g, () => String(randomInt(random, 2, level >= 3 ? 30 : 20)));
    const e = parse(text);
    if (fitsClass5(e, max)) return e;
  }
}

// ---------- "put in brackets so it makes …" ----------

export interface BracketTask {
  numbers: number[];
  ops: Operator[];
  target: number;
  options: string[]; // each a different bracketing, written with only the brackets it needs
  values: number[];
  answer: number;
}

/** All ways to bracket n1 o1 n2 o2 n3 … (every binary tree over the same numbers and operators). */
function bracketings(numbers: number[], ops: Operator[]): Expr[] {
  if (numbers.length === 1) return [{ type: "num", value: numbers[0]! }];
  const trees: Expr[] = [];
  for (let i = 1; i < numbers.length; i++) {
    for (const left of bracketings(numbers.slice(0, i), ops.slice(0, i - 1))) {
      for (const right of bracketings(numbers.slice(i), ops.slice(i))) {
        trees.push({ type: "binary", op: ops[i - 1]!, left, right });
      }
    }
  }
  return trees;
}

/** Adds brackets only where the tree needs them to mean what it means. */
function withNeededBrackets(e: Expr): Expr {
  if (e.type !== "binary") return e;
  const left = withNeededBrackets(e.left);
  const right = withNeededBrackets(e.right);
  const needs = (child: Expr, side: Step) =>
    child.type === "binary" &&
    (opClass(child.op) < opClass(e.op) || (side === "R" && opClass(child.op) === opClass(e.op)));
  return {
    ...e,
    left: left.type === "binary" && needs(left, "L") ? { ...left, paren: true } : left,
    right: right.type === "binary" && needs(right, "R") ? { ...right, paren: true } : right,
  };
}

/** Every step of the working (every part of the tree) is a number above 0. */
function staysPositive(e: Expr): boolean {
  return e.type !== "binary" || (staysPositive(e.left) && staysPositive(e.right) && evaluate(e, 0) > 0);
}

export function makeBracketTask(random: Random): BracketTask {
  for (;;) {
    const count = random() < 0.5 ? 3 : 4;
    const numbers = Array.from({ length: count }, () => randomInt(random, 2, 9));
    const ops = Array.from({ length: count - 1 }, () => (["+", "-", "*"] as const)[randomInt(random, 0, 2)]!);
    if (!ops.includes("*") || !(ops.includes("+") || ops.includes("-"))) continue;
    const seen = new Map<number, string>();
    for (const tree of bracketings(numbers, ops)) {
      if (!staysPositive(tree)) continue; // no negative numbers in class 5, not even half-way
      const v = evaluate(tree, 0);
      if (!seen.has(v)) seen.set(v, schoolText(withNeededBrackets(tree)));
    }
    // The target always needs brackets: the sum read without them must give something else.
    const plain = evaluate(parse(numbers.map((n, i) => (i === 0 ? `${n}` : `${ops[i - 1]} ${n}`)).join(" ")), 0);
    const entries = [...seen].filter(([v]) => v !== plain).slice(0, 3);
    if (seen.has(plain)) entries.splice(randomInt(random, 0, entries.length), 0, [plain, seen.get(plain)!]);
    if (entries.length < 2) continue; // a puzzle needs something to choose between
    const withBrackets = entries.map((_, i) => i).filter((i) => entries[i]![0] !== plain);
    const pickIndex = withBrackets[randomInt(random, 0, withBrackets.length - 1)]!;
    return {
      numbers, ops,
      target: entries[pickIndex]![0],
      options: entries.map(([, t]) => t),
      values: entries.map(([v]) => v),
      answer: pickIndex,
    };
  }
}
