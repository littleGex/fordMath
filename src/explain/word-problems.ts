import { formatDecimal, type Decimal } from "../lib/decimal";
import { parse, workedLines } from "../lib/expression";
import type { TemplateId, WordProblem } from "../lib/word-problems";
import type { Lang } from "./lang";

/** A piece of a story sentence: plain text, or one of the problem's numbers (tappable in step 2). */
export type Seg = string | { key: string };

interface StoryText {
  story: Seg[][];
  /** The right question first, then two that ask about something else. */
  questions: [string, string, string];
  answer: (v: string) => string;
  /** The same answer with the wrong unit or thing, a common slip. */
  wrongUnit: (v: string) => string;
  /** What each number is, for the explanation: "the price of the notebook". */
  labels: Record<string, string>;
  /** The unit written after a number in the story, if any: "€", "m". */
  units?: Record<string, string>;
}

type Texts = (n: Record<string, string>) => StoryText;

const DE: Record<TemplateId, Texts> = {
  change: () => ({
    story: [["Tim ist ", { key: "age" }, " Jahre alt."], ["Er kauft ein Heft für ", { key: "a" }, " und einen Stift für ", { key: "b" }, "."], ["Er bezahlt mit einem ", { key: "c" }, "-Schein."]],
    questions: ["Wie viel Geld bekommt Tim zurück?", "Wie viel kosten Heft und Stift zusammen?", "Wie alt ist Tim?"],
    answer: (v) => `Tim bekommt ${v} € zurück.`, wrongUnit: (v) => `Tim bekommt ${v} Stifte zurück.`,
    labels: { a: "der Preis des Hefts", b: "der Preis des Stifts", c: "der Schein", age: "Tims Alter" }, units: { a: " €", b: " €", c: " €" },
  }),
  share: () => ({
    story: [[{ key: "kids" }, " Kinder spielen ", { key: "minutes" }, " Minuten im Garten."], ["Danach teilen sie sich ", { key: "total" }, " Bonbons gerecht."]],
    questions: ["Wie viele Bonbons bekommt jedes Kind?", "Wie lange spielen die Kinder?", "Wie viele Bonbons sind es zusammen?"],
    answer: (v) => `Jedes Kind bekommt ${v} Bonbons.`, wrongUnit: (v) => `Jedes Kind bekommt ${v} Minuten.`,
    labels: { total: "die Bonbons", kids: "die Kinder", minutes: "die Spielzeit" },
  }),
  rows: () => ({
    story: [["Im Raum ", { key: "room" }, " stehen ", { key: "rows" }, " Reihen mit je ", { key: "per" }, " Stühlen."], [{ key: "broken" }, " Stühle sind kaputt."]],
    questions: ["Wie viele Stühle sind heil?", "Wie viele Stühle stehen im Raum?", "Wie viele Reihen sind es?"],
    answer: (v) => `${v} Stühle sind heil.`, wrongUnit: (v) => `${v} Reihen sind heil.`,
    labels: { rows: "die Reihen", per: "die Stühle pro Reihe", broken: "die kaputten Stühle", room: "die Raumnummer" },
  }),
  practice: () => ({
    story: [["Lena ist ", { key: "age" }, " Jahre alt und übt Klavier."], ["Sie übt jeden Tag ", { key: "minutes" }, " Minuten, und das an ", { key: "days" }, " Tagen."]],
    questions: ["Wie viele Minuten übt Lena insgesamt?", "Wie lange übt Lena an einem Tag?", "Wie alt ist Lena?"],
    answer: (v) => `Lena übt insgesamt ${v} Minuten.`, wrongUnit: (v) => `Lena übt insgesamt ${v} Tage.`,
    labels: { minutes: "die Minuten pro Tag", days: "die Tage", age: "Lenas Alter" },
  }),
  fence: () => ({
    story: [["Der Gartenzaun ist ", { key: "length" }, " lang."], ["Papa hat schon ", { key: "done" }, " gestrichen."], ["Heute streicht er ", { key: "hours" }, " Stunden lang noch ", { key: "today" }, "."]],
    questions: ["Wie viele Meter Zaun fehlen dann noch?", "Wie viele Meter hat Papa schon gestrichen?", "Wie lange streicht Papa heute?"],
    answer: (v) => `Dann fehlen noch ${v} m Zaun.`, wrongUnit: (v) => `Dann fehlen noch ${v} Stunden.`,
    labels: { length: "die Länge des Zauns", done: "das schon Gestrichene", today: "das heute Gestrichene", hours: "die Stunden" }, units: { length: " m", done: " m", today: " m" },
  }),
  bus: () => ({
    story: [["Im Bus der Linie ", { key: "line" }, " sitzen ", { key: "inBus" }, " Leute."], ["An der Haltestelle steigen ", { key: "off" }, " aus und ", { key: "on" }, " ein."]],
    questions: ["Wie viele Leute sitzen jetzt im Bus?", "Wie viele Leute steigen aus?", "Welche Linie ist es?"],
    answer: (v) => `Jetzt sitzen ${v} Leute im Bus.`, wrongUnit: (v) => `Jetzt sitzen ${v} Busse im Bus.`,
    labels: { inBus: "die Leute im Bus", off: "die Aussteigenden", on: "die Einsteigenden", line: "die Liniennummer" },
  }),
  bakery: () => ({
    story: [["Mia geht um ", { key: "time" }, " Uhr zum Bäcker."], ["Sie kauft ", { key: "k" }, " Brötchen zu je ", { key: "roll" }, " und einen Saft für ", { key: "juice" }, "."], ["Sie bezahlt mit ", { key: "paid" }, "."]],
    questions: ["Wie viel Geld bekommt Mia zurück?", "Wie viel kostet der Einkauf?", "Wie viel kosten die Brötchen?"],
    answer: (v) => `Mia bekommt ${v} € zurück.`, wrongUnit: (v) => `Mia bekommt ${v} Brötchen zurück.`,
    labels: { k: "die Anzahl Brötchen", roll: "der Preis pro Brötchen", juice: "der Saft", paid: "das bezahlte Geld", time: "die Uhrzeit" }, units: { roll: " €", juice: " €", paid: " €" },
  }),
  club: (n) => ({
    story: [["Der Fußballverein hat ", { key: "members" }, " Mitglieder."], ["Jedes zahlt ", { key: "fee" }, " im Monat."], ["Neue Trikots kosten ", { key: "shirts" }, "."]],
    questions: [`Wie viel Geld nimmt der Verein in ${n.months} Monaten ein?`, "Wie viel nimmt der Verein in einem Monat ein?", "Wie viel kosten die Trikots?"],
    answer: (v) => `Der Verein nimmt ${v} € ein.`, wrongUnit: (v) => `Der Verein nimmt ${v} Mitglieder ein.`,
    labels: { members: "die Mitglieder", fee: "der Beitrag", months: "die Monate", shirts: "die Trikots" }, units: { fee: " €", shirts: " €" },
  }),
  zoo: () => ({
    story: [["Eine Klasse mit ", { key: "kids" }, " Kindern und ", { key: "adults" }, " Erwachsenen fährt in den Zoo, ", { key: "km" }, " km weit."], ["Ein Kind zahlt ", { key: "pk" }, ", ein Erwachsener ", { key: "pa" }, "."]],
    questions: ["Wie viel kostet der Eintritt für alle zusammen?", "Wie viel zahlen nur die Kinder?", "Wie weit ist der Zoo entfernt?"],
    answer: (v) => `Der Eintritt kostet zusammen ${v} €.`, wrongUnit: (v) => `Der Eintritt kostet zusammen ${v} km.`,
    labels: { kids: "die Kinder", adults: "die Erwachsenen", pk: "der Kinderpreis", pa: "der Erwachsenenpreis", km: "der Weg" }, units: { pk: " €", pa: " €" },
  }),
  ribbon: () => ({
    story: [["Eine Rolle Geschenkband ist ", { key: "roll" }, " lang. Es gibt sie in ", { key: "colour" }, " Farben."], ["Lea schneidet ", { key: "k" }, " Stücke zu je ", { key: "piece" }, " ab."]],
    questions: ["Wie viel Band bleibt auf der Rolle?", "Wie viel Band schneidet Lea ab?", "Wie viele Stücke schneidet Lea ab?"],
    answer: (v) => `Es bleiben ${v} m Band übrig.`, wrongUnit: (v) => `Es bleiben ${v} Stücke übrig.`,
    labels: { roll: "die Länge der Rolle", k: "die Anzahl Stücke", piece: "die Länge eines Stücks", colour: "die Farben" }, units: { roll: " m", piece: " m" },
  }),
};

const EN: Record<TemplateId, Texts> = {
  change: () => ({
    story: [["Tim is ", { key: "age" }, " years old."], ["He buys a notebook for ", { key: "a" }, " and a pen for ", { key: "b" }, "."], ["He pays with a ", { key: "c" }, " note."]],
    questions: ["How much change does Tim get?", "How much do the notebook and pen cost together?", "How old is Tim?"],
    answer: (v) => `Tim gets ${v} € change.`, wrongUnit: (v) => `Tim gets ${v} pens change.`,
    labels: { a: "the notebook's price", b: "the pen's price", c: "the note", age: "Tim's age" }, units: { a: " €", b: " €", c: " €" },
  }),
  share: () => ({
    story: [[{ key: "kids" }, " children play in the garden for ", { key: "minutes" }, " minutes."], ["Then they share ", { key: "total" }, " sweets fairly."]],
    questions: ["How many sweets does each child get?", "How long do the children play?", "How many sweets are there altogether?"],
    answer: (v) => `Each child gets ${v} sweets.`, wrongUnit: (v) => `Each child gets ${v} minutes.`,
    labels: { total: "the sweets", kids: "the children", minutes: "the playing time" },
  }),
  rows: () => ({
    story: [["In room ", { key: "room" }, " there are ", { key: "rows" }, " rows of ", { key: "per" }, " chairs."], [{ key: "broken" }, " chairs are broken."]],
    questions: ["How many chairs are not broken?", "How many chairs are in the room?", "How many rows are there?"],
    answer: (v) => `${v} chairs are not broken.`, wrongUnit: (v) => `${v} rows are not broken.`,
    labels: { rows: "the rows", per: "the chairs per row", broken: "the broken chairs", room: "the room number" },
  }),
  practice: () => ({
    story: [["Lena is ", { key: "age" }, " and plays the piano."], ["She practises ", { key: "minutes" }, " minutes a day, on ", { key: "days" }, " days."]],
    questions: ["How many minutes does Lena practise altogether?", "How long does Lena practise in one day?", "How old is Lena?"],
    answer: (v) => `Lena practises ${v} minutes altogether.`, wrongUnit: (v) => `Lena practises ${v} days altogether.`,
    labels: { minutes: "the minutes a day", days: "the days", age: "Lena's age" },
  }),
  fence: () => ({
    story: [["The garden fence is ", { key: "length" }, " long."], ["Dad has already painted ", { key: "done" }, "."], ["Today he paints for ", { key: "hours" }, " hours and does ", { key: "today" }, " more."]],
    questions: ["How many metres of fence are still left?", "How many metres has Dad painted already?", "How long does Dad paint today?"],
    answer: (v) => `There are still ${v} m of fence left.`, wrongUnit: (v) => `There are still ${v} hours left.`,
    labels: { length: "the fence's length", done: "what's already painted", today: "what's painted today", hours: "the hours" }, units: { length: " m", done: " m", today: " m" },
  }),
  bus: () => ({
    story: [["On the number ", { key: "line" }, " bus there are ", { key: "inBus" }, " people."], ["At the stop, ", { key: "off" }, " get off and ", { key: "on" }, " get on."]],
    questions: ["How many people are on the bus now?", "How many people get off?", "Which bus number is it?"],
    answer: (v) => `There are ${v} people on the bus now.`, wrongUnit: (v) => `There are ${v} buses on the bus now.`,
    labels: { inBus: "the people on the bus", off: "the people getting off", on: "the people getting on", line: "the bus number" },
  }),
  bakery: () => ({
    story: [["Mia goes to the bakery at ", { key: "time" }, " o'clock."], ["She buys ", { key: "k" }, " rolls at ", { key: "roll" }, " each and a juice for ", { key: "juice" }, "."], ["She pays with ", { key: "paid" }, "."]],
    questions: ["How much change does Mia get?", "How much does the shopping cost?", "How much do the rolls cost?"],
    answer: (v) => `Mia gets ${v} € change.`, wrongUnit: (v) => `Mia gets ${v} rolls change.`,
    labels: { k: "the number of rolls", roll: "the price per roll", juice: "the juice", paid: "the money paid", time: "the time" }, units: { roll: " €", juice: " €", paid: " €" },
  }),
  club: (n) => ({
    story: [["The football club has ", { key: "members" }, " members."], ["Each pays ", { key: "fee" }, " a month."], ["New shirts cost ", { key: "shirts" }, "."]],
    questions: [`How much money does the club take in ${n.months} months?`, "How much does the club take in one month?", "How much do the shirts cost?"],
    answer: (v) => `The club takes ${v} €.`, wrongUnit: (v) => `The club takes ${v} members.`,
    labels: { members: "the members", fee: "the monthly fee", months: "the months", shirts: "the shirts" }, units: { fee: " €", shirts: " €" },
  }),
  zoo: () => ({
    story: [["A class of ", { key: "kids" }, " children and ", { key: "adults" }, " adults goes to the zoo, ", { key: "km" }, " km away."], ["A child pays ", { key: "pk" }, ", an adult ", { key: "pa" }, "."]],
    questions: ["How much does it cost for everyone together?", "How much do just the children pay?", "How far away is the zoo?"],
    answer: (v) => `It costs ${v} € altogether.`, wrongUnit: (v) => `It costs ${v} km altogether.`,
    labels: { kids: "the children", adults: "the adults", pk: "the child price", pa: "the adult price", km: "the distance" }, units: { pk: " €", pa: " €" },
  }),
  ribbon: () => ({
    story: [["A roll of gift ribbon is ", { key: "roll" }, " long. It comes in ", { key: "colour" }, " colours."], ["Lea cuts off ", { key: "k" }, " pieces of ", { key: "piece" }, " each."]],
    questions: ["How much ribbon is left on the roll?", "How much ribbon does Lea cut off?", "How many pieces does Lea cut off?"],
    answer: (v) => `${v} m of ribbon are left.`, wrongUnit: (v) => `${v} pieces are left.`,
    labels: { roll: "the roll's length", k: "the number of pieces", piece: "one piece's length", colour: "the colours" }, units: { roll: " m", piece: " m" },
  }),
};

export const num = (d: Decimal, lang: Lang): string => formatDecimal(d, lang);

/** All the words for one problem, in one language. */
export function storyFor(p: WordProblem, lang: Lang): StoryText {
  const n = Object.fromEntries(Object.entries(p.n).map(([k, d]) => [k, num(d, lang)]));
  return (lang === "de" ? DE : EN)[p.template](n);
}

/** The text of a number as it appears in the story, with its unit: "3,45 €". */
export const numberText = (p: WordProblem, key: string, lang: Lang): string => `${num(p.n[key]!, lang)}${storyFor(p, lang).units?.[key] ?? ""}`;

/** A calculation shown the right way for the language: "5 − (4 · 0,35 + 1,2)". */
export const calcText = (calc: string, lang: Lang): string => (lang === "de" ? calc.replace(/(\d)\.(\d)/g, "$1,$2") : calc);

/** The whole worked solution: question, numbers, calculation step by step, answer. */
export function solution(p: WordProblem, lang: Lang): string[] {
  const de = lang === "de";
  const t = storyFor(p, lang);
  const unused = Object.keys(p.n).filter((k) => !p.needed.includes(k));
  const lines = [
    `${de ? "Frage" : "Question"}: ${t.questions[0]}`,
    `${de ? "Du brauchst" : "You need"}: ${p.needed.map((k) => `${numberText(p, k, lang)} (${t.labels[k]})`).join(", ")}.`,
    `${de ? "Nicht gebraucht" : "Not needed"}: ${unused.map((k) => `${numberText(p, k, lang)} (${t.labels[k]})`).join(", ")}.`,
  ];
  // Whole numbers: the working line by line, Punkt vor Strich. With decimals, the calculation and its result.
  const isWhole = p.answer.places === 0 && !p.calc.includes(".");
  const working = isWhole ? workedLines(parse(p.calc)).join(" = ") : `${calcText(p.calc, lang)} = ${num(p.answer, lang)}`;
  lines.push(`${de ? "Rechnung" : "Calculation"}: ${working}`);
  lines.push(`${de ? "Antwort" : "Answer"}: ${t.answer(num(p.answer, lang))}`);
  return lines;
}
