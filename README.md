# fordMath

A growing toolkit of maths helpers in TypeScript. Each one has tests and a step-by-step explanation of the working, and they share one Game Zone-style web front end.

Live site: https://littlegex.github.io/fordMath/ (deployed by GitHub Actions on every push to `main`, only if every test passes).

**Want to build features yourself and learn TypeScript?** Start with the [dev guide](docs/DEV_GUIDE.md).

Planned helpers are tracked as [issues](https://github.com/littleGex/fordMath/issues) and shown as faded tiles on the homepage. Each issue and tile has a school level (`level: Grundschule`, `level: Sek I`, `level: Oberstufe`), and the homepage chips filter by level.

## Helpers

| Helper              | Function                              | Notes                                                       |
| ------------------- | ------------------------------------- | ----------------------------------------------------------- |
| Mean                | `mean(values)`                        | Sum ÷ count                                                 |
| Median              | `median(values)`                      | Average of the middle pair for an even count                |
| Mode                | `mode(values)`                        | Returns every tied value; `[]` when all values are unique   |
| Variance            | `variance(values, kind?)`             | `kind` is `"population"` (÷ n, default) or `"sample"` (÷ n − 1) |
| Standard deviation  | `standardDeviation(values, kind?)`    | √variance; sample needs at least 2 values                   |
| Everything at once  | `getStats(values)`                    | Validates once and computes the mean once                   |
| Quadratic equation  | `solveQuadratic(a, b, c)`             | Roots as a discriminated union (two real, repeated, complex, linear, none, every x), plus vertex; numerically stable |
| Discriminant        | `discriminant(a, b, c)`               | b² − 4ac, snapped to 0 within floating-point noise          |
| Times tables        | `questionsFor`, `makeRound`, `record` in `lib/times-tables` | Einmaleins facts, weighted rounds (Leitner boxes), Kernaufgaben strategies; seeded random in `lib/random` |
| Written sums        | `writtenAdd`, `writtenSubtract(a, b, method)`, `writtenMultiply`, `writtenDivide`, `makeProblem` in `lib/written` | German school layouts as data; subtraction by Ergänzen or Abziehen mit Entbündeln; multiplication line by line from the left; division with Rest |
| Number theory       | `checkRule`, `divisors`, `isPrime`, `factorLadder`, `primeFactors`, `gcd`, `lcm`, `euclid` in `lib/number-theory` | Divisibility rules with their working, divisor pairs, prime factor ladder, ggT/kgV by lists and by Euclid |
| Fractions           | `fraction`, `simplify`, `expand`, `compare`, `add`, `makeFractionRound` in `lib/fraction` | Branded `Fraction` type (only made through `fraction()`); six levels of questions, each with exactly one right answer |
| Place value         | `splitPlaces`, `setDigit`, `roundTo`, `makePlaceRound` in `lib/place-value`; `germanWords`, `englishWords` in `lib/number-words` | Stellenwerte up to 999 999 999 999, rounding with the deciding digit, numbers in German and English words, four quiz question types |
| Units               | `parseAmount`, `formatIn`, `formatMixed`, `unitTable`, `timeSpan`, `changeFor` in `lib/units`; quiz in `lib/units-quiz` | Money, length, mass and time stored as whole numbers of the smallest unit (exact); unit place-value table; time spans in jumps; change counted up with coins |
| Expressions         | `compile(text)` → `(x) => number`     | Safe parser for f(x): never uses eval; `parse`, `evaluate`, `formatExpr` and `ExpressionError` (with a position) also exported from `lib/expression` |

All functions take `readonly number[]` (ints and floats), never mutate the input, and throw on an empty array, `NaN` or `Infinity`.

## Pages

| Path      | What it is                                                             |
| --------- | ---------------------------------------------------------------------- |
| `/`       | Homepage: helpers filtered by school level; planned ones link to their issue |
| `/stats/` | Live calculator, number line with mean ± σ, and the working for each result |
| `/quadratic/` | Solver for ax² + bx + c = 0 with a graph and the working |
| `/einmaleins/` | Einmaleins trainer (German, with English toggle): keypad, dots picture and working after a mistake, progress board |
| `/schriftlich/` | Written +, −, · and : (German, EN toggle): step through or do it yourself; `#plus`, `#minus`, `#mal`, `#geteilt` open an operation directly |
| `/teiler/` | Teiler und Primzahlen (German, EN toggle): divisibility rules, divisor pairs, prime factors, ggT and kgV |
| `/brueche/` | Brüche game (German, EN toggle): six levels that unlock with stars, pizzas and bars, working after a mistake |
| `/stellenwerte/` | Stellenwerte (German, EN toggle): place-value table with ▲▼, Zerlegung, words, rounding on a number line, 10-question quiz |
| `/groessen/` | Größen (German, EN toggle): convert with every unit at once and a unit place-value table, time spans, shopping change, 10-question quiz |
| `/function/` | Type any f(x): how it was read, its graph, and f(x) worked out step by step |
| `/tests/` | Every test from the deployed build, read from `test-results.json`      |

## Project layout

```
index.html  stats/  quadratic/  function/  einmaleins/  schriftlich/  teiler/  brueche/  stellenwerte/  groessen/  tests/   pages (Vite multi-page build)
public/          favicon, Home Screen icons, manifest
src/
  lib/           pure maths, no DOM; one module + one test file per helper
    validate.ts  shared input guard (assertValid) and sortNumeric
    mean.ts  median.ts  mode.ts  deviation.ts  stats.ts  quadratic.ts
    expression/  tokenize → parse → evaluate, plus format (the f(x) parser)
    index.ts     public API
  explain/       step-by-step working, using the user's numbers (+ tests)
  registry.ts    which helpers the Statistics page shows
  parse.ts       text input → number[]
  pages/         entry script for each page
  styles/        zone.css (shared Game Zone look) + per-page CSS
tools/make-icons.mjs
```

Each helper module exports a validated public function (`mean`) and an internal unchecked one (`meanUnchecked`), so orchestrators like `getStats` validate only once.

## Adding a helper

1. Create `src/lib/<name>.ts`: a public function that validates once, plus unchecked internals for reuse.
2. Add `src/lib/<name>.test.ts` with normal, edge and invalid cases.
3. Export it from `src/lib/index.ts`.
4. Write an explanation in `src/explain/` (with a test) that walks through the working using the user's numbers.
5. Add it to `src/registry.ts`, or give it its own page and add the page to `vite.config.ts`.
6. Swap its "Coming soon" tile on the homepage for a live one, and close the issue.

## Scripts

```bash
npm install
npm test             # run Vitest once
npm run test:watch
npm run test:report  # run tests and write public/test-results.json for the Tests page
npm run dev          # local dev server
npm run build        # type-check + production build into dist/
npm run icons        # redraw the favicon and Home Screen icons
npm run e2e          # browser test of offline support (run npm run build first)
```

## Using it on an iPhone

Open the live site in Safari, then Share → Add to Home Screen. After the first visit everything works offline: the homepage footer shows "✓ works offline" once the whole site is stored.

## Offline support

`build/sw-plugin.ts` adds `dist/sw.js` after each build, listing every built file and a version hash of their contents; `build/sw-template.js` is the service worker itself. Pages are fetched network-first (so updates arrive when online) with the stored copy as fallback; scripts and styles are served from the store. Each deploy gets a new cache and the old one is deleted. `e2e/offline.spec.ts` checks it in a real browser by switching the server off.
