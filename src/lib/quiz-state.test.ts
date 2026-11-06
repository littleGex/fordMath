import { begin, current, next, pick, startState, type QuizState } from "./quiz-state";

type Q = { text: string; answer: number };
const ROUND: Q[] = [{ text: "a", answer: 0 }, { text: "b", answer: 1 }, { text: "c", answer: 2 }];

describe("quiz state", () => {
  it("starts on the start screen", () => {
    expect(startState<Q>()).toEqual({ stage: "start" });
    expect(current(startState<Q>())).toBeNull();
  });
  it("plays a round: right, wrong, right", () => {
    let s: QuizState<Q> = begin(ROUND);
    expect(current(s)).toBe(ROUND[0]);
    s = pick(s, 0, 0);
    expect(s).toMatchObject({ picked: 0, right: 1, streak: 1, results: [true] });
    s = next(s);
    expect(current(s)).toBe(ROUND[1]);
    s = pick(s, 2, 1);
    expect(s).toMatchObject({ right: 1, streak: 0, results: [true, false] });
    s = next(pick(next(s), 2, 2));
    expect(s).toEqual({ stage: "done", round: ROUND, right: 2, total: 3, results: [true, false, true] });
  });
  it("ignores a second pick and an early next", () => {
    const s = begin(ROUND);
    expect(next(s)).toBe(s); // nothing picked yet
    const once = pick(s, 1, 0);
    expect(pick(once, 0, 0)).toBe(once); // can't change the answer
  });
  it("never changes the old state", () => {
    const s = begin(ROUND);
    pick(s, 0, 0);
    expect(s).toMatchObject({ picked: null, right: 0, results: [] });
  });
  it("refuses an empty round", () => {
    expect(() => begin([])).toThrow();
  });
});
