/**
 * The life of a quiz, as plain data: start screen → questions one by one → stars at the end.
 * Generic in Q, the question type, so the same few functions run every quiz in the app.
 * Every function returns a new state and never changes the old one.
 */
export type QuizState<Q> =
  | { stage: "start" }
  | { stage: "play"; round: readonly Q[]; index: number; picked: number | null; right: number; streak: number; results: boolean[] }
  | { stage: "done"; round: readonly Q[]; right: number; total: number; results: boolean[] };

export const startState = <Q>(): QuizState<Q> => ({ stage: "start" });

export function begin<Q>(round: readonly Q[]): QuizState<Q> {
  if (round.length === 0) throw new Error("A quiz needs at least one question");
  return { stage: "play", round, index: 0, picked: null, right: 0, streak: 0, results: [] };
}

/** The child picks choice `i`; `answer` is the right choice's index. A second pick on the same question is ignored. */
export function pick<Q>(s: QuizState<Q>, i: number, answer: number): QuizState<Q> {
  if (s.stage !== "play" || s.picked !== null) return s;
  const ok = i === answer;
  return { ...s, picked: i, right: s.right + (ok ? 1 : 0), streak: ok ? s.streak + 1 : 0, results: [...s.results, ok] };
}

/** On to the next question, or to the result after the last one. Only once something was picked. */
export function next<Q>(s: QuizState<Q>): QuizState<Q> {
  if (s.stage !== "play" || s.picked === null) return s;
  if (s.index + 1 >= s.round.length) return { stage: "done", round: s.round, right: s.right, total: s.results.length, results: s.results };
  return { ...s, index: s.index + 1, picked: null };
}

/** The question on screen, if any. */
export const current = <Q>(s: QuizState<Q>): Q | null => (s.stage === "play" ? s.round[s.index]! : null);
