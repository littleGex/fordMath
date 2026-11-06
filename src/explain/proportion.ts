import { answer, perOne, product, quotient, STORIES, type Dreisatz, type Kind, type ProportionQuestion, type Relation, type Row, type Story } from "../lib/proportion";
import { isFiniteDecimal, rat, type Rational } from "../lib/rational";
import { num } from "./percent";
import type { Lang } from "./lang";

export { num };
/** Money the shop way: 4,50 € rather than 4,5 €. */
export function money(q: Rational, lang: Lang): string {
  const v = q.n / q.d;
  if (Number.isInteger(v) || !isFiniteDecimal(q) || Math.round(v * 100) !== v * 100) return num(q, lang);
  const s = v.toFixed(2);
  return lang === "de" ? s.replace(".", ",") : s;
}
/** A choice written with a point ("4.5") shown in the right language. */
export const choiceText = (c: string, lang: Lang): string => (lang === "de" ? c.replace(".", ",") : c);

export function relationName(r: Relation, lang: Lang): string {
  const de = { proportional: "proportional", inverse: "antiproportional", neither: "weder noch" };
  const en = { proportional: "proportional", inverse: "inversely proportional", neither: "neither" };
  return (lang === "de" ? de : en)[r];
}
/** The rule of thumb children learn first. */
export function relationRule(r: Kind, lang: Lang): string {
  if (lang === "de") return r === "proportional" ? "je mehr, desto mehr" : "je mehr, desto weniger";
  return r === "proportional" ? "the more, the more" : "the more, the less";
}

/** Why the table is what it is, with its own numbers. */
export function whyRelation(rows: readonly Row[], r: Relation, lang: Lang): string {
  const de = lang === "de";
  const q = num(quotient(rows[0]!), lang);
  const p = num(product(rows[0]!), lang);
  switch (r) {
    case "proportional": return de ? `Jedes y : x ergibt ${q}. Doppelt so viel x gibt doppelt so viel y: y = ${q} · x.` : `Every y : x is ${q}. Twice the x gives twice the y: y = ${q} · x.`;
    case "inverse": return de ? `Jedes x · y ergibt ${p}. Doppelt so viel x gibt halb so viel y: y = ${p} : x.` : `Every x · y is ${p}. Twice the x gives half the y: y = ${p} : x.`;
    case "neither": return de ? "Weder y : x noch x · y ist überall gleich, also weder proportional noch antiproportional." : "Neither y : x nor x · y is the same in every row, so it's neither proportional nor inversely proportional.";
  }
}

/** One line of the Dreisatz, with what's done on each side to get to the next line. */
export interface DreisatzLine { left: string; right: string; opLeft?: string; opRight?: string }

/** From the known line, down to 1, up to what's asked. Inverse: the right side does the opposite. */
export function dreisatzLines(d: Dreisatz, lang: Lang, xUnit = "", yUnit = "", xUnitOne = xUnit): DreisatzLine[] {
  const xu = (v: Rational) => `${num(v, lang)}${xUnit ? ` ${v.n === v.d ? xUnitOne : xUnit}` : ""}`;
  const yu = (v: Rational) => `${yUnit === "€" ? money(v, lang) : num(v, lang)}${yUnit ? ` ${yUnit}` : ""}`;
  const a = num(d.a, lang), c = num(d.c, lang);
  const inv = d.kind === "inverse";
  return [
    { left: xu(d.a), right: yu(d.b), opLeft: `: ${a}`, opRight: inv ? `· ${a}` : `: ${a}` },
    { left: xu(rat(1)), right: yu(perOne(d)), opLeft: `· ${c}`, opRight: inv ? `: ${c}` : `· ${c}` },
    { left: xu(d.c), right: yu(answer(d)) },
  ];
}

export function dreisatzWhy(kind: Kind, lang: Lang): string {
  if (lang === "de") {
    return kind === "proportional"
      ? "Proportional: Was du links rechnest, rechnest du auch rechts. Weniger kaufen heißt weniger zahlen."
      : "Antiproportional: Rechts machst du das Gegenteil. Halb so viele Pumpen brauchen doppelt so lange, also links : und rechts ·.";
  }
  return kind === "proportional"
    ? "Proportional: whatever you do on the left, you do on the right. Buying less means paying less."
    : "Inversely proportional: the right side does the opposite. Half as many pumps take twice as long, so : on the left and · on the right.";
}

export const dreisatzText = (lines: DreisatzLine[]): string => lines.map((l) => `${l.left} ≙ ${l.right}`).join(" → ");

// ---------- stories ----------

interface StoryWords { x: string; one: string; y: string; ask: (a: string, b: string, c: string) => string }
const STORY_WORDS: Record<Lang, Record<Story, StoryWords>> = {
  de: {
    apples: { x: "kg", one: "kg", y: "€", ask: (a, b, c) => `${a} kg Äpfel kosten ${b} €. Wie viel kosten ${c} kg?` },
    pens: { x: "Stifte", one: "Stift", y: "€", ask: (a, b, c) => `${a} Stifte kosten ${b} €. Wie viel kosten ${c} Stifte?` },
    flour: { x: "Personen", one: "Person", y: "g", ask: (a, b, c) => `Für ${a} Personen braucht man ${b} g Mehl. Wie viel Mehl braucht man für ${c} Personen?` },
    car: { x: "Liter", one: "Liter", y: "km", ask: (a, b, c) => `Mit ${a} Litern fährt ein Auto ${b} km. Wie weit kommt es mit ${c} Litern?` },
    pumps: { x: "Pumpen", one: "Pumpe", y: "h", ask: (a, b, c) => `${a} Pumpen leeren ein Becken in ${b} Stunden. Wie lange brauchen ${c} Pumpen?` },
    painters: { x: "Maler", one: "Maler", y: "Tage", ask: (a, b, c) => `${a} Maler streichen eine Schule in ${b} Tagen. Wie lange brauchen ${c} Maler?` },
    prize: { x: "Kinder", one: "Kind", y: "€", ask: (a, b, c) => `Ein Gewinn wird gerecht geteilt: Bei ${a} Kindern bekommt jedes ${b} €. Wie viel bekommt jedes bei ${c} Kindern?` },
    food: { x: "Kinder", one: "Kind", y: "Tage", ask: (a, b, c) => `Der Proviant reicht für ${a} Kinder ${b} Tage. Wie lange reicht er für ${c} Kinder?` },
  },
  en: {
    apples: { x: "kg", one: "kg", y: "€", ask: (a, b, c) => `${a} kg of apples cost ${b} €. How much do ${c} kg cost?` },
    pens: { x: "pens", one: "pen", y: "€", ask: (a, b, c) => `${a} pens cost ${b} €. How much do ${c} pens cost?` },
    flour: { x: "people", one: "person", y: "g", ask: (a, b, c) => `For ${a} people you need ${b} g of flour. How much flour for ${c} people?` },
    car: { x: "litres", one: "litre", y: "km", ask: (a, b, c) => `A car goes ${b} km on ${a} litres. How far does it go on ${c} litres?` },
    pumps: { x: "pumps", one: "pump", y: "h", ask: (a, b, c) => `${a} pumps empty a pool in ${b} hours. How long do ${c} pumps take?` },
    painters: { x: "painters", one: "painter", y: "days", ask: (a, b, c) => `${a} painters paint a school in ${b} days. How long do ${c} painters take?` },
    prize: { x: "children", one: "child", y: "€", ask: (a, b, c) => `A prize is shared fairly: with ${a} children each gets ${b} €. How much does each get with ${c} children?` },
    food: { x: "children", one: "child", y: "days", ask: (a, b, c) => `The food lasts ${a} children ${b} days. How long does it last ${c} children?` },
  },
};
export const storyUnits = (s: Story, lang: Lang) => ({ x: STORY_WORDS[lang][s].x, one: STORY_WORDS[lang][s].one, y: STORY_WORDS[lang][s].y });
export function storyText(s: Story, a: Rational, b: Rational, c: Rational, lang: Lang): string {
  return STORY_WORDS[lang][s].ask(num(a, lang), STORY_WORDS[lang][s].y === "€" ? money(b, lang) : num(b, lang), num(c, lang));
}

// ---------- quiz ----------

const r100 = (v: number) => rat(Math.round(v * 100), 100);

export function quizPrompt(q: ProportionQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "story": return storyText(q.story, rat(q.a), r100(q.b), rat(q.c), lang);
    case "classify": return de ? "Was für eine Zuordnung ist das?" : "What kind of relationship is this?";
    case "fill": return de ? `Die Zuordnung ist ${relationName(q.relation, lang)}. Welche Zahl fehlt?` : `The table is ${relationName(q.relation, lang)}. Which number is missing?`;
  }
}

export function quizChoice(q: ProportionQuestion, c: string, lang: Lang): string {
  if (q.kind === "classify") return relationName(c as Relation, lang);
  if (q.kind === "story" && storyUnits(q.story, lang).y === "€") return `${money(rat(Math.round(Number(c) * 100), 100), lang)} €`;
  const unit = q.kind === "story" ? ` ${storyUnits(q.story, lang).y}` : "";
  return `${choiceText(c, lang)}${unit}`;
}

export function quizSteps(q: ProportionQuestion, lang: Lang): string[] {
  const de = lang === "de";
  switch (q.kind) {
    case "story": {
      const kind = STORIES[q.story];
      const u = storyUnits(q.story, lang);
      const d: Dreisatz = { kind, a: rat(q.a), b: r100(q.b), c: rat(q.c) };
      return [
        `${de ? "Das ist" : "This is"} ${relationName(kind, lang)}: ${relationRule(kind, lang)}.`,
        dreisatzLines(d, lang, u.x, u.y, u.one).map((l) => `${l.left} ≙ ${l.right}${l.opLeft ? `  (${l.opLeft} | ${l.opRight})` : ""}`).join(" → "),
        dreisatzWhy(kind, lang),
      ];
    }
    case "classify": {
      const rows = q.xs.map((x, i) => [rat(x), rat(q.ys[i]!)] as const);
      const qs = rows.map((r) => num(quotient(r), lang)).join(", ");
      const ps = rows.map((r) => num(product(r), lang)).join(", ");
      return [`y : x = ${qs}`, `x · y = ${ps}`, whyRelation(rows, q.relation, lang)];
    }
    case "fill": {
      const known = q.ys.findIndex((y) => y !== null);
      const missing = q.ys.indexOf(null);
      const row = [rat(q.xs[known]!), rat(q.ys[known]!)] as const;
      const x = num(rat(q.xs[missing]!), lang);
      const right = choiceText(q.choices[q.answer]!, lang);
      return q.relation === "proportional"
        ? [de ? `Proportional: y : x ist immer ${num(quotient(row), lang)}.` : `Proportional: y : x is always ${num(quotient(row), lang)}.`, `y = ${num(quotient(row), lang)} · ${x} = ${right}`]
        : [de ? `Antiproportional: x · y ist immer ${num(product(row), lang)}.` : `Inversely proportional: x · y is always ${num(product(row), lang)}.`, `y = ${num(product(row), lang)} : ${x} = ${right}`];
    }
  }
}
