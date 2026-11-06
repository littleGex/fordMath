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
| Quartiles           | `quartiles(values, method)`, `percentile(values, p)`, `iqr`, `boxPlot`, `quartilePositions` | Q1, Q3 and IQR by the school method (median of each half) or linear interpolation (NumPy, Excel `QUARTILE.INC`); box plot with 1.5 × IQR outliers |
| Quadratic equation  | `solveQuadratic(a, b, c)`             | Roots as a discriminated union (two real, repeated, complex, linear, none, every x), plus vertex; numerically stable |
| Discriminant        | `discriminant(a, b, c)`               | b² − 4ac, snapped to 0 within floating-point noise          |
| Times tables        | `questionsFor`, `makeRound`, `record` in `lib/times-tables` | Einmaleins facts, weighted rounds (Leitner boxes), Kernaufgaben strategies; seeded random in `lib/random` |
| Written sums        | `writtenAdd`, `writtenSubtract(a, b, method)`, `writtenMultiply`, `writtenDivide`, `makeProblem` in `lib/written` | German school layouts as data; subtraction by Ergänzen or Abziehen mit Entbündeln; multiplication line by line from the left; division with Rest |
| Number theory       | `checkRule`, `divisors`, `isPrime`, `factorLadder`, `primeFactors`, `gcd`, `lcm`, `euclid` in `lib/number-theory` | Divisibility rules with their working, divisor pairs, prime factor ladder, ggT/kgV by lists and by Euclid |
| Fractions           | `fraction`, `simplify`, `expand`, `compare`, `add`, `makeFractionRound` in `lib/fraction` | Branded `Fraction` type (only made through `fraction()`); six levels of questions, each with exactly one right answer |
| Place value         | `splitPlaces`, `setDigit`, `roundTo`, `makePlaceRound` in `lib/place-value`; `germanWords`, `englishWords` in `lib/number-words` | Stellenwerte up to 999 999 999 999, rounding with the deciding digit, numbers in German and English words, four quiz question types |
| Units               | `parseAmount`, `formatIn`, `formatMixed`, `unitTable`, `timeSpan`, `changeFor` in `lib/units`; quiz in `lib/units-quiz` | Money, length, mass and time stored as whole numbers of the smallest unit (exact); unit place-value table; time spans in jumps; change counted up with coins |
| Mental arithmetic   | `makeQuestion(level, random)`, `planOf`, `makeRound`, `recordAnswer` in `lib/mental` | Kopfrechnen up to 1 000 in five kinds; each answer's school strategy as jumps on a number line; missed questions come back |
| Perimeter and area  | `area`, `perimeter`, `outline`, `asRectangle`, `perimeterRange`, `rectanglesWithArea`, `makeAreaQuestion` in `lib/area` | Shapes of grid squares: count squares and edges (the outline as walks, so it can be counted side by side), rectangle formulas, smallest and largest perimeter for n squares, area units |
| Decimals            | `parseDecimal`, `compare`, `add`, `subtract`, `roundDecimal`, `fromFraction`, `placeDigits`, `writtenDecimalAdd` in `lib/decimal` | Exact decimals as whole numbers with a scale (0,1 + 0,2 = 0,3); places after the comma, comparing, rounding, fractions with 10/100/1000, comma under comma |
| Negative numbers    | `move(a, op, b)`, `opposite`, `distanceFromZero`, `makeStory`, `makeIntQuestion` in `lib/integers` | Every ± as a move with one of four rules (plus or minus, a positive or a negative); temperature, bank account and lift stories |
| Word problems       | `makeProblem(template, random)`, `makeProblemRound`, `checkNumbers` in `lib/word-problems` | Ten kinds of story (six Grundschule, four Klasse 5) with the numbers needed and some that aren't, the right calculation and tempting wrong ones, each checked to have exactly one right choice |
| Symmetry            | `mirror`, `mirrorCell`, `isSymmetric`, `axesOf`, `makeMirrorTask`, `checkMirror` in `lib/symmetry` | Mirror lines on squared paper: vertical, horizontal (on a grid line or through the middle of a square) and diagonal; all mirror lines of a shape; half-figure tasks |
| Angles              | `angleKind`, `otherScale`, `snapPose`, `readScales`, `makeAngleTask`, `makeAngleRound` in `lib/angles` | Kinds of angle, the Geodreieck's two scales, snapping it onto the vertex and an arm, tasks for naming, estimating, measuring and drawing |
| Cuboids and nets    | `volume`, `surface`, `fold`, `isCubeNet`, `oppositeSquare`, `hexominoes`, `cubeNets`, `makeCuboidQuestion` in `lib/cuboid` | Volume by layers and V = a·b·c, surface in pairs, volume units and litres; folding a net by rolling a die across it (finds all 11 cube nets among the 35 hexominoes) |
| Quiz state          | `begin`, `pick`, `next`, `current` in `lib/quiz-state`; `mountQuiz<Q>()` in `pages/quiz.ts` | One generic quiz for every topic page: the state machine is pure and tested, the component builds the start, play and result screens from a page's own question type |
| Daily practice      | `chooseTopics`, `recordAnswer`, `finishRound`, `currentStreak`, `topicWeight` in `lib/daily`; topic adapters in `pages/daily-topics.ts` | A weighted mix of topics (weak and long-unpractised ones more often), progress per topic and a day streak, all kept on the device |
| Partly written      | `splitMultiply`, `splitDivide`, `placeParts`, `makeSplitTask` in `lib/partly-written` | Halbschriftlich: split by place value (7 · 46 = 7 · 40 + 7 · 6), divide in easy multiples (96 : 4 = 80 : 4 + 16 : 4), remainders at the top level |
| Percentages         | `solve`, `percentValue`, `baseValue`, `percentRate`, `afterDiscount`, `gross`, `net`, `interest`, `makePercentRound` in `lib/percent` | Grundwert, Prozentwert and Prozentsatz from any two of the three, exactly; discounts, 19 % VAT both ways, simple interest, percent ↔ fraction, quiz with the classic traps |
| Two equations       | `solveSystem(e1, e2)`, `makeSystem` in `lib/linear-system`; `rat`, `parseRational` in `lib/rational` | Exact fractions throughout; the answer as a union (one point, none, the same line, every pair); practice tasks with whole-number answers |
| Expressions         | `compile(text)` → `(x) => number`     | Safe parser for f(x): never uses eval; `parse`, `evaluate`, `formatExpr` and `ExpressionError` (with a position) also exported from `lib/expression` |
| Order of operations | `allowedPaths`, `whyNot`, `collapse`, `workedLines`, `makeOrderTask`, `makeBracketTask` in `lib/expression/steps` | Which operation the school rules allow next (Klammern, Punkt vor Strich, links nach rechts) and which rule a wrong choice breaks; tasks that stay whole and positive for class 5 |

All functions take `readonly number[]` (ints and floats), never mutate the input, and throw on an empty array, `NaN` or `Infinity`.

## Pages

| Path      | What it is                                                             |
| --------- | ---------------------------------------------------------------------- |
| `/`       | Homepage: helpers filtered by school level; planned ones link to their issue; a "Für Eltern" footer with the test count, source and plans |
| `/stats/` | Live calculator, number line with mean ± σ, quartiles with a box plot (`#quartiles`, two methods), and the working for each result |
| `/quadratic/` | Solver for ax² + bx + c = 0 with a graph and the working |
| `/einmaleins/` | Einmaleins trainer (German, with English toggle): keypad, dots picture and working after a mistake, progress board |
| `/schriftlich/` | Written +, −, · and : (German, EN toggle): step through or do it yourself; `#plus`, `#minus`, `#mal`, `#geteilt` open an operation directly |
| `/teiler/` | Teiler und Primzahlen (German, EN toggle): divisibility rules, divisor pairs, prime factors, ggT and kgV |
| `/brueche/` | Brüche game (German, EN toggle): six levels that unlock with stars, pizzas and bars, working after a mistake |
| `/stellenwerte/` | Stellenwerte (German, EN toggle): place-value table with ▲▼, Zerlegung, words, rounding on a number line, 10-question quiz |
| `/groessen/` | Größen (German, EN toggle): convert with every unit at once and a unit place-value table, time spans, shopping change, 10-question quiz |
| `/punkt-vor-strich/` | Punkt vor Strich (German, EN toggle): tap the operation that comes first and work the sum out line by line, four levels; or pick where the brackets go to make a target |
| `/kopfrechnen/` | Kopfrechnen (German, EN toggle): five kinds of question up to 1 000, rounds of 10 on the keypad, number-line jumps and the strategy after a mistake, mistakes practised again |
| `/umfang-flaeche/` | Umfang und Fläche (German, EN toggle): draw on squared paper, area and perimeter live, the edge counted side by side, same area with different perimeter, area units, 10-question quiz |
| `/dezimalzahlen/` | Dezimalzahlen (German, EN toggle): Stellenwerttafel with a comma, a number line you can zoom into, rounding, comparing, written + and − with the commas lined up, 10-question quiz |
| `/negative-zahlen/` | Negative Zahlen (German, EN toggle): a thermometer with the move drawn as an arrow, the four rules, stories, comparing with Gegenzahl and Betrag, 10-question quiz |
| `/sachaufgaben/` | Sachaufgaben (German, EN toggle): find the question, tap the numbers you need, choose and work out the calculation, choose the answer sentence; the worked solution at the end |
| `/symmetrie/` | Symmetrie (German, EN toggle): mirror half a figure and check it, a "Zaubertafel" that mirrors as you draw (one, two or a diagonal line), and "how many lines of symmetry?" with the lines drawn |
| `/winkel/` | Winkel (German, EN toggle): rounds of 8 (kind, estimate, measure with a draggable, turnable Geodreieck that clicks into place, draw by dragging an arm), and a card of the angle kinds |
| `/quader/` | Quader und Würfelnetze (German, EN toggle): a 3D cuboid you size with + and −, V and O worked out, volume units, tap 6 squares to test a net (opposite faces coloured), all 11 nets, 10-question quiz |
| `/heute/` | Heute üben (German, EN toggle): 10 mixed questions from the child's level (Grundschule or Klasse 5–7) drawn from ten topics, a day streak 🔥, and progress per topic; featured at the top of the homepage |
| `/halbschriftlich/` | Halbschriftlich (German, EN toggle): three levels, fill in each part's result and the total, a picture of the split, the "digit then add the zeros" trick explained |
| `/prozent/` | Prozentrechnung (German, EN toggle): type two of G, W and p and the third is worked out with a Prozentstreifen, the Dreisatz and the formula; everyday examples, percent fractions, a quiz |
| `/gleichungssysteme/` | Gleichungssysteme (German, EN toggle): two equations in boxes, the solution set, both lines drawn, and the Gleichsetzungs-, Einsetzungs- and Additionsverfahren worked line by line, with the Probe; 🎲 tasks hide the answer until asked |
| `/function/` | Type any f(x): how it was read, its graph, and f(x) worked out step by step |
| `/tests/` | Every test from the deployed build, read from `test-results.json`      |

## Project layout

```
index.html  stats/  quadratic/  function/  einmaleins/  schriftlich/  teiler/  brueche/  stellenwerte/  groessen/  punkt-vor-strich/  gleichungssysteme/  kopfrechnen/  umfang-flaeche/  dezimalzahlen/  negative-zahlen/  sachaufgaben/  symmetrie/  winkel/  quader/  heute/  halbschriftlich/  prozent/  tests/   pages (Vite multi-page build)
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
