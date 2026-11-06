import { ExpressionError } from "./errors";

export type Operator = "+" | "-" | "*" | "/" | "^";

/** One meaningful piece of the input. `pos` is the 0-based index where it starts. */
export type Token =
  | { kind: "number"; value: number; text: string; pos: number }
  | { kind: "name"; name: string; pos: number }
  | { kind: "op"; op: Operator; pos: number }
  | { kind: "("; pos: number }
  | { kind: ")"; pos: number }
  | { kind: "end"; pos: number };

/** Everything people might type for an operator, including what phones and copy-paste produce. */
const OPERATORS: Readonly<Record<string, Operator>> = {
  "+": "+",
  "-": "-", "−": "-", "–": "-",
  "*": "*", "×": "*", "·": "*",
  "/": "/", "÷": "/", ":": "/", // ":" is how German schools write division
  "^": "^",
};

const SUPERSCRIPT_POWERS: Readonly<Record<string, string>> = { "²": "2", "³": "3" };

const NUMBER = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i;
const NAME = /^[a-z][a-z0-9]*/i;

/** Splits "2x^2 + sin(x)" into tokens. Never runs the text, only reads it. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i]!;
    const rest = text.slice(i);

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    const num = NUMBER.exec(rest);
    if (num) {
      tokens.push({ kind: "number", value: Number(num[0]), text: num[0], pos: i });
      i += num[0].length;
      continue;
    }

    const name = NAME.exec(rest);
    if (name) {
      tokens.push({ kind: "name", name: name[0].toLowerCase(), pos: i });
      i += name[0].length;
      continue;
    }

    if (ch === "π") {
      tokens.push({ kind: "name", name: "pi", pos: i });
      i++;
      continue;
    }

    if (rest.startsWith("**")) {
      tokens.push({ kind: "op", op: "^", pos: i });
      i += 2;
      continue;
    }

    const op = OPERATORS[ch];
    if (op) {
      tokens.push({ kind: "op", op, pos: i });
      i++;
      continue;
    }

    const power = SUPERSCRIPT_POWERS[ch];
    if (power) {
      // x² is read as x ^ 2
      tokens.push({ kind: "op", op: "^", pos: i }, { kind: "number", value: Number(power), text: power, pos: i });
      i++;
      continue;
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ kind: ch, pos: i });
      i++;
      continue;
    }

    throw new ExpressionError(`Unexpected "${ch}" at position ${i + 1}`, i, { kind: "unexpectedChar", ch, at: i + 1 });
  }

  tokens.push({ kind: "end", pos: text.length });
  return tokens;
}
