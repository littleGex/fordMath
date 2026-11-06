import { starsFor } from "../lib/times-tables";
import { begin, current, next, pick, startState, type QuizState } from "../lib/quiz-state";
import type { Lang } from "../explain/lang";

/** The words a quiz needs, in one language. */
export interface QuizWords {
  intro: string;
  go: string;
  next: string;
  again: string;
  right: string;
  /** Shown after a wrong pick; gets the right choice as text. */
  wrong: (rightChoice: string) => string;
  score: (right: number, total: number) => string;
}

/**
 * Everything a page tells the quiz. `Q` is the page's own question type: TypeScript checks that
 * `prompt`, `choices`, `answer`, `steps` and `picture` all take the same Q that `makeRound` makes.
 */
export interface QuizSpec<Q> {
  host: HTMLElement;
  /** Colour class for the big buttons, e.g. "c-units". */
  colour: string;
  makeRound: () => Q[];
  prompt: (q: Q, lang: Lang) => string;
  /** One label (text or a drawn shape) per choice. */
  choices: (q: Q, lang: Lang) => Array<string | Node>;
  answer: (q: Q) => number;
  steps: (q: Q, lang: Lang) => string[];
  words: (lang: Lang) => QuizWords;
  /** A picture above the question (a shape, a number line…), or null. `answered` lets it show more after the pick. */
  picture?: (q: Q, lang: Lang, answered: boolean) => Node | null;
  /** How many choices side by side, if not the usual 2. */
  columns?: (q: Q) => number | undefined;
  /** Extra controls on the start screen, e.g. level chips. */
  startExtra?: (lang: Lang) => Node | null;
  /** Start straight away, without a start screen. */
  skipStart?: boolean;
  /** Told after each pick, e.g. to remember how a topic is going. */
  onPick?: (q: Q, ok: boolean) => void;
  /** Told when a round ends, e.g. to remember progress. */
  onFinish?: (right: number, total: number) => void;
}

export interface QuizHandle {
  render: (lang: Lang) => void;
  start: () => void;
  /** Back to the start screen (e.g. after the page's level changed). */
  reset: () => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] =>
  Object.assign(document.createElement(tag), { className: cls, textContent: text });

function bigButton(colour: string, emoji: string): [HTMLButtonElement, HTMLElement] {
  const b = el("button", `tile big-btn ${colour}`);
  b.type = "button";
  if (emoji) b.append(Object.assign(el("span", "emoji", emoji), { ariaHidden: "true" }));
  const h = el("h3");
  b.append(h);
  return [b, h];
}

export function mountQuiz<Q>(spec: QuizSpec<Q>): QuizHandle {
  let state: QuizState<Q> = spec.skipStart ? begin(spec.makeRound()) : startState<Q>();
  let lang: Lang = "de";

  // ---- the three screens, built once ----
  const startBox = el("div", "quiz-start");
  const extra = el("div");
  const intro = el("p", "note");
  const [goBtn, goLabel] = bigButton(spec.colour, "🎯");
  startBox.append(extra, intro, goBtn);

  const playBox = el("div", "quiz-play");
  const top = el("div", "quiz-top");
  const dots = el("span", "dots-progress");
  const streak = el("span", "streak");
  top.append(dots, streak);
  const pictureBox = el("div", "quiz-picture");
  const promptP = el("p", "quiz-q");
  promptP.setAttribute("aria-live", "polite");
  const choicesBox = el("div", "quiz-choices");
  const feedback = el("div", "quiz-feedback");
  const verdict = el("p", "verdict");
  const steps = el("ol", "steps");
  const [nextBtn, nextLabel] = bigButton(spec.colour, "");
  feedback.append(verdict, steps, nextBtn);
  playBox.append(top, pictureBox, promptP, choicesBox, feedback);

  const doneBox = el("div", "quiz-done");
  const stars = el("p", "stars");
  const score = el("p", "score");
  const [againBtn, againLabel] = bigButton(spec.colour, "🔁");
  doneBox.append(stars, score, againBtn);

  spec.host.replaceChildren(startBox, playBox, doneBox);

  function render(newLang: Lang = lang): void {
    lang = newLang;
    const w = spec.words(lang);
    startBox.hidden = state.stage !== "start";
    playBox.hidden = state.stage !== "play";
    doneBox.hidden = state.stage !== "done";
    goLabel.textContent = w.go;
    nextLabel.textContent = w.next;
    againLabel.textContent = w.again;
    intro.textContent = w.intro;
    extra.replaceChildren(...[spec.startExtra?.(lang)].filter((n): n is Node => !!n));

    if (state.stage === "done") {
      const n = starsFor(state.right, state.total);
      stars.textContent = "⭐".repeat(n) + "☆".repeat(3 - n);
      score.textContent = w.score(state.right, state.total);
      return;
    }
    const q = current(state);
    if (state.stage !== "play" || q === null) return;
    const s = state;
    dots.replaceChildren(...s.round.map((_, i) => el("i", i < s.results.length ? (s.results[i] ? "ok" : "no") : i === s.index ? "now" : "")));
    streak.textContent = s.streak >= 3 ? `🔥 ${s.streak}` : "";
    const answered = s.picked !== null;
    const pic = spec.picture?.(q, lang, answered) ?? null;
    pictureBox.replaceChildren(...(pic ? [pic] : []));
    pictureBox.hidden = pic === null;
    promptP.textContent = spec.prompt(q, lang);
    const right = spec.answer(q);
    const labels = spec.choices(q, lang);
    choicesBox.replaceChildren(...labels.map((label, i) => {
      const b = el("button");
      b.type = "button";
      b.append(label);
      if (typeof label !== "string") b.classList.add("shape-choice");
      b.disabled = answered;
      if (answered && i === right) b.classList.add("right");
      if (answered && i === s.picked && i !== right) b.classList.add("wrong");
      b.addEventListener("click", () => {
        if (state.stage !== "play" || state.picked !== null) return;
        state = pick(state, i, right);
        spec.onPick?.(q, i === right);
        render();
      });
      return b;
    }));
    const cols = spec.columns?.(q);
    choicesBox.style.gridTemplateColumns = cols ? `repeat(${cols}, minmax(0, 1fr))` : "";
    feedback.hidden = !answered;
    if (answered) {
      const ok = s.picked === right;
      const rightLabel = labels[right];
      verdict.textContent = ok ? w.right : w.wrong(typeof rightLabel === "string" ? rightLabel : "");
      verdict.className = `verdict ${ok ? "ok" : "no"}`;
      steps.replaceChildren(...spec.steps(q, lang).map((x) => el("li", "", x)));
    }
  }

  const start = () => {
    state = begin(spec.makeRound());
    render();
  };
  goBtn.addEventListener("click", start);
  againBtn.addEventListener("click", start);
  nextBtn.addEventListener("click", () => {
    state = next(state);
    if (state.stage === "done") spec.onFinish?.(state.right, state.total);
    render();
    spec.host.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  return {
    render,
    start,
    reset: () => {
      state = spec.skipStart ? begin(spec.makeRound()) : startState<Q>();
      render();
    },
  };
}
