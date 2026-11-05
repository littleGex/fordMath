# fordMath dev guide: learning TypeScript by adding features

This guide is for building fordMath features yourself while learning TypeScript along the way. Every idea points at real code in this repo, so you can open the file and see it working.

**How to use it:** read parts 1–3 once. Then do the [warm-up exercise](#7-warm-up-add-range-to-statistics) with the guide open. Then pick an issue from the [exercise ladder](#8-your-turn-the-exercise-ladder). Use part 4 as a reference whenever a TypeScript feature confuses you.

1. [Setup and the daily loop](#1-setup-and-the-daily-loop)
2. [How the project fits together](#2-how-the-project-fits-together)
3. [The recipe for a new helper](#3-the-recipe-for-a-new-helper)
4. [TypeScript, explained with this codebase](#4-typescript-explained-with-this-codebase)
5. [Testing with Vitest](#5-testing-with-vitest)
6. [Worked examples: how #2 and #1 were built](#6-worked-examples-how-2-and-1-were-built)
7. [Warm-up: add Range to Statistics](#7-warm-up-add-range-to-statistics)
8. [Your turn: the exercise ladder](#8-your-turn-the-exercise-ladder)
9. [Compiler errors you'll meet, and what they mean](#9-compiler-errors-youll-meet-and-what-they-mean)
10. [Cheat sheet](#10-cheat-sheet)

---

## 1. Setup and the daily loop

```bash
git clone https://github.com/littleGex/fordMath.git
cd fordMath
npm install
```

Open two terminals and leave them running while you work:

```bash
npm run test:watch      # re-runs the tests every time you save
npm run dev -- --host   # local site; --host also shows a URL you can open on your iPhone on the same Wi-Fi
```

Before you push, run what CI runs:

```bash
npm run build           # tsc type-checks everything, then Vite builds
npm test
```

Use an editor that understands TypeScript (VS Code, WebStorm). Hover over any name to see its type: that is the single most useful learning tool. Try it on `roots` inside `formatRoots` in `src/explain/quadratic.ts` and watch the type change from case to case.

## 2. How the project fits together

```
              ┌──────────────────────────┐
  you type →  │ src/pages/*.ts  (DOM)    │  reads inputs, draws results and plots
              └────────────┬─────────────┘
                           │ calls
              ┌────────────▼─────────────┐
              │ src/explain/*.ts         │  turns a calculation into worked steps (text)
              └────────────┬─────────────┘
                           │ calls
              ┌────────────▼─────────────┐
              │ src/lib/*.ts             │  the maths: pure functions, no DOM
              └──────────────────────────┘
```

The arrows only point down. `lib` never imports from `explain` or `pages`, and `explain` never touches the DOM. That rule is what makes the maths easy to test: a test can call `solveQuadratic(1, -5, 6)` without a browser.

| Folder / file | What lives there | Tested? |
| --- | --- | --- |
| `src/lib/` | The maths. One module per helper, with `*.test.ts` beside it | Yes, thoroughly |
| `src/lib/index.ts` | The public API: what other code may import | – |
| `src/explain/` | `explain…()` functions that return steps as strings | Yes |
| `src/parse.ts` | Text → numbers, numbers → nice text | Yes |
| `src/registry.ts` | The list of helpers the Statistics page shows | Through the page |
| `src/pages/` | One entry script per HTML page | By looking at it |
| `src/styles/zone.css` | The shared Game Zone look | By looking at it |
| `*/index.html` | Each page. New pages must also be added to `vite.config.ts` | – |
| `.github/workflows/deploy.yml` | CI: test, then build, then deploy | – |

**CI is your safety net.** Every push to `main` runs all the tests. If any fail, nothing is deployed and the live site stays as it was. The Tests page shows exactly what ran.

## 3. The recipe for a new helper

The same eight steps work for every issue:

1. **Branch.** `git switch -c issue-7-primes`
2. **Design the types first.** Write the function signatures and return types in `src/lib/<name>.ts` with a body of `throw new Error("todo")`. Deciding what the function returns is most of the design. See [4.3](#43-discriminated-unions-one-type-many-shapes).
3. **Write failing tests.** In `src/lib/<name>.test.ts`, use the cases listed in the issue. Watch them go red.
4. **Make them pass**, one at a time. Keep the public function as validate-then-delegate (see [4.9](#49-modules-public-vs-internal)).
5. **Write the explanation.** In `src/explain/<name>.ts`, return `ExplainSection[]` (or `string[]` for the Statistics registry), test it, and use the user's numbers in every step.
6. **Build the page.** Copy the closest existing page (`quadratic/` for fixed inputs, `function/` for typed expressions), add it to `vite.config.ts`, and turn its homepage tile from planned to ready: point `href` at the page, remove the `planned` class, set the badge to "Ready", and keep its `data-levels` (`grundschule`, `sek1`, `oberstufe`), which drive the level chips.
7. **Update the README**, with a row in the helpers table and the pages table.
8. **Open a pull request** with `Closes #7` in its description. CI runs on the PR, and when you merge, GitHub closes the issue and deploys.

## 4. TypeScript, explained with this codebase

Each section explains one idea, points to where it lives in the code, and ends with a small **Try** you can do in a couple of minutes.

### 4.1 Annotating functions, and `readonly`

```ts
// src/lib/mean.ts
export function mean(values: readonly number[]): number {
```

- `values: readonly number[]` means an array of numbers that this function promises not to change. If you write `values.sort()`, the compiler refuses, because `.sort()` changes the array in place. That's why `sortNumeric` in `validate.ts` copies first: `[...values].sort(...)`.
- `: number` after the brackets is the return type. You could leave it out and TypeScript would work it out, but writing it on exported functions documents your intent, and you get an error at the right place if the body drifts.
- TypeScript has one `number` type for both ints and floats. Use `Number.isInteger(n)` when you need a whole number (you will for #7 and #11).

**Try:** in `validate.ts`, change `[...values].sort(...)` to `values.sort(...)`, run `npx tsc --noEmit`, and read the error (`Property 'sort' does not exist on type 'readonly number[]'`). Then undo it.

### 4.2 Literal types and unions

```ts
// src/lib/deviation.ts
export type DeviationKind = "population" | "sample";
export function variance(values: readonly number[], kind: DeviationKind = "population"): number
```

A type can be a specific value. `"population" | "sample"` means "one of exactly these two strings". Calling `variance(xs, "samples")` is a compile error, which catches a typo that plain JavaScript would only find at runtime (or never). The `= "population"` gives the parameter a default value.

**Try:** call `variance([1, 2], "Sample")` in a test and read the error message.

### 4.3 Discriminated unions: one type, many shapes

This is the most useful idea in the codebase. A quadratic can have two roots, one, two complex ones, or (when `a = 0`) other answers entirely. Instead of one object full of optional fields, `src/lib/quadratic.ts` says exactly which shapes exist:

```ts
export type QuadraticRoots =
  | { kind: "two-real"; roots: [number, number] }
  | { kind: "repeated"; root: number }
  | { kind: "complex"; roots: [Complex, Complex] }
  | { kind: "linear"; root: number }
  | { kind: "no-solution" }
  | { kind: "every-x" };
```

The shared field `kind` is the **discriminant** (the tag). When you check it, TypeScript **narrows** the type to the matching shape:

```ts
if (s.roots.kind === "two-real") {
  s.roots.roots[0];   // ✓ TypeScript knows .roots exists here
}
s.roots.root;         // ✗ error: on most shapes there is no .root
```

Notice also `[number, number]`. That's a **tuple**, an array of exactly two numbers, so `roots[1]` is always a number and there is no `roots[2]`.

You'll use the same pattern for simultaneous equations (#10: unique, none or infinitely many solutions), long division steps (#12: divide, multiply, subtract, bring down) and fraction questions (#13).

**Try:** in a test, write `const r = solveQuadratic(1, 2, 5).roots;` then hover over `r`. Add `if (r.kind === "complex") { r. }` and look at what the autocomplete offers inside the `if`.

### 4.4 Exhaustiveness with `never`

```ts
// src/explain/quadratic.ts, in formatRoots
switch (roots.kind) {
  case "two-real": ...
  // ... every kind ...
  default: {
    const unreachable: never = roots;
    return unreachable;
  }
}
```

`never` is the type with no values. After every case has been handled, `roots` has been narrowed to `never`, so the assignment compiles. If someone later adds `{ kind: "one-real-one-complex" }` to `QuadraticRoots`, this line stops compiling. The compiler then tells you every switch that needs updating, so you don't find out from a bug.

`evaluate` in `src/lib/expression/evaluate.ts` uses the same trick for expression nodes.

**Try:** add `| { kind: "test" }` to `QuadraticRoots` and run `npx tsc --noEmit`. Read where it complains, then remove it.

### 4.5 `null`, `undefined`, `!` and `?.`

`tsconfig.json` has `"strict": true`, so `null` and `undefined` must be handled explicitly:

- `discriminant: number | null` in `QuadraticSolution` means "there's no discriminant when a = 0". Code that uses it has to check first.
- `s.parabola?.opens` is **optional chaining**: it gives `undefined` instead of crashing when `parabola` is `null`.
- `values[0]!` is a **non-null assertion**: "trust me, this isn't undefined". We also turned on `noUncheckedIndexedAccess`, which makes `arr[i]` have type `number | undefined`, because the index might be out of range. Use `!` only where you've already checked (as in `rangeUnchecked`, after validation proved the array isn't empty).
- `x ?? 0` gives `0` only when `x` is `null` or `undefined`, unlike `x || 0`, which also replaces a real `0`. See `counts.get(v) ?? 0` in `mode.ts`.

**Rule of thumb:** throw for input that's wrong (`assertValid`), and return `null` or a union for answers that legitimately don't exist (`sampleStdDev: number | null`).

### 4.6 `as const`, `keyof typeof` and `satisfies`

```ts
// src/lib/expression/builtins.ts
export const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  // ...
} satisfies Record<string, (x: number) => number>;

export type FunctionName = keyof typeof FUNCTIONS;   // "sin" | "cos" | ...
```

- `typeof FUNCTIONS` turns a value into its type, and `keyof` takes that type's keys. So the list of names has a single source of truth: add `cosh: Math.cosh` and `FunctionName` updates itself.
- `satisfies` checks that every entry is a number-to-number function without widening the type to plain `Record<string, …>`, which would lose the exact key names.
- `as const` freezes a literal so TypeScript keeps exact values instead of `string`. In `src/pages/quadratic.ts`: `const NAMES = ["a", "b", "c"] as const;`, and then `type Name = (typeof NAMES)[number]` is `"a" | "b" | "c"`.

**Try:** add `cosh: Math.cosh` to `FUNCTIONS`, and type `cosh(0)` into the Functions page in `npm run dev`. You've added a feature in one line. Add a test for it.

### 4.7 Type guards, and why `Object.hasOwn` matters

```ts
export const isFunctionName = (name: string): name is FunctionName => Object.hasOwn(FUNCTIONS, name);
```

The return type `name is FunctionName` makes this a **type guard**. Inside `if (isFunctionName(t.name)) { … }`, TypeScript treats `t.name` as a `FunctionName`, so `FUNCTIONS[t.name]` type-checks.

`Object.hasOwn` instead of `name in FUNCTIONS` is a safety point: every object inherits `constructor`, `toString` and others, so `"constructor" in FUNCTIONS` is `true`. The safety tests in `evaluate.test.ts` prove those names are rejected.

`e instanceof ExpressionError` is a built-in type guard too. That's how `catch` blocks get from `unknown` to something with an `.index`.

### 4.8 Recursive types and recursive functions

```ts
// src/lib/expression/ast.ts
export type Expr =
  | { type: "num"; value: number }
  | { type: "var" }
  | { type: "neg"; arg: Expr }                                 // ← Expr inside Expr
  | { type: "binary"; op: Operator; left: Expr; right: Expr }
  // ...
```

A type may refer to itself, which is how you describe a tree of any depth. Functions that walk it call themselves on each child: `evaluate` (value), `formatExpr` (text) and `collectSteps` in `src/explain/expression.ts` (the working). Each one has the same shape: a `switch` on `type`, with the children handled by recursion.

**Try:** write `countNodes(e: Expr): number` in a test file. A leaf counts 1; a node counts 1 plus its children. Check `countNodes(parse("x^2 + 1"))` is 5.

### 4.9 Modules: public vs internal

Each helper exports two layers:

```ts
export function meanUnchecked(values: readonly number[]): number { … }  // fast, trusts its input
export function mean(values: readonly number[]): number {               // safe, for everyone
  assertValid(values);
  return meanUnchecked(values);
}
```

`src/lib/index.ts` re-exports only the public ones. Orchestrators like `getStats` validate once, then call the unchecked versions, so a big list isn't checked three times over. `export type { … }` / `import type { … }` bring in types only; they disappear from the built JavaScript.

### 4.10 Classes (used sparingly)

Most of fordMath is plain functions, but two classes show the syntax:

```ts
// src/lib/expression/errors.ts
export class ExpressionError extends Error {
  constructor(message: string, public readonly index: number) {
    super(message);
  }
}
```

`public readonly index` in the constructor's parameter list is a **parameter property**: it declares the field and assigns it in one go. `Parser` in `parse.ts` uses `private readonly tokens` the same way, plus a `private i = 0` cursor. `private` is checked by the compiler, so code outside the class can't touch `parser.i`.

### 4.11 Generics, briefly

```ts
document.querySelector<HTMLInputElement>("#coef-a")   // returns HTMLInputElement | null
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
```

`<T>` is a type parameter, so the caller chooses the type. `extends HTMLElement` limits what may be chosen, and `= HTMLElement` is the default. You'll mostly *use* generics (`Map<number, number>` in `mode.ts`, `Record<Name, HTMLInputElement>`, `Array<…>`) rather than write them.

## 5. Testing with Vitest

The basics, all from this repo:

```ts
describe("median", () => {                                            // a group
  it("averages the middle pair of an even count", () => {             // one test
    expect(median([1, 2, 3, 4])).toBe(2.5);                           // one check
  });
});
```

| Matcher | Use for | Example |
| --- | --- | --- |
| `toBe` | Numbers, strings, booleans (exact, using `Object.is`) | `expect(mean([1, 2, 3, 4])).toBe(2.5)` |
| `toEqual` | Arrays and objects, compared by content | `expect(mode([3, 3, 1, 1])).toEqual([1, 3])` |
| `toBeCloseTo` | Float results | `expect(mean([0.1, 0.2])).toBeCloseTo(0.15)` |
| `toThrow("text")` | Errors; pass a function, not a value | `expect(() => mean([])).toThrow("empty")` |
| `toBeNaN`, `toBeNull` | Special values | `expect(compile("sqrt(x)")(-1)).toBeNaN()` |

Patterns worth copying:

- **Floats:** never use `toBe` on the result of float arithmetic. `0.1 + 0.2` isn't exactly `0.3`.
- **"Why" tests:** `quadratic.test.ts` has a test proving the textbook formula is 25% wrong for `x² + 10⁸x + 1`. Tests can document *why* the code is the way it is.
- **Many inputs with one test:** `it.each([...])("rejects %s", (text) => …)` in `evaluate.test.ts`.
- **Round trips and properties:** `format.test.ts` checks that formatting then re-parsing gives the same values. For #11 and #12, check `longMultiply(a, b)` against `a * b` for a few hundred random pairs: a few lines that catch almost everything.
- **Spies:** `vi.spyOn(validate, "assertValid")` in `stats.test.ts` proves validation runs once.
- **Run one file:** `npx vitest run src/lib/quadratic.test.ts`, or put `.only` on one `it` while you focus (and remove it before committing).

## 6. Worked examples: how #2 and #1 were built

### Quadratics (#2), in the order it was written

1. **Types first:** `QuadraticRoots`, `Parabola` and `QuadraticSolution` in `src/lib/quadratic.ts`, before any maths. Deciding that "a = 0" was its own set of shapes (`linear`, `no-solution`, `every-x`) settled most of the edge cases up front.
2. **Tests from the issue:** integer roots, a repeated root, complex roots, a = 0, floats and the cancellation case.
3. **The maths**, using the stable `q = −½(b + sign(b)·√D)` form. A test then caught a real bug: for `b = 10²⁰⁰`, `b²` overflows to Infinity, and the tolerance check turned Infinity into 0. The fix was to check `Number.isFinite` first. Edge-case tests pay off.
4. **Explanation:** `explainQuadratic` returns two sections. It uses `formatRoots` (exhaustive `switch`) and small helpers like `p(x)`, which brackets negatives: `(−5)²`, not `−5²`.
5. **Page:** inputs with ± buttons (the iPhone decimal keypad has no minus key), result tiles, and an SVG plot. The plot is built with one `el()` helper and two scale functions, `X()` and `Y()`, that map maths coordinates to pixels.

### The expression parser (#1): a classic pipeline

```
"2x^2 + 1"  →  tokenize  →  [2] [x] [^] [2] [+] [1] [end]  →  parse  →  tree  →  evaluate(tree, 3) → 19
```

- **`tokenize.ts`** reads characters left to right into tokens, using a discriminated union again (`kind: "number" | "name" | …`). Each token remembers its position, so errors can point at the problem.
- **`parse.ts`** is a *recursive-descent* parser, with one method per precedence level. Read the grammar comment at the top, then `expression()` → `term()` → `unary()` → `power()` → `primary()`. Precedence comes from which method calls which.
- **`evaluate.ts`** walks the tree. `compile(text)` parses once and returns a function that can be called thousands of times. The Functions page does the same by hand: it parses once, then evaluates the tree at 401 points per redraw.
- **`format.ts`** writes the tree back with only the brackets that are needed, which is how the page shows "Read as: x^2 + 3·sin(x)".

**Try:** step through `parse("1 + 2 * 3")` with a debugger or `console.log` in each method, and watch `term()` grab `2 * 3` before `expression()` adds the `1`.

### Einmaleins (#14): new TypeScript ideas worth reading

`src/lib/times-tables.ts`, `src/explain/times-tables.ts` and `src/pages/einmaleins.ts` add a few ideas the earlier helpers didn't need:

- **Template literal types:** `type FactKey = \`${"m" | "d"}:${number}x${number}\``, so only strings like `"m:7x8"` are allowed as keys.
- **`Partial<Record<FactKey, FactStats>>`** for `Mastery`: a lookup where most keys are missing, so `mastery[key]` has type `FactStats | undefined` and must be checked.
- **Your own generic function:** `pickWeighted<T>(items: readonly T[], weight: (item: T) => number, random: Random): T` in `src/lib/random.ts` works for questions, fractions or anything else, and returns the same type it was given.
- **Passing randomness in** (`random: Random`) instead of calling `Math.random()` inside, so tests use `seededRandom(42)` and get the same round every time.
- **Returning new objects instead of changing old ones:** `record(mastery, key, correct)` returns an updated copy, and a test checks the original is untouched.
- **`satisfies Record<Lang, Words>`** for the German and English wording: forget a sentence in one language and it won't compile.
- **The page as a state machine:** `type State = { screen: "setup" } | { screen: "play"; … } | { screen: "result"; … }`, a discriminated union again. Each screen's data exists only while that screen is showing.
- **Reading `unknown` safely:** `load()` treats whatever is in `localStorage` as `unknown` and checks each field before trusting it.

### Brüche (#13): a type that can only be made one way

`src/lib/fraction.ts` uses a **branded type**:

```ts
declare const valid: unique symbol;
export type Fraction = { readonly num: number; readonly den: number } & { readonly [valid]: true };
export function fraction(num: number, den: number): Fraction { /* checks, then */ return { num, den } as Fraction; }
```

A plain object like `{ num: 1, den: 0 }` doesn't have the hidden `[valid]` property, so TypeScript won't accept it where a `Fraction` is expected. The only way to get one is `fraction()`, which rejects a 0 denominator. Every function that takes a `Fraction` can therefore trust it. The brand costs nothing at runtime: it exists only for the compiler.

The question generator test is worth reading too. It generates 300 questions per level and checks that *exactly one* choice is right each time. That test found a real bug, where the compare level could show the same fraction on both sides.

### Offline (#8): a bug the first test missed

In the first version of `e2e/offline.spec.ts`, the loop over all pages only checked that each heading appeared offline, and it passed while every script was failing to load; only the final "start a game" check caught it. The headings are plain HTML; the scripts weren't being found in the store, because the server adds `Vary: Origin` and module scripts are requested with an `Origin` header. The fix was one option (`ignoreVary: true` in `build/sw-template.js`), but the lesson is in the test: check for something only the *script* draws (a tile, a plot line), not something that's there anyway.

## 7. Warm-up: add Range to Statistics

**Goal:** a new "Range" tile on the Statistics page, showing largest − smallest, with its working. It's small, it touches every layer, and it's the first piece of #5.

### Step 1: branch

```bash
git switch -c range-warmup
```

### Step 2: types and a stub

Create `src/lib/range.ts`:

```ts
import { assertValid } from "./validate";

export interface Range {
  min: number;
  max: number;
  range: number;
}

/** @internal Assumes `values` has already been validated. */
export function rangeUnchecked(values: readonly number[]): Range {
  throw new Error("todo");
}

/** Smallest value, largest value, and the gap between them. */
export function range(values: readonly number[]): Range {
  assertValid(values);
  return rangeUnchecked(values);
}
```

### Step 3: failing tests

Create `src/lib/range.test.ts`:

```ts
import { range } from "./range";

describe("range", () => {
  it("finds the smallest, largest and the gap", () => {
    expect(range([3, -1, 4.5])).toEqual({ min: -1, max: 4.5, range: 5.5 });
  });
  it("is 0 for a single value", () => {
    expect(range([7])).toEqual({ min: 7, max: 7, range: 0 });
  });
  it("throws on an empty array", () => {
    expect(() => range([])).toThrow("empty");
  });
  it("copes with a very long list", () => {
    const big = Array.from({ length: 500_000 }, (_, i) => i);
    expect(range(big).max).toBe(499_999);
  });
});
```

With `npm run test:watch` running, you should see 3 red tests (the empty-array one already passes, because validation runs before the stub).

### Step 4: make them pass

Write `rangeUnchecked` yourself. The obvious answer is `Math.min(...values)`, which passes the first three tests. Then see what the fourth one says, and work out why.

<details>
<summary>Hint</summary>

`Math.min(...values)` passes every value as a separate argument to a function call. JavaScript limits how many arguments a call can take: around 100,000–200,000 values crash with `RangeError: Maximum call stack size exceeded`. A plain loop has no limit.
</details>

<details>
<summary>A solution</summary>

```ts
export function rangeUnchecked(values: readonly number[]): Range {
  let min = values[0]!; // ! is safe: assertValid already proved the array isn't empty
  let max = values[0]!;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max, range: max - min };
}
```
</details>

### Step 5: export it

Add to `src/lib/index.ts`:

```ts
export { range, type Range } from "./range";
```

### Step 6: the explanation

In `src/explain/statistics.ts`, add `range` to the existing `../lib` import, import `prettyNumber` from `../parse`, and add:

```ts
export function explainRange(values: readonly number[]): string[] {
  const { min, max, range: r } = range(values); // "range: r" renames, so it doesn't clash with the function
  const p = (x: number) => (x < 0 ? `(${prettyNumber(x)})` : prettyNumber(x));
  return [
    `Find the smallest value (${prettyNumber(min)}) and the largest (${prettyNumber(max)}).`,
    `Range = largest − smallest = ${prettyNumber(max)} − ${p(min)} = ${prettyNumber(r)}`,
  ];
}
```

And a test in `src/explain/statistics.test.ts`:

```ts
describe("explainRange", () => {
  it("brackets a negative smallest value", () => {
    expect(explainRange([3, -1, 4.5])[1]).toBe("Range = largest − smallest = 4.5 − (−1) = 5.5");
  });
});
```

### Step 7: put it on the page

In `src/registry.ts`, import `range` and `explainRange`, and add an entry before the standard deviation entry:

```ts
{
  id: "range", label: "Range", symbol: "R", colour: "c-quartiles",
  description: "Gap between the smallest and largest.",
  compute: (v) => range(v).range, explain: explainRange,
},
```

Check `npm run dev`: there's a new tile and a new "Range" section under "How it's worked out". You didn't touch any page code, because the registry pattern did it for you.

### Step 8: ship it

```bash
npm run build && npm test
git add -A
git commit -m "Add range to Statistics (part of #5)"
git push -u origin range-warmup
```

Open the pull request on GitHub, wait for the green tick, and merge. The site updates by itself a minute later.

## 8. Your turn: the exercise ladder

Ordered roughly from easiest to hardest to *build*, which isn't the same as the school level. #7 (Teiler), #13 (Brüche), #14 (Einmaleins), #15, #11 and #12 (written +, −, ·, :) are finished. Read #14 as an example of a game. In `src/lib/written.ts`, notice how adding two new members to the `WrittenSum` union made the compiler list every place that needed updating, and how `Extract<WrittenSum, { kind: "divide" }>` gives each function its own precise return type. Each level lists the TypeScript ideas it will exercise.

### Level 1: #18, Punkt vor Strich trainer

*Practises: reusing a tree (the expression parser from #1), recursion, and the game state machine from Einmaleins.*

Add a helper in `src/lib/expression/` that finds which node of the tree should be worked out next (the deepest, leftmost one whose children are numbers), and one that replaces that node by its value. Test both on `3 + 4 · 2` and `(3 + 4) · 2`. Then copy the setup/play/result shape of `src/pages/einmaleins.ts`.

### Level 2: #17, place value and rounding

*Practises: number formatting with `toLocaleString`, string building for German number words, and tricky edge cases.*

German number words are a good test-first exercise: write the tests for `21` ("einundzwanzig"), `101`, `1001`, `100000` and `1000000` before any code.

### Level 3: #5, quartiles

Quartiles reuses the Statistics registry, and adds an SVG box plot alongside the existing number line in `src/pages/stats.ts`.

### Level 4: #9 matrices, then #10 simultaneous equations

*Practises: generics-free but type-heavy code, `readonly` nested arrays, careful floating-point work.*

Start with the `Matrix` type and an `assertMatrix` guard. Write `multiply` with a test-first loop. Then let `solveLinearSystem` return a discriminated union (`unique` / `none` / `infinite`), exactly like `QuadraticRoots`.

### Level 5: #3 integration and #4 differentiation

*Practises: functions as values. `compile()` returns `(x: number) => number`, so your integrator takes `f: (x: number) => number`.*

Both are short in `lib` and rich on the page (shaded strips, tangent lines). Reuse the plot code from `src/pages/function.ts`.

### Using an AI assistant while learning

AI assistants are great for this, as long as you ask for **hints and reviews**, not the finished code: "my test for gcd(0, 5) fails, give me a hint, don't fix it", or "review this PR for TypeScript idioms I'm missing". Pasting a compiler error and asking what it *means* (see part 9) is also a good use.

## 9. Compiler errors you'll meet, and what they mean

| Error (shortened) | What it means | Usual fix |
| --- | --- | --- |
| `Object is possibly 'undefined'.` | You indexed an array or map, and the item might not exist (`noUncheckedIndexedAccess`) | Check it first, use `?? fallback`, or `!` if you've already proved it exists |
| `Argument of type 'string' is not assignable to parameter of type '"population" \| "sample"'.` | A plain `string` might be any string | Type the variable as the union, or use `as const` on the literal |
| `Property 'roots' does not exist on type '{ kind: "repeated"; root: number; }'.` | You haven't narrowed the union yet | Check `.kind` first (see 4.3) |
| `Type 'X' is not assignable to type 'never'.` | A `switch` is missing a case (see 4.4) | Add the case it names |
| `Function lacks ending return statement…` | Some path through the function returns nothing | Add the missing `return` or `throw` |
| `Cannot assign to '…' because it is a read-only property` / `Property 'sort' does not exist on type 'readonly number[]'` | You tried to change something marked `readonly` | Copy first: `[...values]` |
| `'x' is declared but its value is never read.` | Unused variable (`noUnusedLocals`) | Delete it, or prefix a parameter with `_` |
| `Cannot find name 'describe'.` | Test globals aren't known | Make sure the file ends in `.test.ts` and lives in `src/` |

Runtime, not compile-time: if a page shows nothing, open Safari's Web Inspector (or desktop dev tools) and read the console first.

## 10. Cheat sheet

```bash
npm run test:watch                       # tests on every save
npx vitest run src/lib/quadratic.test.ts # one file
npm run dev -- --host                    # site, also reachable from your phone
npx tsc --noEmit                         # type-check only
npm run build                            # type-check + production build
npm run test:report                      # write the Tests page data locally
npm run icons                            # redraw favicon and Home Screen icons
npm run build && npm run e2e             # browser test: every page works offline

git switch -c issue-N-name               # start work on an issue
git push -u origin issue-N-name          # then open a PR containing "Closes #N"
```

```ts
type Kind = "a" | "b";                              // union of literals
type Shape = { kind: "x"; v: number } | { kind: "y" }; // discriminated union
const NAMES = ["a", "b"] as const;                   // keep exact values
type Name = (typeof NAMES)[number];                  // "a" | "b"
type Key = keyof typeof SOME_OBJECT;                 // its keys as a union
const isKey = (s: string): s is Key => Object.hasOwn(SOME_OBJECT, s); // type guard
const pair: [number, number] = [1, 2];               // tuple
function f(xs: readonly number[]): number | null;    // read-only input, maybe-missing output
value ?? fallback;                                   // only for null / undefined
obj?.field;                                          // undefined instead of a crash
const never_: never = x;                             // "every case handled" check
```
