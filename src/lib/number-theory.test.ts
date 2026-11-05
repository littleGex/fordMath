import { seededRandom } from "./random";
import {
  RULE_DIVISORS, checkRule, commonDivisors, digitSum, divisorPairs, divisors, euclid, factorLadder,
  gcd, isPrime, lcm, multiples, primeFactors, smallestFactor,
} from "./number-theory";

describe("digitSum (Quersumme)", () => {
  it("adds the digits", () => {
    expect(digitSum(2754)).toBe(18);
    expect(digitSum(7)).toBe(7);
  });
});

describe("checkRule (Teilbarkeitsregeln)", () => {
  it("uses the last digit for 2, 5 and 10", () => {
    expect(checkRule(358, 2)).toMatchObject({ kind: "last-digit", digit: 8, ok: true });
    expect(checkRule(358, 5)).toMatchObject({ ok: false });
    expect(checkRule(350, 10)).toMatchObject({ ok: true });
  });
  it("uses the last two digits for 4", () => {
    expect(checkRule(1316, 4)).toMatchObject({ kind: "last-two", lastTwo: 16, ok: true });
    expect(checkRule(1318, 4)).toMatchObject({ ok: false });
  });
  it("uses the digit sum for 3 and 9", () => {
    expect(checkRule(2754, 9)).toMatchObject({ kind: "digit-sum", digits: [2, 7, 5, 4], sum: 18, ok: true });
    expect(checkRule(2755, 3)).toMatchObject({ sum: 19, ok: false });
  });
  it("needs both 2 and 3 for 6", () => {
    expect(checkRule(84, 6)).toMatchObject({ kind: "both", by2: true, by3: true, ok: true });
    expect(checkRule(81, 6)).toMatchObject({ by2: false, by3: true, ok: false });
  });
  it("every rule agrees with real division for 1 to 3000", () => {
    for (let n = 1; n <= 3000; n++) {
      for (const d of RULE_DIVISORS) expect(checkRule(n, d).ok).toBe(n % d === 0);
    }
  });
});

describe("divisors (Teiler)", () => {
  it("pairs them up to √n", () => {
    expect(divisorPairs(36)).toEqual([[1, 36], [2, 18], [3, 12], [4, 9], [6, 6]]);
  });
  it("lists them in order without repeating a square root", () => {
    expect(divisors(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
    expect(divisors(1)).toEqual([1]);
    expect(divisors(13)).toEqual([1, 13]);
  });
  it("lists multiples (Vielfache)", () => {
    expect(multiples(4, 5)).toEqual([4, 8, 12, 16, 20]);
  });
  it("rejects 0, negatives, decimals and huge numbers", () => {
    expect(() => divisors(0)).toThrow("at least 1");
    expect(() => divisors(-4)).toThrow();
    expect(() => divisors(2.5)).toThrow();
    expect(() => divisors(10_000_001)).toThrow("at most");
  });
});

describe("primes (Primzahlen)", () => {
  it("knows the primes below 50", () => {
    const primes = Array.from({ length: 50 }, (_, i) => i + 1).filter(isPrime);
    expect(primes).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]);
  });
  it("says 1 is not a prime and has no smallest factor", () => {
    expect(isPrime(1)).toBe(false);
    expect(smallestFactor(1)).toBeNull();
  });
  it("catches products of two primes", () => {
    expect(isPrime(91)).toBe(false); // 7 · 13
    expect(smallestFactor(91)).toBe(7);
    expect(isPrime(9_999_991)).toBe(true);
  });
});

describe("prime factorisation (Primfaktorzerlegung)", () => {
  it("builds the division ladder", () => {
    expect(factorLadder(360).map((s) => `${s.n}:${s.prime}=${s.quotient}`)).toEqual([
      "360:2=180", "180:2=90", "90:2=45", "45:3=15", "15:3=5", "5:5=1",
    ]);
  });
  it("groups primes into powers", () => {
    expect(primeFactors(360)).toEqual([[2, 3], [3, 2], [5, 1]]);
    expect(primeFactors(97)).toEqual([[97, 1]]);
    expect(primeFactors(1)).toEqual([]);
  });
  it("multiplies back to the number for lots of random numbers", () => {
    const r = seededRandom(7);
    for (let i = 0; i < 300; i++) {
      const n = 1 + Math.floor(r() * 1_000_000);
      const product = primeFactors(n).reduce((p, [q, k]) => p * q ** k, 1);
      expect(product).toBe(n);
      for (const [q] of primeFactors(n)) expect(isPrime(q)).toBe(true);
    }
  });
});

describe("ggT and kgV", () => {
  it("records each step of Euclid's algorithm", () => {
    expect(euclid(48, 36)).toEqual([{ a: 48, b: 36, q: 1, r: 12 }, { a: 36, b: 12, q: 3, r: 0 }]);
    expect(euclid(36, 48)[0]!.a).toBe(48); // the bigger number goes first
  });
  it("finds ggT and kgV", () => {
    expect(gcd(12, 18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(gcd(7, 13)).toBe(1);
    expect(lcm(7, 13)).toBe(91);
    expect(gcd(5, 5)).toBe(5);
  });
  it("lists common divisors, the largest being the ggT", () => {
    expect(commonDivisors(12, 18)).toEqual([1, 2, 3, 6]);
  });
  it("satisfies ggT · kgV = a · b for random pairs", () => {
    const r = seededRandom(9);
    for (let i = 0; i < 300; i++) {
      const a = 1 + Math.floor(r() * 5000);
      const b = 1 + Math.floor(r() * 5000);
      expect(gcd(a, b) * lcm(a, b)).toBe(a * b);
      expect(commonDivisors(a, b).at(-1)).toBe(gcd(a, b));
    }
  });
});
