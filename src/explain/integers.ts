import { compareInts, intAnswer, storyMove, type IntQuestion, type Move, type Story } from "../lib/integers";
import type { Lang } from "./lang";

/** −3 with a real minus sign. */
export const int = (n: number): string => (n < 0 ? `−${-n}` : String(n));
/** In brackets when it follows a sign: 4 − (−3). */
const intP = (n: number): string => (n < 0 ? `(${int(n)})` : int(n));

export const moveText = (m: Move): string => `${int(m.start)} ${m.op === "+" ? "+" : "−"} ${intP(m.b)}`;

/** The calculation as a move, with the rule in words, using the child's numbers. */
export function explainMove(m: Move, lang: Lang): string[] {
  const de = lang === "de";
  const size = Math.abs(m.step);
  const dir = m.step > 0 ? (de ? "nach oben" : "up") : de ? "nach unten" : "down";
  const lines = [de ? `Starte bei ${int(m.start)}.` : `Start at ${int(m.start)}.`];
  switch (m.rule) {
    case "plus-pos":
      lines.push(de ? `Plus ${size} heißt: ${size} ${dir}.` : `Plus ${size} means: ${size} ${dir}.`);
      break;
    case "minus-pos":
      lines.push(de ? `Minus ${size} heißt: ${size} ${dir}.` : `Minus ${size} means: ${size} ${dir}.`);
      break;
    case "plus-neg":
      lines.push(
        de ? `Plus eine negative Zahl ist dasselbe wie minus: ${moveText(m)} = ${int(m.start)} − ${size}.`
          : `Adding a negative number is the same as subtracting: ${moveText(m)} = ${int(m.start)} − ${size}.`,
        de ? `Also ${size} ${dir}.` : `So ${size} ${dir}.`,
      );
      break;
    case "minus-neg":
      lines.push(
        de ? `Minus eine negative Zahl ist dasselbe wie plus: ${moveText(m)} = ${int(m.start)} + ${size}.`
          : `Subtracting a negative number is the same as adding: ${moveText(m)} = ${int(m.start)} + ${size}.`,
        de ? `Also ${size} ${dir}.` : `So ${size} ${dir}.`,
      );
      break;
  }
  if (m.crossesZero) {
    const toZero = Math.abs(m.start);
    lines.push(de ? `Du gehst über die 0: erst ${toZero} bis zur 0, dann noch ${size - toZero}.` : `You pass 0: first ${toZero} to get to 0, then ${size - toZero} more.`);
  }
  lines.push(`${moveText(m)} = ${int(m.end)}`);
  return lines;
}

/** "−7 < −3": the one further down (or left) is smaller. */
export function compareSteps(a: number, b: number, lang: Lang): string[] {
  const de = lang === "de";
  const c = compareInts(a, b);
  if (c === 0) return [`${int(a)} = ${int(b)}`];
  const [small, big] = c < 0 ? [a, b] : [b, a];
  const lines = [
    de ? `Auf dem Zahlenstrahl liegt ${int(small)} weiter unten (links) als ${int(big)}.` : `On the number line, ${int(small)} is further down (left) than ${int(big)}.`,
    `${int(a)} ${c < 0 ? "<" : ">"} ${int(b)}`,
  ];
  if (a < 0 && b < 0) {
    lines.push(de ? `Vorsicht: Bei negativen Zahlen ist die mit dem größeren Betrag die kleinere. ${-small} Grad unter null ist kälter als ${-big}.`
      : `Careful: with negative numbers, the one further from zero is smaller. ${-small} degrees below zero is colder than ${-big}.`);
  }
  return lines;
}

export function storyText(s: Story, lang: Lang): string {
  const de = lang === "de";
  const n = Math.abs(s.change);
  const up = s.change > 0;
  switch (s.kind) {
    case "temperature":
      return de ? `Es ist ${int(s.start)} °C. Es wird ${n} Grad ${up ? "wärmer" : "kälter"}. Wie warm ist es dann?`
        : `It's ${int(s.start)} °C. It gets ${n} degrees ${up ? "warmer" : "colder"}. What's the temperature then?`;
    case "account":
      return de ? `Auf dem Konto sind ${int(s.start)} €. Du ${up ? `zahlst ${n} € ein` : `gibst ${n} € aus`}. Wie viel ist dann auf dem Konto?`
        : `The bank account has ${int(s.start)} €. You ${up ? `pay in ${n} €` : `spend ${n} €`}. How much is in the account then?`;
    case "lift": {
      const floor = (f: number) => (de ? (f < 0 ? `im ${-f}. Untergeschoss (${int(f)})` : f === 0 ? "im Erdgeschoss (0)" : `im ${f}. Stock`) : f < 0 ? `on basement level ${-f} (${int(f)})` : f === 0 ? "on the ground floor (0)" : `on floor ${f}`);
      return de ? `Der Aufzug ist ${floor(s.start)} und fährt ${n} Stockwerke ${up ? "hoch" : "runter"}. In welchem Stockwerk hält er?`
        : `The lift is ${floor(s.start)} and goes ${n} floors ${up ? "up" : "down"}. Which floor does it stop at?`;
    }
  }
}

export const STORY_UNIT: Record<Story["kind"], string> = { temperature: " °C", account: " €", lift: "" };

// ---------- quiz ----------

export function quizPrompt(q: IntQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "compare": return de ? `Welche Zahl ist größer: ${int(q.a)} oder ${int(q.b)}?` : `Which is bigger: ${int(q.a)} or ${int(q.b)}?`;
    case "smallest": return de ? "Welche Zahl ist die kleinste?" : "Which number is the smallest?";
    case "opposite": return de ? `Was ist die Gegenzahl von ${int(q.n)}?` : `What is the opposite of ${int(q.n)}?`;
    case "distance": return de ? `Wie weit ist ${int(q.n)} von der 0 entfernt? (Betrag)` : `How far is ${int(q.n)} from 0? (absolute value)`;
    case "calc": return `${moveText(q.m)} = ?`;
    case "story": return storyText(q.story, lang);
  }
}

export const choiceText = (q: IntQuestion, c: number): string => `${int(c)}${q.kind === "story" ? STORY_UNIT[q.story.kind] : ""}`;

export function quizSteps(q: IntQuestion, lang: Lang): string[] {
  const de = lang === "de";
  switch (q.kind) {
    case "compare": return compareSteps(q.a, q.b, lang);
    case "smallest": {
      const sorted = [...q.options].sort((x, y) => x - y).map(int).join(" < ");
      return [de ? `Von unten nach oben: ${sorted}.` : `From bottom to top: ${sorted}.`];
    }
    case "opposite":
      return [de ? `Die Gegenzahl liegt genauso weit von 0 weg, auf der anderen Seite: ${int(q.n)} → ${int(intAnswer(q))}.`
        : `The opposite is just as far from 0, on the other side: ${int(q.n)} → ${int(intAnswer(q))}.`];
    case "distance":
      return [de ? `Der Betrag ist der Abstand zur 0, ohne Vorzeichen: |${int(q.n)}| = ${intAnswer(q)}.` : `The absolute value is the distance from 0, without the sign: |${int(q.n)}| = ${intAnswer(q)}.`];
    case "calc": return explainMove(q.m, lang);
    case "story": {
      const m = storyMove(q.story);
      return [de ? `Als Rechnung: ${moveText(m)}.` : `As a calculation: ${moveText(m)}.`, ...explainMove(m, lang).slice(1)];
    }
  }
}
