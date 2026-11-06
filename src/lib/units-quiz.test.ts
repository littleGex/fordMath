import { seededRandom } from "./random";
import { changeFor, formatIn, timeSpan } from "./units";
import { makeUnitsQuestion, type UnitsQuestion } from "./units-quiz";

function rightAnswer(q: UnitsQuestion): number {
  switch (q.kind) {
    case "convert": return q.base;
    case "compare": return q.left > q.right ? 0 : q.left === q.right ? 1 : 2;
    case "change": return changeFor(q.price, q.paid).change;
    case "span": return timeSpan(q.from, q.to).minutes;
  }
}

describe("makeUnitsQuestion", () => {
  it.each(["grundschule", "sek1"] as const)("%s: exactly one right answer, every choice can be written", (level) => {
    const r = seededRandom(level.length);
    const kinds = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const q = makeUnitsQuestion(level, r);
      kinds.add(q.kind);
      expect(q.choices.filter((c) => c === rightAnswer(q))).toHaveLength(1);
      expect(q.choices[q.answer]).toBe(rightAnswer(q));
      if (q.kind !== "compare") {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
      }
      if (q.kind === "convert") {
        for (const c of q.choices) expect(formatIn(c, q.quantity, q.to)).not.toBeNull();
        expect(formatIn(q.base, q.quantity, q.from)).not.toBeNull();
      }
      if (q.kind === "compare") {
        expect(formatIn(q.left, q.quantity, q.leftUnit)).not.toBeNull();
        expect(formatIn(q.right, q.quantity, q.rightUnit)).not.toBeNull();
        expect(q.leftUnit).not.toBe(q.rightUnit);
      }
      if (q.kind === "change") expect(q.paid).toBeGreaterThan(q.price);
    }
    expect(kinds.size).toBe(4);
  });
  it("keeps Grundschule to whole minutes in 5s and simple units", () => {
    const r = seededRandom(2);
    for (let i = 0; i < 300; i++) {
      const q = makeUnitsQuestion("grundschule", r);
      if (q.kind === "span") expect(q.from.m % 5).toBe(0);
      if (q.kind === "convert") expect(["dm", "mg", "t", "d"]).not.toContain(q.from);
      if (q.kind === "change") expect(q.price % 5).toBe(0);
    }
  });
});
