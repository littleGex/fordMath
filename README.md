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
| `/function/` | Type any f(x): how it was read, its graph, and f(x) worked out step by step |
| `/tests/` | Every test from the deployed build, read from `test-results.json`      |

## Project layout

```
index.html  stats/  quadratic/  function/  einmaleins/  schriftlich/  tests/   pages (Vite multi-page build)
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
```

## Using it on an iPhone

Open the live site in Safari, then Share → Add to Home Screen.
