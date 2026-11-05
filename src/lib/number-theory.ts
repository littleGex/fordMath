/**
 * Divisors, multiples and primes (Teiler, Vielfache, Primzahlen) as taught in class 5–6.
 * Functions that teach return their working as data, so explanations can show it.
 */

export const MAX_N = 10_000_000;

export function assertNatural(n: number, name = "The number"): void {
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`${name} must be a whole number of at least 1`);
  if (n > MAX_N) throw new Error(`${name} must be at most ${MAX_N}`);
}

/** Quersumme: 2754 → 2 + 7 + 5 + 4 = 18. */
export function digitSum(n: number): number {
  return [...String(n)].reduce((s, d) => s + Number(d), 0);
}

// ---------- divisibility rules (Teilbarkeitsregeln) ----------

export const RULE_DIVISORS = [2, 3, 4, 5, 6, 9, 10] as const;
export type RuleDivisor = (typeof RULE_DIVISORS)[number];

/** What a rule looks at, and what it found. One shape per kind of rule. */
export type RuleCheck =
  | { kind: "last-digit"; divisor: 2 | 5 | 10; digit: number; allowed: number[]; ok: boolean }
  | { kind: "last-two"; divisor: 4; lastTwo: number; ok: boolean }
  | { kind: "digit-sum"; divisor: 3 | 9; digits: number[]; sum: number; ok: boolean }
  | { kind: "both"; divisor: 6; by2: boolean; by3: boolean; ok: boolean };

export function checkRule(n: number, divisor: RuleDivisor): RuleCheck {
  assertNatural(n);
  const last = n % 10;
  switch (divisor) {
    case 2: return { kind: "last-digit", divisor, digit: last, allowed: [0, 2, 4, 6, 8], ok: last % 2 === 0 };
    case 5: return { kind: "last-digit", divisor, digit: last, allowed: [0, 5], ok: last === 0 || last === 5 };
    case 10: return { kind: "last-digit", divisor, digit: last, allowed: [0], ok: last === 0 };
    case 4: return { kind: "last-two", divisor, lastTwo: n % 100, ok: (n % 100) % 4 === 0 };
    case 3:
    case 9: {
      const digits = [...String(n)].map(Number);
      const sum = digitSum(n);
      return { kind: "digit-sum", divisor, digits, sum, ok: sum % divisor === 0 };
    }
    case 6: {
      const by2 = n % 2 === 0;
      const by3 = digitSum(n) % 3 === 0;
      return { kind: "both", divisor, by2, by3, ok: by2 && by3 };
    }
  }
}

// ---------- divisors and multiples ----------

/** Teilerpaare: 36 → [1, 36], [2, 18], [3, 12], [4, 9], [6, 6]. Only tries up to √n. */
export function divisorPairs(n: number): Array<[small: number, big: number]> {
  assertNatural(n);
  const pairs: Array<[number, number]> = [];
  for (let d = 1; d * d <= n; d++) if (n % d === 0) pairs.push([d, n / d]);
  return pairs;
}

/** Teilermenge, smallest first: 12 → [1, 2, 3, 4, 6, 12]. */
export function divisors(n: number): number[] {
  const pairs = divisorPairs(n);
  const small = pairs.map(([a]) => a);
  const big = pairs.map(([, b]) => b).reverse();
  return [...new Set([...small, ...big])];
}

/** The first `count` multiples (Vielfache): 4 → 4, 8, 12, … */
export function multiples(n: number, count: number): number[] {
  assertNatural(n);
  return Array.from({ length: count }, (_, i) => n * (i + 1));
}

// ---------- primes ----------

export function isPrime(n: number): boolean {
  assertNatural(n);
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** The smallest divisor bigger than 1, or null for 1. A prime is its own smallest divisor. */
export function smallestFactor(n: number): number | null {
  assertNatural(n);
  if (n === 1) return null;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
  return n;
}

/** One rung of the division ladder: 360 : 2 = 180. */
export interface LadderStep {
  n: number;
  prime: number;
  quotient: number;
}

/**
 * Primfaktorzerlegung by always dividing by the smallest prime that fits:
 * 360 : 2 = 180, 180 : 2 = 90, 90 : 2 = 45, 45 : 3 = 15, 15 : 3 = 5, 5 : 5 = 1.
 */
export function factorLadder(n: number): LadderStep[] {
  assertNatural(n);
  const steps: LadderStep[] = [];
  let rest = n;
  while (rest > 1) {
    const p = smallestFactor(rest)!;
    steps.push({ n: rest, prime: p, quotient: rest / p });
    rest /= p;
  }
  return steps;
}

/** 360 → [[2, 3], [3, 2], [5, 1]], read as 2³ · 3² · 5. */
export function primeFactors(n: number): Array<[prime: number, power: number]> {
  const counts = new Map<number, number>();
  for (const s of factorLadder(n)) counts.set(s.prime, (counts.get(s.prime) ?? 0) + 1);
  return [...counts];
}

// ---------- ggT and kgV (greatest common divisor, least common multiple) ----------

/** One line of Euclid's algorithm: a = q · b + r. */
export interface EuclidStep {
  a: number;
  b: number;
  q: number;
  r: number;
}

export function euclid(a: number, b: number): EuclidStep[] {
  assertNatural(a, "The first number");
  assertNatural(b, "The second number");
  const steps: EuclidStep[] = [];
  let [x, y] = a >= b ? [a, b] : [b, a];
  while (y > 0) {
    const q = Math.floor(x / y);
    const r = x - q * y;
    steps.push({ a: x, b: y, q, r });
    [x, y] = [y, r];
  }
  return steps;
}

/** ggT: the biggest number that divides both. */
export function gcd(a: number, b: number): number {
  const steps = euclid(a, b);
  return steps[steps.length - 1]!.b;
}

/** kgV: the smallest number both divide into. Divides first, so it doesn't overflow early. */
export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/** Divisors both numbers share, smallest first. */
export function commonDivisors(a: number, b: number): number[] {
  const ofB = new Set(divisors(b));
  return divisors(a).filter((d) => ofB.has(d));
}
