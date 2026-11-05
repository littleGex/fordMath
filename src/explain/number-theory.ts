import {
  checkRule, commonDivisors, divisorPairs, divisors, euclid, factorLadder, gcd, isPrime, lcm, multiples, primeFactors,
  type RuleCheck, type RuleDivisor,
} from "../lib/number-theory";
import type { Lang } from "./lang";

const SUP: Record<string, string> = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const power = (p: number, k: number) => (k === 1 ? String(p) : `${p}${[...String(k)].map((c) => SUP[c]).join("")}`);

/** 360 → "2³ · 3² · 5" */
export function powerForm(n: number): string {
  return primeFactors(n).map(([p, k]) => power(p, k)).join(" · ");
}

/** Short lists stay whole; long ones keep their start and end. */
const list = (xs: readonly number[], max = 14) =>
  xs.length <= max ? xs.join(", ") : `${xs.slice(0, max - 3).join(", ")}, …, ${xs.slice(-2).join(", ")}`;

// ---------- divisibility rules ----------

export interface RuleText {
  verdict: string; // "2754 ist durch 9 teilbar."
  why: string; // the rule, applied to this number
}

export function ruleText(n: number, divisor: RuleDivisor, lang: Lang): RuleText {
  const c: RuleCheck = checkRule(n, divisor);
  const de = lang === "de";
  const verdict = de
    ? `${n} ist ${c.ok ? "" : "nicht "}durch ${divisor} teilbar.`
    : `${n} is ${c.ok ? "" : "not "}divisible by ${divisor}.`;
  let why: string;
  switch (c.kind) {
    case "last-digit": {
      const allowed = c.allowed.join(de ? " oder " : " or ");
      why = de
        ? `Regel für ${c.divisor}: Schau auf die letzte Ziffer. Sie muss ${allowed} sein. Hier ist sie ${c.digit}.`
        : `Rule for ${c.divisor}: look at the last digit. It has to be ${allowed}. Here it is ${c.digit}.`;
      break;
    }
    case "last-two":
      why = de
        ? `Regel für 4: Schau auf die letzten zwei Ziffern. ${c.lastTwo} ist ${c.ok ? "" : "nicht "}durch 4 teilbar${c.ok ? ` (${c.lastTwo} : 4 = ${c.lastTwo / 4})` : ""}.`
        : `Rule for 4: look at the last two digits. ${c.lastTwo} is ${c.ok ? "" : "not "}divisible by 4${c.ok ? ` (${c.lastTwo} : 4 = ${c.lastTwo / 4})` : ""}.`;
      break;
    case "digit-sum":
      why = de
        ? `Regel für ${c.divisor}: Bilde die Quersumme. ${c.digits.join(" + ")} = ${c.sum}, und ${c.sum} ist ${c.ok ? "" : "nicht "}durch ${c.divisor} teilbar.`
        : `Rule for ${c.divisor}: add up the digits. ${c.digits.join(" + ")} = ${c.sum}, and ${c.sum} is ${c.ok ? "" : "not "}divisible by ${c.divisor}.`;
      break;
    case "both": {
      const yes = de ? "ja" : "yes";
      const no = de ? "nein" : "no";
      why = de
        ? `Regel für 6: Die Zahl muss durch 2 und durch 3 teilbar sein. Durch 2: ${c.by2 ? yes : no}. Durch 3: ${c.by3 ? yes : no}.`
        : `Rule for 6: the number has to be divisible by both 2 and 3. By 2: ${c.by2 ? yes : no}. By 3: ${c.by3 ? yes : no}.`;
      break;
    }
  }
  return { verdict, why };
}

// ---------- divisors and primes ----------

export function divisorSteps(n: number, lang: Lang): string[] {
  const de = lang === "de";
  const pairs = divisorPairs(n);
  const ds = divisors(n);
  const pairText = pairs.map(([a, b]) => `${a} · ${b}`).join(", ");
  const last = pairs[pairs.length - 1]!;
  const stop =
    last[0] === last[1]
      ? de ? `Bei ${last[0]} · ${last[1]} treffen sich die Paare: fertig.` : `At ${last[0]} · ${last[1]} the pairs meet: done.`
      : de ? `Nach ${last[0]} · ${last[1]} würden sich die Paare wiederholen: fertig.` : `After ${last[0]} · ${last[1]} the pairs would repeat: done.`;
  return [
    de ? `Suche Teilerpaare, die zusammen ${n} ergeben, und fang bei 1 an: ${pairText}.` : `Look for pairs of divisors that multiply to ${n}, starting at 1: ${pairText}.`,
    stop,
    de ? `Teiler von ${n}: ${list(ds)} (${ds.length} Teiler).` : `Divisors of ${n}: ${list(ds)} (${ds.length} divisors).`,
  ];
}

export function primeVerdict(n: number, lang: Lang): string {
  const de = lang === "de";
  if (n === 1) return de ? "1 ist keine Primzahl: Sie hat nur einen Teiler." : "1 is not a prime: it has only one divisor.";
  if (isPrime(n)) {
    return de ? `${n} ist eine Primzahl: Sie hat genau zwei Teiler, 1 und ${n}.` : `${n} is a prime: it has exactly two divisors, 1 and ${n}.`;
  }
  const [p, q] = divisorPairs(n)[1]!;
  return de ? `${n} ist keine Primzahl, denn ${n} = ${p} · ${q}.` : `${n} is not a prime, because ${n} = ${p} · ${q}.`;
}

export function factorSteps(n: number, lang: Lang): string[] {
  const de = lang === "de";
  if (n === 1) return [de ? "1 hat keine Primfaktoren." : "1 has no prime factors."];
  if (isPrime(n)) return [de ? `${n} ist schon eine Primzahl.` : `${n} is already a prime.`];
  const ladder = factorLadder(n);
  const all = ladder.map((s) => s.prime).join(" · ");
  return [
    de
      ? "Teile immer durch die kleinste Primzahl, die passt (2, 3, 5, 7, …), bis 1 übrig bleibt."
      : "Keep dividing by the smallest prime that fits (2, 3, 5, 7, …) until 1 is left.",
    ...ladder.map((s) => `${s.n} : ${s.prime} = ${s.quotient}`),
    `${n} = ${all}` + (all !== powerForm(n) ? ` = ${powerForm(n)}` : ""),
  ];
}

// ---------- ggT and kgV ----------

export function gcdSteps(a: number, b: number, lang: Lang): string[] {
  const de = lang === "de";
  const g = gcd(a, b);
  const steps = [
    de ? `Teiler von ${a}: ${list(divisors(a))}` : `Divisors of ${a}: ${list(divisors(a))}`,
    de ? `Teiler von ${b}: ${list(divisors(b))}` : `Divisors of ${b}: ${list(divisors(b))}`,
    de ? `Gemeinsame Teiler: ${list(commonDivisors(a, b))}` : `Common divisors: ${list(commonDivisors(a, b))}`,
    de ? `Der größte davon: ggT(${a}, ${b}) = ${g}` : `The biggest of them: gcd(${a}, ${b}) = ${g}`,
  ];
  if (g === 1) steps.push(de ? `Der ggT ist 1: ${a} und ${b} haben keinen gemeinsamen Teiler außer 1.` : `The gcd is 1: ${a} and ${b} share no divisor except 1.`);
  return steps;
}

/** Euclid's algorithm, for bigger numbers where listing divisors gets long. */
export function euclidSteps(a: number, b: number, lang: Lang): string[] {
  const de = lang === "de";
  const steps = euclid(a, b);
  return [
    de
      ? "Profi-Trick für große Zahlen (Euklid): Teile die größere Zahl durch die kleinere und rechne mit dem Rest weiter, bis der Rest 0 ist."
      : "Pro trick for big numbers (Euclid): divide the bigger number by the smaller one, then carry on with the remainder until it is 0.",
    ...steps.map((s) => `${s.a} = ${s.q} · ${s.b} + ${s.r}`),
    de ? `Der letzte Teiler vor dem Rest 0 ist der ggT: ${steps.at(-1)!.b}` : `The last divisor before remainder 0 is the gcd: ${steps.at(-1)!.b}`,
  ];
}

export function lcmSteps(a: number, b: number, lang: Lang): string[] {
  const de = lang === "de";
  const k = lcm(a, b);
  const g = gcd(a, b);
  const steps: string[] = [];
  const countA = k / a;
  const countB = k / b;
  if (Math.max(countA, countB) <= 12) {
    steps.push(
      de ? `Vielfache von ${a}: ${multiples(a, countA).join(", ")}` : `Multiples of ${a}: ${multiples(a, countA).join(", ")}`,
      de ? `Vielfache von ${b}: ${multiples(b, countB).join(", ")}` : `Multiples of ${b}: ${multiples(b, countB).join(", ")}`,
      de ? `Das kleinste, das in beiden Listen steht: kgV(${a}, ${b}) = ${k}` : `The smallest one in both lists: lcm(${a}, ${b}) = ${k}`,
    );
  }
  steps.push(
    de ? `Schneller: kgV = ${a} · ${b} : ggT = ${a * b} : ${g} = ${k}` : `Quicker: lcm = ${a} · ${b} : gcd = ${a * b} : ${g} = ${k}`,
  );
  return steps;
}
