# fordMath

A small, growing toolkit of math methods in TypeScript, with tests and one shared web front end.

Live site: https://littlegex.github.io/fordMath/ (deployed by GitHub Actions on every push to `main`, only if the tests pass).

## Methods

| Method   | Function            | Notes                                                        |
| -------- | ------------------- | ------------------------------------------------------------ |
| Mean     | `mean(values)`      | Sum ÷ count                                                  |
| Median   | `median(values)`    | Average of the middle pair for an even count                 |
| Mode     | `mode(values)`      | Returns every tied value; `[]` when all values are unique    |
| All three| `getStats(values)`  | Validates once, then runs each method                        |

All functions take `readonly number[]` (ints and floats), never mutate the input, and throw on an empty array, `NaN` or `Infinity`.

## Project layout

```
src/
  lib/            pure math, no DOM; one module + one test file per method
    validate.ts   shared input guard (assertValid) and sortNumeric
    mean.ts  median.ts  mode.ts  stats.ts
    index.ts      public API
  registry.ts     list of methods shown in the front end
  parse.ts        text input → number[]
  main.ts         front end entry point
index.html
```

Each method module exports a validated public function (`mean`) and an internal unchecked one (`meanUnchecked`), so `getStats` can validate the input only once.

## Adding a method

1. Create `src/lib/<name>.ts` with a public function that calls `assertValid` once, plus an unchecked helper if orchestrators will reuse it.
2. Add `src/lib/<name>.test.ts`.
3. Export it from `src/lib/index.ts`.
4. Add an entry to `methods` in `src/registry.ts`. The front end picks it up automatically.

## Scripts

```bash
npm install
npm test          # run Vitest once
npm run test:watch
npm run dev       # local dev server
npm run build     # type-check + production build into dist/
```

## Using it on an iPhone

Open the live site in Safari, then Share → Add to Home Screen.
