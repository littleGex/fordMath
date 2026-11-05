import { digitsOf, type AddSum, type DivideSum, type MultiplySum, type SubtractSum, type WrittenSum } from "../lib/written";

/**
 * Builds the exercise-book layout for a written sum after `done` small steps.
 * Returns plain data (which text goes in which grid cell) so the page only has to draw it.
 */
export interface CellSpec {
  r: number;
  c: number;
  text: string;
  cls: Set<string>;
  span?: number;
}
export interface Board {
  cols: number;
  cells: CellSpec[];
}
export type BoardMode = "show" | "try";

/** A grid of cells addressed by (row, column); later writes to a cell add to it. */
class Grid {
  private cells = new Map<string, CellSpec>();

  put(r: number, c: number, text: string, ...cls: string[]): CellSpec {
    const key = `${r},${c}`;
    const cell = this.cells.get(key) ?? { r, c, text: "", cls: new Set<string>() };
    if (text !== "") cell.text = text;
    cls.filter(Boolean).forEach((x) => cell.cls.add(x));
    this.cells.set(key, cell);
    return cell;
  }

  mark(r: number, c: number, cls: string): void {
    this.cells.get(`${r},${c}`)?.cls.add(cls);
  }

  done(cols: number): Board {
    return { cols, cells: [...this.cells.values()] };
  }
}

/** The step being shown: just finished (show me) or waiting for the child (my turn). */
const currentStep = (done: number, mode: BoardMode) => (mode === "try" ? done : done - 1);

export function buildBoard(sum: WrittenSum, done: number, mode: BoardMode): Board {
  switch (sum.kind) {
    case "add":
    case "complement":
    case "borrow":
      return columnBoard(sum, done, mode);
    case "multiply":
      return multiplyBoard(sum, done, mode);
    case "divide":
      return divideBoard(sum, done, mode);
  }
}

// ---------- + and − ----------

function columnBoard(sum: AddSum | SubtractSum, done: number, mode: BoardMode): Board {
  const g = new Grid();
  const W = sum.steps.length;
  const X = (column: number) => W - column; // grid column; 0 is for the sign
  const now = currentStep(done, mode);
  const hl = (column: number) => (column === now ? "now" : "");
  let r = 0;

  const exchanged = new Map<number, number>();
  if (sum.kind === "borrow") {
    sum.steps.forEach((step, i) => {
      if (i >= done) return;
      for (const e of step.exchanges) exchanged.set(e.column, e.to);
      if (step.exchanges.length) exchanged.set(step.column, step.topAfter);
    });
    for (let c = 0; c < W; c++) g.put(r, X(c), exchanged.has(c) ? String(exchanged.get(c)) : "", "exch", hl(c));
    r++;
  }

  sum.numbers.forEach((n, i) => {
    const digits = digitsOf(n);
    if (i === sum.numbers.length - 1) g.put(r, 0, sum.kind === "add" ? "+" : "−", "sign");
    for (let c = 0; c < W; c++) {
      g.put(r, X(c), digits[c] !== undefined ? String(digits[c]) : "", hl(c), i === 0 && exchanged.has(c) ? "struck" : "");
    }
    r++;
  });

  if (sum.kind !== "borrow") {
    for (let c = 0; c < W; c++) {
      const carry = c > 0 && c - 1 < done ? sum.steps[c - 1]!.carryOut : 0;
      g.put(r, X(c), carry ? String(carry) : "", "small", hl(c));
    }
    r++;
  }

  g.put(r, 0, "", "result");
  sum.steps.forEach((step, c) => {
    const blank = "leadingZero" in step && step.leadingZero;
    const asking = c === done && mode === "try";
    const text = c < done ? (blank ? "" : String(step.write)) : asking ? "?" : "";
    g.put(r, X(c), text, "result", hl(c), asking ? "ask" : "");
  });
  return g.done(W + 1);
}

// ---------- · (German layout: a · b on one line, then one line per digit of b) ----------

function multiplyBoard(sum: MultiplySum, done: number, mode: BoardMode): Board {
  const g = new Grid();
  const [a, b] = sum.numbers;
  const A = String(a);
  const B = String(b);
  const R = A.length + B.length; // grid column of b's last digit, where everything lines up
  const now = currentStep(done, mode);

  // Header: a · b, underlined.
  [...A].forEach((d, i) => g.put(0, i, d, "hline"));
  g.put(0, A.length, "·", "hline", "sign");
  [...B].forEach((d, i) => g.put(0, A.length + 1 + i, d, "hline"));

  // One line per digit of b; each written digit is one small step.
  let index = 0;
  sum.rows.forEach((row, i) => {
    const r = 1 + i;
    const end = R - row.shift;
    row.steps.forEach((step, j) => {
      const col = end - j;
      if (index < done) g.put(r, col, String(step.write), sum.addition ? "" : "res-text");
      if (index === now) {
        g.put(r, col, mode === "try" ? "?" : "", "now", mode === "try" ? "ask" : "");
        g.mark(0, A.length + 1 + i, "now"); // the digit of b we're multiplying by
        if (step.kind === "digit") g.mark(0, A.length - 1 - j, "now"); // and the digit of a
      }
      index++;
    });
  });

  // Add the lines up: small carries, a line, the answer.
  if (sum.addition) {
    const addStart = index; // small-step number of the first addition column
    const carryRow = 1 + sum.rows.length;
    const answerRow = carryRow + 1;
    for (let col = 0; col <= R; col++) g.put(answerRow, col, "", "result");
    sum.addition.forEach((step, c) => {
      const col = R - c;
      const k = addStart + c;
      const prev = sum.addition![c - 1];
      if (prev && prev.carryOut > 0 && k - 1 < done) g.put(carryRow, col, String(prev.carryOut), "small");
      if (k < done) g.put(answerRow, col, String(step.write), "result");
      if (k === now) {
        g.put(answerRow, col, mode === "try" ? "?" : "", "now", mode === "try" ? "ask" : "");
        sum.rows.forEach((_, i) => g.mark(1 + i, col, "now"));
      }
    });
  }
  return g.done(R + 1);
}

// ---------- : (German layout: 285 : 6 = 47 Rest 3, working underneath) ----------

function divideBoard(sum: DivideSum, done: number, mode: BoardMode): Board {
  const g = new Grid();
  const [n, d] = sum.numbers;
  const N = String(n);
  const D = String(d);
  const now = currentStep(done, mode);

  const colColon = N.length + 1;
  const colD = colColon + 1;
  const colEq = colD + D.length;
  const colQ = colEq + 1;
  const colRest = colQ + sum.steps.length;
  const colRem = colRest + 2;
  const rem = String(sum.remainder);

  // Which small step is which: per round A (divide), B (multiply + subtract), C (bring down); then the Rest.
  const base: number[] = [];
  let k = 0;
  for (const s of sum.steps) {
    base.push(k);
    k += s.bringDown === null ? 2 : 3;
  }
  const finalStep = k;

  // Top line: dividend : divisor = quotient Rest r
  [...N].forEach((digit, i) => g.put(0, 1 + i, digit));
  g.put(0, colColon, ":", "sign");
  [...D].forEach((digit, i) => g.put(0, colD + i, digit));
  g.put(0, colEq, "=", "sign");
  sum.steps.forEach((s, i) => {
    const asking = mode === "try" && now === base[i];
    const text = done > base[i]! ? String(s.qDigit) : asking ? "?" : "";
    g.put(0, colQ + i, text, "quot", now === base[i] ? "now" : "", asking ? "ask" : "");
  });
  if (done > finalStep && sum.remainder > 0) {
    g.put(0, colRest, "R", "word", now === finalStep ? "now" : "").span = 2;
    [...rem].forEach((digit, i) => g.put(0, colRem + i, digit, "quot", now === finalStep ? "now" : ""));
  }

  // Working underneath, two rows per round.
  sum.steps.forEach((s, i) => {
    const end = 1 + s.partEnd; // grid column the part, product and remainder end in
    const partRow = i === 0 ? 0 : 2 * i;
    const productRow = 1 + 2 * i;
    const restRow = 2 + 2 * i;
    const A = base[i]!;

    if (now === A || now === A + 1) {
      for (let x = 0; x < s.shown.length; x++) g.mark(partRow, end - x, "now");
    }
    if (done > A + 1) {
      const P = String(s.product);
      [...P].forEach((digit, x) => g.put(productRow, end - (P.length - 1 - x), digit, "uline", now === A + 1 ? "now" : ""));
      g.put(productRow, end - P.length, "−", "uline", "sign");
      const R = String(s.remainder);
      [...R].forEach((digit, x) => g.put(restRow, end - (R.length - 1 - x), digit, now === A + 1 || (now === finalStep && i === sum.steps.length - 1) ? "now" : ""));
    }
    if (s.bringDown !== null && done > A + 2) {
      g.put(restRow, end + 1, String(s.bringDown), "down", now === A + 2 ? "now" : "");
      if (now === A + 2) g.mark(0, end + 1, "now");
    }
  });

  return g.done(colRem + rem.length);
}
