import { eq, makeSystem, solveSystem, type Equation } from "../lib/linear-system";
import { seededRandom } from "../lib/random";
import { rat } from "../lib/rational";
import { checkStep, linear, methodWork, METHODS, num, solutionText, type Method, type WorkStep } from "./linear-system";

/** Each step as "say" followed by its lines, "tag | math | op", for readable expectations. */
function work(e1: Equation, e2: Equation, m: Method, lang: "de" | "en" = "de"): string[][] {
  const w = methodWork(e1, e2, m, lang);
  if (!w.ok) return [[w.why]];
  return w.steps.map((s: WorkStep) => [s.say, ...s.lines.map((l) => [l.tag ?? "", l.math, l.op ?? ""].join(" | "))]);
}
const mathOnly = (e1: Equation, e2: Equation, m: Method): string[] =>
  work(e1, e2, m).flatMap((s) => s.slice(1).map((l) => l.split(" | ")[1]!));

const BOOK = [eq(2, 3, 13), eq(1, -1, -1)] as const; // x = 2, y = 3

describe("writing numbers and terms", () => {
  it("uses a real minus and fractions", () => {
    expect(num(rat(-7, 5))).toBe("−7/5");
    expect(linear([[rat(1), "x"], [rat(-1), "y"]], rat(-4))).toBe("x − y − 4");
    expect(linear([[rat(-2, 3), "x"]], rat(13, 3))).toBe("−2/3·x + 13/3");
    expect(linear([[rat(0), "x"]])).toBe("0");
  });
});

describe("Gleichsetzungsverfahren", () => {
  it("isolates y in both, sets them equal, puts x back", () => {
    expect(work(...BOOK, "gleich")).toEqual([
      ["Löse beide Gleichungen nach y auf.",
        "(I) | 2x + 3y = 13 | | − 2x", " | 3y = −2x + 13 | | : 3", "(I') | y = −2/3·x + 13/3 | ",
        "(II) | x − y = −1 | | − x", " | −y = −x − 1 | | : (−1)", "(II') | y = x + 1 | "],
      ["Die rechten Seiten sind beide gleich y, also sind sie auch gleich groß. Setze sie gleich und löse nach x auf.",
        " | −2/3·x + 13/3 = x + 1 | | − x", " | −5/3·x + 13/3 = 1 | | − 13/3", " | −5/3·x = −10/3 | | · (−3/5)", " | x = 2 | "],
      ["Setze x = 2 in (I') ein.", " | y = −2/3·2 + 13/3 = 3 | "],
    ]);
  });
  it("needs a variable that's in both equations", () => {
    expect(work(eq(1, 0, 4), eq(0, 1, -2), "gleich")[0]![0]).toContain("Einsetzungsverfahren");
  });
});

describe("Einsetzungsverfahren", () => {
  it("picks the variable without a number in front and multiplies the brackets out", () => {
    expect(work(...BOOK, "einsetz")).toEqual([
      ["Löse (II) nach x auf, denn dort steht x ohne Vorfaktor.", "(II) | x − y = −1 | | + y", "(II') | x = y − 1 | "],
      ["Setze den Term für x in (I) ein. Jetzt kommt nur noch y vor: ausmultiplizieren, zusammenfassen, lösen.",
        "(I) | 2·(y − 1) + 3y = 13 | ", " | 2y − 2 + 3y = 13 | ", " | 5y − 2 = 13 | | + 2", " | 5y = 15 | | : 5", " | y = 3 | "],
      ["Setze y = 3 in (II') ein.", " | x = 3 − 1 = 2 | "],
    ]);
  });
});

describe("Additionsverfahren", () => {
  it("multiplies one equation so x cancels", () => {
    expect(work(...BOOK, "addition")).toEqual([
      ["Multipliziere die Gleichungen so, dass vor x entgegengesetzte Zahlen stehen (2x und −2x).",
        "(II) | x − y = −1 | | · (−2)", "(II') | −2x + 2y = 2 | "],
      ["Addiere die beiden Gleichungen: x fällt weg, und es bleibt eine Gleichung nur mit y.", "(I) + (II') | 5y = 15 | | : 5", " | y = 3 | "],
      ["Setze y = 3 in (I) ein.", "(I) | 2x + 3·3 = 13 | ", " | 2x + 9 = 13 | | − 9", " | 2x = 4 | | : 2", " | x = 2 | "],
    ]);
  });
  it("multiplies both when needed, by the smallest numbers", () => {
    expect(mathOnly(eq(3, 4, 10), eq(5, -6, 4), "addition").slice(0, 6)).toEqual([
      "3x + 4y = 10", "9x + 12y = 30", "5x − 6y = 4", "10x − 12y = 8", "19x = 38", "x = 2",
    ]);
  });
  it("uses an equation that's missing a variable straight away", () => {
    expect(work(eq(0, 2, 6), eq(3, 1, 9), "addition")[0]![0]).toBe("In (I) kommt kein x vor. Löse (I) direkt nach y auf.");
  });
});

describe("no solution and infinitely many", () => {
  it.each(["gleich", "einsetz", "addition"] as const)("%s ends in a false statement for parallel lines", (m) => {
    const steps = work(eq(1, 2, 3), eq(2, 4, 7), m);
    expect(steps.at(-1)![0]).toContain("falsche Aussage");
    expect(steps.at(-2)!.at(-1)).toMatch(/\| 0 = /);
  });
  it.each(["gleich", "einsetz", "addition"] as const)("%s ends in a true statement for the same line", (m) => {
    expect(work(eq(1, 2, 3), eq(-2, -4, -6), m).at(-1)![0]).toContain("wahre Aussage");
  });
  it("explains 0 = 5 once, whatever the method", () => {
    for (const m of METHODS) expect(work(eq(0, 0, 5), eq(1, 1, 2), m)).toEqual([["(I) enthält weder x noch y: Sie heißt 0 = 5. Das ist nie wahr, also gibt es keine Lösung."]]);
  });
});

describe("zeichnerisch", () => {
  it("writes y = mx + n and reads off the crossing", () => {
    const steps = work(...BOOK, "graph");
    expect(steps[1]![0]).toBe("Gerade (I): Sie schneidet die y-Achse bei 13/3 und hat die Steigung −2/3.");
    expect(steps.at(-1)![0]).toContain("S(2 | 3)");
  });
  it("handles a vertical line", () => {
    expect(work(eq(1, 0, 4), eq(0, 1, -2), "graph")[1]![0]).toBe("(I) enthält kein y: Das ist eine senkrechte Gerade.");
  });
});

describe("Probe and the solution set", () => {
  it("puts the answer back into both equations", () => {
    expect(checkStep(...BOOK, rat(2), rat(3), "de").lines.map((l) => `${l.tag} ${l.math}`)).toEqual([
      "(I) 2·2 + 3·3 = 4 + 9 = 13 ✓",
      "(II) 2 − 3 = −1 ✓",
    ]);
  });
  it("writes the solution set", () => {
    expect(solutionText(solveSystem(...BOOK), "de").set).toBe("L = {(2 | 3)}");
    expect(solutionText(solveSystem(eq(1, 1, 3), eq(1, -1, 0)), "de").say).toContain("x = 3/2 = 1,5");
    expect(solutionText(solveSystem(eq(1, 2, 3), eq(2, 4, 7)), "en").set).toBe("L = { }");
  });
});

describe("every method, on many random systems", () => {
  it.each(METHODS)("%s reaches the right answer and never prints nonsense", (m) => {
    const r = seededRandom(80);
    for (let i = 0; i < 200; i++) {
      const { e1, e2, x, y } = makeSystem(r);
      for (const lang of ["de", "en"] as const) {
        const text = work(e1, e2, m, lang).flat().join("\n");
        expect(text).not.toMatch(/undefined|NaN|\+ −|− −|(?<![\d/])1[xy]/);
      }
      if (m === "graph") continue;
      const lines = mathOnly(e1, e2, m);
      const found = lines.filter((l) => /^[xy] = /.test(l)).map((l) => l.split(" = ").at(-1));
      expect(found).toContain(num(rat(x)));
      expect(found).toContain(num(rat(y)));
    }
  });
});
