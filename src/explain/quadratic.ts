import { solveQuadratic, type Complex, type QuadraticRoots, type QuadraticSolution } from "../lib";
import { prettyFor } from "../parse";
import type { Lang } from "./lang";
import type { ExplainSection } from "./types";

/** Number writing and bracketing for one language: (−5)², 2,5 or 2.5. */
function numbers(lang: Lang) {
  const n = prettyFor(lang);
  /** Wraps negatives in brackets, for substituting into a formula: (−5)². */
  const p = (x: number): string => (x < 0 ? `(${n(x)})` : n(x));
  return { n, p };
}

/** "ax² + bx + c = 0" with the real numbers, skipping zero terms and 1s: x² − 5x + 6 = 0 */
export function formatEquation(a: number, b: number, c: number, lang: Lang = "en"): string {
  const { n } = numbers(lang);
  const terms: string[] = [];
  for (const [coef, variable] of [[a, "x²"], [b, "x"], [c, ""]] as const) {
    if (coef === 0) continue;
    const size = Math.abs(coef) === 1 && variable ? "" : n(Math.abs(coef));
    const sign = coef < 0 ? (terms.length ? " − " : "−") : terms.length ? " + " : "";
    terms.push(sign + size + variable);
  }
  return `${terms.join("") || "0"} = 0`;
}

export function formatComplex({ re, im }: Complex, lang: Lang = "en"): string {
  const { n } = numbers(lang);
  const imag = Math.abs(im) === 1 ? "i" : `${n(Math.abs(im))}i`;
  if (re === 0) return im < 0 ? `−${imag}` : imag;
  return `${n(re)} ${im < 0 ? "−" : "+"} ${imag}`;
}

/** Short answer for a results tile. */
export function formatRoots(roots: QuadraticRoots, lang: Lang = "en"): string {
  const { n } = numbers(lang);
  const de = lang === "de";
  const or = de ? "oder" : "or";
  switch (roots.kind) {
    case "two-real":
      return `x = ${n(roots.roots[0])} ${or} x = ${n(roots.roots[1])}`;
    case "repeated":
      return `x = ${n(roots.root)} ${de ? "(doppelt)" : "(twice)"}`;
    case "complex":
      return `x = ${formatComplex(roots.roots[0], lang)} ${or} ${formatComplex(roots.roots[1], lang)}`;
    case "linear":
      return `x = ${n(roots.root)}`;
    case "no-solution":
      return de ? "Keine Lösung" : "No solution";
    case "every-x":
      return de ? "Jedes x passt" : "Every x works";
    default: {
      // If a new kind is added to QuadraticRoots and not handled above, this line stops compiling.
      const unreachable: never = roots;
      return unreachable;
    }
  }
}

function solvingSteps(s: QuadraticSolution, lang: Lang): string[] {
  const { n, p } = numbers(lang);
  const de = lang === "de";
  const { a, b, c, roots } = s;
  const times = de ? "·" : "×";
  const over = de ? ":" : "÷";
  /** (x − 3), (x + 2), or x for a root of 0. */
  const factor = (r: number): string => (r === 0 ? "x" : r < 0 ? `(x + ${n(-r)})` : `(x − ${n(r)})`);
  const leading = (k: number): string => (k === 1 ? "" : k === -1 ? "−" : n(k));

  if (a === 0) {
    const steps = [de ? "a = 0, es gibt also kein x². Das ist eine Gerade, keine quadratische Gleichung." : "a = 0, so there is no x² term. This is a straight line, not a quadratic."];
    if (roots.kind === "linear") {
      steps.push(
        de
          ? `Löse ${formatEquation(0, b, c, lang)}: Bring c auf die andere Seite, ${n(b)}x = ${n(-c)}, dann teile durch ${p(b)}: x = ${n(roots.root)}`
          : `Solve ${formatEquation(0, b, c, lang)}: move c to the other side to get ${n(b)}x = ${n(-c)}, then divide by ${p(b)}: x = ${n(roots.root)}`,
      );
    } else if (roots.kind === "no-solution") {
      steps.push(de ? `Mit b = 0 heißt die Gleichung ${n(c)} = 0. Das stimmt nie, also gibt es keine Lösung.` : `With b = 0 too, the equation says ${n(c)} = 0, which is never true, so there is no solution.`);
    } else {
      steps.push(de ? "Alle Zahlen sind 0, die Gleichung heißt 0 = 0. Das stimmt für jedes x." : "Every coefficient is 0, so the equation says 0 = 0, which is true for every x.");
    }
    return steps;
  }

  const D = s.discriminant!;
  const steps = [
    de ? `Vergleiche mit ax² + bx + c = 0: a = ${n(a)}, b = ${n(b)}, c = ${n(c)}` : `Compare with ax² + bx + c = 0: a = ${n(a)}, b = ${n(b)}, c = ${n(c)}`,
    `${de ? "Berechne die Diskriminante" : "Work out the discriminant"}: D = b² − 4ac = ${p(b)}² − 4 ${times} ${p(a)} ${times} ${p(c)} = ${n(b * b)} − ${p(4 * a * c)} = ${n(D)}`,
  ];

  if (roots.kind === "two-real") {
    const sqrtD = Math.sqrt(D);
    const root = Number.isInteger(sqrtD) ? n(sqrtD) : `√${n(D)}`;
    // Match the textbook "+" and "−" answers to the accurately computed roots.
    const naivePlus = (-b + sqrtD) / (2 * a);
    const [r1, r2] = roots.roots;
    const [plus, minus] = Math.abs(naivePlus - r1) < Math.abs(naivePlus - r2) ? [r1, r2] : [r2, r1];
    const formula = `x = (−b ± √D) ${over} 2a = (${n(-b)} ± ${root}) ${over} ${p(2 * a)}` + (Number.isInteger(sqrtD) ? "" : ` = (${n(-b)} ± ${n(sqrtD)}) ${over} ${p(2 * a)}`);
    steps.push(
      de ? "D ist positiv, der Graph schneidet die x-Achse also an zwei Stellen: Es gibt zwei verschiedene Lösungen." : "D is positive, so the graph crosses the x-axis at two points: there are two different roots.",
      de ? `Setze in die Mitternachtsformel (abc-Formel) ein: ${formula}` : `Use the quadratic formula: ${formula}`,
      de ? `Mit + kommt x = ${n(plus)} heraus, mit − kommt x = ${n(minus)} heraus` : `Taking + gives x = ${n(plus)}; taking − gives x = ${n(minus)}`,
    );
    if (de && a === 1) steps.push(pqStep(b, c, lang));
    if (c !== 0 && b * b > 1e6 * Math.abs(4 * a * c)) {
      steps.push(
        de
          ? "Weil b² viel größer als 4ac ist, sind −b und √D fast gleich, und beim Abziehen fast gleicher Zahlen verliert ein Computer Genauigkeit. Darum wird die kleinere Lösung über x₁ · x₂ = c : a berechnet."
          : "Because b² is much bigger than 4ac, −b and √D are almost equal, and subtracting nearly equal numbers on a computer loses accuracy. So the smaller root is worked out from x₁ × x₂ = c ÷ a instead.",
      );
    }
    steps.push(
      `${de ? "Faktorisiert (Linearfaktoren)" : "Factorised"}: ${leading(a)}${factor(r1)}${factor(r2)} = 0`,
      de
        ? `Probe (Satz von Vieta): Die Lösungen ergeben zusammen −b : a = ${n(-b / a)} und mal genommen c : a = ${n(c / a)}. Stimmt: ${n(r1)} + ${p(r2)} = ${n(r1 + r2)} und ${p(r1)} · ${p(r2)} = ${n(r1 * r2)}`
        : `Check: the roots should add up to −b ÷ a = ${n(-b / a)} and multiply to c ÷ a = ${n(c / a)}. They do: ${n(r1)} + ${p(r2)} = ${n(r1 + r2)} and ${p(r1)} × ${p(r2)} = ${n(r1 * r2)}`,
    );
  } else if (roots.kind === "repeated") {
    steps.push(
      de ? "D ist null, der Graph berührt die x-Achse also nur: Es gibt eine doppelte Lösung." : "D is zero, so the graph just touches the x-axis: there is one repeated root.",
      de ? `Mit D = 0 fällt das ± weg: x = −b : 2a = ${n(-b)} : ${p(2 * a)} = ${n(roots.root)}` : `With D = 0 the ± part disappears: x = −b ÷ 2a = ${n(-b)} ÷ ${p(2 * a)} = ${n(roots.root)}`,
      `${de ? "Faktorisiert" : "Factorised"}: ${leading(a)}${factor(roots.root)}² = 0`,
    );
  } else if (roots.kind === "complex") {
    const im = Math.sqrt(-D);
    const [z1, z2] = [formatComplex(roots.roots[0], lang), formatComplex(roots.roots[1], lang)];
    if (de) {
      steps.push(
        "D ist negativ, der Graph erreicht die x-Achse also nie: Es gibt keine reelle Lösung. In der Schule heißt das L = { }.",
        `Wer weiterrechnen will: Wurzeln aus negativen Zahlen schreibt man mit i, wobei i² = −1: √D = √(${n(D)}) = ${n(im)}i`,
        `x = (−b ± √D) : 2a = (${n(-b)} ± ${n(im)}i) : ${p(2 * a)}, also x = ${z1} oder x = ${z2}`,
        "Das sind komplexe Zahlen: ein reeller Teil plus oder minus ein imaginärer Teil. Sie kommen immer als solches Paar (Oberstufe).",
      );
    } else {
      steps.push(
        "D is negative, so the graph never reaches the x-axis: there are no real roots.",
        `Square roots of negative numbers use i, where i² = −1: √D = √(${n(D)}) = ${n(im)}i`,
        `x = (−b ± √D) ÷ 2a = (${n(-b)} ± ${n(im)}i) ÷ ${p(2 * a)}, so x = ${z1} or x = ${z2}`,
        "These are complex numbers: a real part plus or minus an imaginary part. They always come as a pair like this.",
      );
    }
  }
  return steps;
}

/** The p-q-Formel, which German schools use when a = 1: x = −p/2 ± √((p/2)² − q). */
function pqStep(pCoef: number, q: number, lang: Lang): string {
  const { n, p } = numbers(lang);
  const half = pCoef / 2;
  return `Weil a = 1 ist, geht auch die p-q-Formel mit p = ${n(pCoef)} und q = ${n(q)}: x = −p/2 ± √((p/2)² − q) = ${n(-half)} ± √(${p(half)}² − ${p(q)}) = ${n(-half)} ± ${n(Math.sqrt(half * half - q))}`;
}

function graphSteps(s: QuadraticSolution, lang: Lang): string[] {
  const { n, p } = numbers(lang);
  const de = lang === "de";
  const { a, b, c } = s;
  if (!s.parabola) {
    const line = formatEquation(0, b, c, lang).replace(" = 0", "");
    if (s.roots.kind === "linear") {
      return [de ? `Der Graph y = ${line} ist eine Gerade mit der Steigung ${n(b)}; sie schneidet die y-Achse bei y = ${n(c)}.` : `The graph y = ${line} is a straight line with slope ${n(b)}, crossing the y-axis at y = ${n(c)}.`];
    }
    return [de ? `Der Graph ist die waagerechte Gerade y = ${n(c)}.` : `The graph is the flat line y = ${n(c)}.`];
  }
  const { vertex, opens } = s.parabola;
  const [h, k] = [n(vertex.x), n(vertex.y)];
  if (de) {
    return [
      `Der Scheitelpunkt liegt bei x = −b : 2a = ${n(-b)} : ${p(2 * a)} = ${h}`,
      `Einsetzen: y = ${n(a)} · ${p(vertex.x)}² + ${p(b)} · ${p(vertex.x)} + ${p(c)} = ${k}, also ist der Scheitelpunkt S(${h} | ${k})`,
      `Scheitelpunktform: y = ${a === 1 ? "" : a === -1 ? "−" : n(a)}(x ${vertex.x < 0 ? "+" : "−"} ${n(Math.abs(vertex.x))})² ${vertex.y < 0 ? "−" : "+"} ${n(Math.abs(vertex.y))}`,
      `Der Graph ist symmetrisch zur Geraden x = ${h}` + (s.roots.kind === "two-real" ? ", die beiden Nullstellen liegen also gleich weit links und rechts davon." : "."),
      opens === "up"
        ? `a ist positiv, die Parabel ist also nach oben geöffnet (∪) und der Scheitelpunkt ist der tiefste Punkt: y wird nie kleiner als ${k}.`
        : `a ist negativ, die Parabel ist also nach unten geöffnet (∩) und der Scheitelpunkt ist der höchste Punkt: y wird nie größer als ${k}.`,
      `Sie schneidet die y-Achse bei x = 0, also bei y = c = ${n(c)}.`,
    ];
  }
  return [
    `The turning point (vertex) is at x = −b ÷ 2a = ${n(-b)} ÷ ${p(2 * a)} = ${h}`,
    `Put that back in: y = ${n(a)} × ${p(vertex.x)}² + ${p(b)} × ${p(vertex.x)} + ${p(c)} = ${k}, so the vertex is (${h}, ${k})`,
    `The graph is symmetric about the line x = ${h}` + (s.roots.kind === "two-real" ? ", so the two roots are the same distance either side of it." : "."),
    opens === "up"
      ? `a is positive, so the parabola opens upwards (∪) and the vertex is its lowest point: y never goes below ${k}.`
      : `a is negative, so the parabola opens downwards (∩) and the vertex is its highest point: y never goes above ${k}.`,
    `It crosses the y-axis where x = 0, at y = c = ${n(c)}.`,
  ];
}

/** Step-by-step working for ax² + bx + c = 0, using the user's numbers. */
export function explainQuadratic(a: number, b: number, c: number, lang: Lang = "en"): ExplainSection[] {
  const s = solveQuadratic(a, b, c);
  return [
    { title: lang === "de" ? "Lösen" : "Solving it", steps: solvingSteps(s, lang) },
    { title: lang === "de" ? "Der Graph" : "The graph", steps: graphSteps(s, lang) },
  ];
}
