import { compare, dec, toNumber, type Decimal } from "./decimal";
import { evaluate, parse } from "./expression";
import { randomInt, type Random } from "./random";

/**
 * Sachaufgaben: a short story, a question, the numbers you need (and some you don't), the
 * calculation, and an answer sentence. The words live in src/explain/word-problems.ts; here are
 * the numbers and the maths for each kind of story.
 */
export type ProblemLevel = "grundschule" | "sek1";

export const TEMPLATES = {
  change: "grundschule", // pay with a note, get change back
  share: "grundschule", // share fairly
  rows: "grundschule", // rows of chairs, some broken
  practice: "grundschule", // minutes a day, for some days
  fence: "grundschule", // a fence, painted in parts
  bus: "grundschule", // people get off and on
  bakery: "sek1", // several rolls and a drink, change from a note (€ with cents)
  club: "sek1", // members · fee · months
  zoo: "sek1", // children and adults, two prices
  ribbon: "sek1", // a roll of ribbon, pieces cut off (metres with decimals)
} as const satisfies Record<string, ProblemLevel>;
export type TemplateId = keyof typeof TEMPLATES;

export interface WordProblem {
  template: TemplateId;
  level: ProblemLevel;
  /** Every number in the story, by name. Money and lengths may have decimals. */
  n: Record<string, Decimal>;
  /** The names of the numbers needed to answer; the others are there to distract. */
  needed: string[];
  /** The right calculation, written with ·, :, − and a point for decimals: "10 − (3 + 2)". */
  calc: string;
  /** Tempting wrong calculations, each with a different value. */
  wrongCalcs: string[];
  answer: Decimal;
  /** A plausible wrong result (from a wrong calculation), for the answer-sentence step. */
  wrongAnswer: Decimal;
}

const whole = (k: number) => dec(k);
const euros = (cents: number) => dec(cents, 2);
const metres = (cm: number) => dec(cm, 2);
const s = (d: Decimal) => (d.places ? toNumber(d).toFixed(d.places) : String(d.n));

type Made = Omit<WordProblem, "template" | "level">;

const MAKERS: Record<TemplateId, (random: Random) => Made | null> = {
  change(r) {
    const [a, b] = [randomInt(r, 2, 9), randomInt(r, 1, 6)];
    const c = [10, 20][randomInt(r, 0, 1)]!;
    if (a + b >= c) return null;
    const n = { a: whole(a), b: whole(b), c: whole(c), age: whole(randomInt(r, 7, 10)) };
    return { n, needed: ["a", "b", "c"], calc: `${c} − (${a} + ${b})`, wrongCalcs: [`${a} + ${b}`, `${c} − ${a}`, `${c} + ${a} + ${b}`], answer: whole(c - a - b), wrongAnswer: whole(a + b) };
  },
  share(r) {
    const k = randomInt(r, 2, 9);
    const each = randomInt(r, 2, 12);
    const n = { total: whole(k * each), kids: whole(k), minutes: whole(randomInt(r, 2, 6) * 10) };
    return { n, needed: ["total", "kids"], calc: `${k * each} : ${k}`, wrongCalcs: [`${k * each} − ${k}`, `${k * each} · ${k}`, `${k * each} + ${k}`], answer: whole(each), wrongAnswer: whole(k * each - k) };
  },
  rows(r) {
    const [rows, per, broken] = [randomInt(r, 3, 9), randomInt(r, 4, 9), randomInt(r, 2, 7)];
    if (broken >= rows * per) return null;
    const n = { rows: whole(rows), per: whole(per), broken: whole(broken), room: whole(randomInt(r, 1, 4) * 100 + randomInt(r, 1, 20)) };
    return { n, needed: ["rows", "per", "broken"], calc: `${rows} · ${per} − ${broken}`, wrongCalcs: [`${rows} · ${per}`, `${rows} + ${per} − ${broken}`, `${rows} · ${per} + ${broken}`], answer: whole(rows * per - broken), wrongAnswer: whole(rows * per) };
  },
  practice(r) {
    const [minutes, days] = [randomInt(r, 2, 6) * 5, randomInt(r, 3, 7)];
    const n = { minutes: whole(minutes), days: whole(days), age: whole(randomInt(r, 8, 10)) };
    return { n, needed: ["minutes", "days"], calc: `${minutes} · ${days}`, wrongCalcs: [`${minutes} + ${days}`, `${minutes} · ${days} · 60`, `${minutes} : ${days}`].filter((c) => !c.includes(":") || minutes % days === 0), answer: whole(minutes * days), wrongAnswer: whole(minutes + days) };
  },
  fence(r) {
    const length = randomInt(r, 10, 60) * 5;
    const done = randomInt(r, 2, Math.floor(length / 10)) * 5;
    const today = randomInt(r, 2, 12) * 5;
    if (done + today >= length) return null;
    const n = { length: whole(length), done: whole(done), today: whole(today), hours: whole(randomInt(r, 2, 5)) };
    return { n, needed: ["length", "done", "today"], calc: `${length} − ${done} − ${today}`, wrongCalcs: [`${length} − ${done}`, `${done} + ${today}`, `${length} − ${done} + ${today}`], answer: whole(length - done - today), wrongAnswer: whole(length - done) };
  },
  bus(r) {
    const [inBus, off, on] = [randomInt(r, 15, 45), randomInt(r, 3, 12), randomInt(r, 2, 15)];
    if (off >= inBus || off === on) return null;
    const n = { inBus: whole(inBus), off: whole(off), on: whole(on), line: whole(randomInt(r, 1, 30)) };
    return { n, needed: ["inBus", "off", "on"], calc: `${inBus} − ${off} + ${on}`, wrongCalcs: [`${inBus} − ${off} − ${on}`, `${inBus} + ${off} − ${on}`, `${inBus} + ${off} + ${on}`], answer: whole(inBus - off + on), wrongAnswer: whole(inBus - off - on) };
  },
  bakery(r) {
    const k = randomInt(r, 3, 8);
    const roll = randomInt(r, 3, 9) * 5; // cents
    const juice = randomInt(r, 10, 30) * 10;
    const paid = [500, 1000][randomInt(r, 0, 1)]!;
    if (k * roll + juice >= paid) return null;
    const n = { k: whole(k), roll: euros(roll), juice: euros(juice), paid: euros(paid), time: whole(randomInt(r, 7, 9)) };
    const [p, j, z] = [s(n.roll), s(n.juice), s(n.paid)];
    return {
      n, needed: ["k", "roll", "juice", "paid"],
      calc: `${z} − (${k} · ${p} + ${j})`,
      wrongCalcs: [`${k} · ${p} + ${j}`, `${z} − ${k} · ${p}`, `${z} − (${p} + ${j})`],
      answer: euros(paid - k * roll - juice), wrongAnswer: euros(k * roll + juice),
    };
  },
  club(r) {
    const [members, fee, months] = [randomInt(r, 12, 40), randomInt(r, 3, 12), randomInt(r, 2, 6)];
    const n = { members: whole(members), fee: whole(fee), months: whole(months), shirts: whole(randomInt(r, 3, 9) * 100) };
    return {
      n, needed: ["members", "fee", "months"], calc: `${members} · ${fee} · ${months}`,
      wrongCalcs: [`${members} · ${fee}`, `${members} + ${fee} + ${months}`, `${members} · ${fee} + ${months}`],
      answer: whole(members * fee * months), wrongAnswer: whole(members * fee),
    };
  },
  zoo(r) {
    const [kids, adults] = [randomInt(r, 18, 28), randomInt(r, 2, 4)];
    const [pk, pa] = [randomInt(r, 4, 9) * 50, randomInt(r, 10, 20) * 50]; // cents, half-euros
    const n = { kids: whole(kids), adults: whole(adults), pk: euros(pk), pa: euros(pa), km: whole(randomInt(r, 8, 40)) };
    return {
      n, needed: ["kids", "adults", "pk", "pa"],
      calc: `${kids} · ${s(n.pk)} + ${adults} · ${s(n.pa)}`,
      wrongCalcs: [`(${kids} + ${adults}) · ${s(n.pk)}`, `${kids} · ${s(n.pk)}`, `${kids} + ${adults} + ${s(n.pk)} + ${s(n.pa)}`],
      answer: euros(kids * pk + adults * pa), wrongAnswer: euros((kids + adults) * pk),
    };
  },
  ribbon(r) {
    const roll = randomInt(r, 3, 10) * 100; // cm
    const k = randomInt(r, 2, 6);
    const piece = randomInt(r, 5, 40) * 5;
    if (k * piece >= roll) return null;
    const n = { roll: metres(roll), k: whole(k), piece: metres(piece), colour: whole(randomInt(r, 2, 5)) };
    return {
      n, needed: ["roll", "k", "piece"], calc: `${s(n.roll)} − ${k} · ${s(n.piece)}`,
      wrongCalcs: [`${s(n.roll)} − ${s(n.piece)}`, `${k} · ${s(n.piece)}`, `(${s(n.roll)} − ${k}) · ${s(n.piece)}`],
      answer: metres(roll - k * piece), wrongAnswer: metres(roll - piece),
    };
  },
};

/**
 * A story is only used if every choice is clearly different: the right calculation, the wrong ones
 * and the wrong answer all give different values, and none of them goes below zero.
 */
function isClear(made: Made): boolean {
  const values = [made.calc, ...made.wrongCalcs].map((c) => evaluate(parse(c), 0));
  if (values.some((v) => v < 0)) return false;
  for (let a = 0; a < values.length; a++) for (let b = a + 1; b < values.length; b++) if (Math.abs(values[a]! - values[b]!) < 1e-9) return false;
  return compare(made.answer, made.wrongAnswer) !== 0 && made.answer.n > 0;
}

export function makeProblem(template: TemplateId, random: Random): WordProblem {
  for (;;) {
    let made: Made | null = null;
    try {
      made = MAKERS[template](random);
    } catch {
      made = null; // a wrong answer below zero: try other numbers
    }
    if (made && isClear(made)) return { template, level: TEMPLATES[template], ...made };
  }
}

export const templatesFor = (level: ProblemLevel): TemplateId[] =>
  (Object.keys(TEMPLATES) as TemplateId[]).filter((id) => TEMPLATES[id] === level);

/** Five problems for a level, all different kinds. */
export function makeProblemRound(level: ProblemLevel, random: Random, size = 5): WordProblem[] {
  const ids = templatesFor(level);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return Array.from({ length: size }, (_, i) => makeProblem(ids[i % ids.length]!, random));
}

/** The numbers the child ticked, compared with the ones needed (order doesn't matter). */
export function checkNumbers(problem: WordProblem, picked: readonly string[]): { missing: string[]; extra: string[]; ok: boolean } {
  const want = new Set(problem.needed);
  const got = new Set(picked);
  const missing = problem.needed.filter((k) => !got.has(k));
  const extra = [...got].filter((k) => !want.has(k));
  return { missing, extra, ok: missing.length === 0 && extra.length === 0 };
}
