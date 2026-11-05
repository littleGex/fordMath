import "./sw-register";
import "../styles/zone.css";
import "../styles/teiler.css";
import {
  MAX_N, RULE_DIVISORS, checkRule, commonDivisors, divisorPairs, divisors, factorLadder, gcd, isPrime, lcm, multiples,
  type RuleDivisor,
} from "../lib/number-theory";
import {
  divisorSteps, euclidSteps, factorSteps, gcdSteps, lcmSteps, powerForm, primeVerdict, ruleText,
} from "../explain/number-theory";
import type { Lang } from "../explain/lang";
import { getLang, setLang } from "./lang";

const UI = {
  de: {
    title: "Teiler und Primzahlen", subtitle: "Teilbarkeit, Teiler, Primfaktoren, ggT und kgV",
    number: "Zahl", and: "und", secondHint: "Eine zweite Zahl ist freiwillig: Damit findest du ggT und kgV.",
    rulesTitle: "Teilbar durch …", divisorsTitle: "Teiler", factorsTitle: "Primfaktoren",
    gcdTitle: "ggT und kgV", pairEmpty: "Gib oben eine zweite Zahl ein, dann findest du hier den größten gemeinsamen Teiler (ggT) und das kleinste gemeinsame Vielfache (kgV).",
    euclidTitle: "Profi-Trick für große Zahlen",
    errNumber: `Bitte eine ganze Zahl von 1 bis ${MAX_N.toLocaleString("de-DE")}.`,
    divisorsOf: (n: number) => `Teiler von ${n}`, multiplesOf: (n: number) => `Vielfache von ${n}`,
    gcdHead: (a: number, b: number, g: number) => `ggT(${a}, ${b}) = ${g}`,
    lcmHead: (a: number, b: number, k: number) => `kgV(${a}, ${b}) = ${k}`,
  },
  en: {
    title: "Divisors and primes", subtitle: "Divisibility, divisors, prime factors, gcd and lcm",
    number: "Number", and: "and", secondHint: "A second number is optional: it finds the gcd and lcm.",
    rulesTitle: "Divisible by …", divisorsTitle: "Divisors", factorsTitle: "Prime factors",
    gcdTitle: "gcd and lcm", pairEmpty: "Type a second number above to find the greatest common divisor (gcd) and the least common multiple (lcm) here.",
    euclidTitle: "Pro trick for big numbers",
    errNumber: `Please type a whole number from 1 to ${MAX_N.toLocaleString("en-GB")}.`,
    divisorsOf: (n: number) => `Divisors of ${n}`, multiplesOf: (n: number) => `Multiples of ${n}`,
    gcdHead: (a: number, b: number, g: number) => `gcd(${a}, ${b}) = ${g}`,
    lcmHead: (a: number, b: number, k: number) => `lcm(${a}, ${b}) = ${k}`,
  },
};
type TextKey = { [K in keyof (typeof UI)["de"]]: (typeof UI)["de"][K] extends string ? K : never }[keyof (typeof UI)["de"]];

const COLOURS = ["#ff5566", "#ffb347", "#ffd84d", "#7cfc00", "#34d399", "#4fc3f7", "#7c8cff", "#b967ff", "#ff9ad5"];

let lang: Lang = getLang();
let selectedRule: RuleDivisor = 3;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const inN = $<HTMLInputElement>("num-n");
const inM = $<HTMLInputElement>("num-m");
const t = () => UI[lang];

const el = (tag: string, text: string, cls = "") => Object.assign(document.createElement(tag), { textContent: text, className: cls });
const listItems = (ol: HTMLElement, steps: string[]) => ol.replaceChildren(...steps.map((s) => el("li", s)));

/** "", or a whole number in range; anything else is an error. */
function readNumber(input: HTMLInputElement, optional: boolean): number | null | "bad" {
  const v = input.value.trim().replace(/[ .]/g, "");
  if (v === "") return optional ? null : "bad";
  if (!/^\d+$/.test(v)) return "bad";
  const n = Number(v);
  return n >= 1 && n <= MAX_N ? n : "bad";
}

function renderRules(n: number): void {
  $("rules").replaceChildren(
    ...RULE_DIVISORS.map((d) => {
      const ok = checkRule(n, d).ok;
      const b = document.createElement("button");
      b.type = "button";
      b.className = `rule ${ok ? "yes" : "no"}`;
      b.setAttribute("aria-pressed", String(d === selectedRule));
      b.setAttribute("aria-label", `${d}: ${ok ? "✓" : "✗"}`);
      b.append(el("b", String(d)), el("span", ok ? "✓" : "✗"));
      b.addEventListener("click", () => {
        selectedRule = d;
        render();
      });
      return b;
    }),
  );
  const r = ruleText(n, selectedRule, lang);
  $("rule-verdict").textContent = r.verdict;
  $("rule-text").textContent = r.why;
}

function renderDivisors(n: number): void {
  $("prime").textContent = primeVerdict(n, lang);
  $("prime").className = `prime-badge ${isPrime(n) ? "is-prime" : ""}`;
  $("pairs").replaceChildren(
    ...divisorPairs(n).map(([a, b], i) => {
      const s = el("span", `${a} · ${b}`);
      s.style.setProperty("--c", COLOURS[i % COLOURS.length]!);
      return s;
    }),
  );
  listItems($("divisor-steps"), divisorSteps(n, lang));
}

function renderFactors(n: number): void {
  const steps = factorSteps(n, lang);
  const ladder = factorLadder(n);
  $("factor-intro").textContent = steps[0]!; // the instruction, or "already a prime" / "1 has none"
  const cells: HTMLElement[] = [];
  for (const s of ladder) cells.push(el("span", String(s.n)), el("span", String(s.prime), "p"));
  if (ladder.length > 1) cells.push(el("span", "1"), el("span", "", "p"));
  $("ladder").replaceChildren(...(ladder.length > 1 ? cells : []));
  $("factor-result").textContent = ladder.length > 1 ? `${n} = ${powerForm(n)}` : "";
}

function numberChips(box: HTMLElement, xs: number[], common: Set<number>, best: number): void {
  box.replaceChildren(...xs.map((x) => el("span", String(x), x === best ? "best" : common.has(x) ? "common" : "")));
}

function renderPair(a: number, b: number): void {
  const g = gcd(a, b);
  const k = lcm(a, b);
  $("gcd-head").textContent = t().gcdHead(a, b, g);
  $("div-a-label").textContent = t().divisorsOf(a);
  $("div-b-label").textContent = t().divisorsOf(b);
  const common = new Set(commonDivisors(a, b));
  numberChips($("div-a"), divisors(a).slice(0, 40), common, g);
  numberChips($("div-b"), divisors(b).slice(0, 40), common, g);
  listItems($("gcd-steps"), gcdSteps(a, b, lang).slice(2));
  listItems($("euclid-steps"), euclidSteps(a, b, lang));

  $("lcm-head").textContent = t().lcmHead(a, b, k);
  const showLists = Math.max(k / a, k / b) <= 12;
  $("mult-lists").hidden = !showLists;
  if (showLists) {
    $("mul-a-label").textContent = t().multiplesOf(a);
    $("mul-b-label").textContent = t().multiplesOf(b);
    const ma = multiples(a, k / a);
    const mb = multiples(b, k / b);
    const both = new Set(ma.filter((x) => mb.includes(x)));
    numberChips($("mul-a"), ma, both, k);
    numberChips($("mul-b"), mb, both, k);
  }
  listItems($("lcm-steps"), lcmSteps(a, b, lang).slice(showLists ? 2 : 0));
}

function render(): void {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => (e.textContent = t()[e.dataset.t as TextKey]));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

  const n = readNumber(inN, false);
  const m = readNumber(inM, true);
  const bad = n === "bad" || m === "bad";
  $("error").textContent = bad ? t().errNumber : "";
  $("error").hidden = !bad;
  $("results").hidden = bad || n === null;
  if (bad || n === null) return;

  renderRules(n);
  renderDivisors(n);
  renderFactors(n);
  $("pair-empty").hidden = m !== null;
  $("pair-box").hidden = m === null;
  if (m !== null) renderPair(n, m);
}

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    lang = b.dataset.lang === "en" ? "en" : "de";
    setLang(lang);
    render();
  }),
);
for (const input of [inN, inM]) input.addEventListener("input", render);
document.querySelectorAll<HTMLButtonElement>("[data-n]").forEach((b) =>
  b.addEventListener("click", () => {
    inN.value = b.dataset.n ?? "";
    inM.value = b.dataset.m ?? "";
    render();
  }),
);

render();
