import {
  direction, isProportional, meet, onLine, parseRat, slopeTriangle, throughPoints, yAt, zeroOf,
  type FunctionQuestion, type Line, type RPoint, type Tariff,
} from "../lib/linear-function";
import { abs, isZero, neg, sub, ZERO, type Rational } from "../lib/rational";
import { linear, num } from "./linear-system";
import type { Lang } from "./lang";

/** In brackets when needed inside a product: 3·(−1), 2·(7/5). */
const numP = (q: Rational): string => (q.n < 0 || q.d !== 1 ? `(${num(q)})` : num(q));

/** "y = 2x − 1", "y = 1/2·x + 3", "y = −x", "y = 4" */
export const lineText = (l: Line): string => `y = ${linear([[l.m, "x"]], l.b)}`;
/** P(3 | 2) in German, P(3, 2) in English. */
export const pointText = (p: RPoint, lang: Lang, name = ""): string => `${name}(${num(p.x)}${lang === "de" ? " | " : ", "}${num(p.y)})`;

/** What m says: "1 nach rechts, 2 nach oben", or for 2/3 "3 nach rechts, 2 nach oben". */
export function slopeText(l: Line, lang: Lang): string {
  const de = lang === "de";
  const d = direction(l);
  if (d === "flat") return de ? "m = 0: Die Gerade ist waagerecht, y bleibt immer gleich." : "m = 0: the line is flat, y never changes.";
  const { run, rise } = slopeTriangle(l);
  const r = Math.abs(rise);
  const way = de ? (rise > 0 ? "nach oben" : "nach unten") : rise > 0 ? "up" : "down";
  const move = de ? `${run} nach rechts, ${r} ${way}` : `${run} to the right, ${r} ${way}`;
  return de
    ? `m = ${num(l.m)}: Die Gerade ${d === "rising" ? "steigt" : "fällt"}. Steigungsdreieck: ${move}.`
    : `m = ${num(l.m)}: the line ${d === "rising" ? "rises" : "falls"}. Slope triangle: ${move}.`;
}

export function interceptText(l: Line, lang: Lang): string {
  const de = lang === "de";
  const at = pointText({ x: ZERO, y: l.b }, lang);
  const prop = isProportional(l)
    ? de ? " Sie geht durch den Ursprung: Die Zuordnung ist proportional." : " It goes through the origin: the relationship is proportional."
    : "";
  return de ? `b = ${num(l.b)}: Die Gerade schneidet die y-Achse bei ${at}.${prop}` : `b = ${num(l.b)}: the line crosses the y-axis at ${at}.${prop}`;
}

/** The Nullstelle worked out: 0 = 2x − 6 → x = 3. */
export function zeroSteps(l: Line, lang: Lang): string[] {
  const de = lang === "de";
  const z = zeroOf(l);
  if (z.kind === "none") return [de ? `y ist immer ${num(l.b)}, nie 0: keine Nullstelle.` : `y is always ${num(l.b)}, never 0: no zero.`];
  if (z.kind === "all") return [de ? "Die Gerade ist die x-Achse selbst." : "The line is the x-axis itself."];
  const mx = linear([[l.m, "x"]]);
  return [
    de ? `Auf der x-Achse ist y = 0. Setze 0 für y ein: 0 = ${linear([[l.m, "x"]], l.b)}` : `On the x-axis y = 0. Put 0 in for y: 0 = ${linear([[l.m, "x"]], l.b)}`,
    `${isZero(l.b) ? "" : `${l.b.n > 0 ? "| − " : "| + "}${num(abs(l.b))} → ${num(neg(l.b))} = ${mx}   `}| : ${numP(l.m)} → x = ${num(z.x)}`,
    de ? `Die Nullstelle ist x = ${num(z.x)}, der Punkt ${pointText({ x: z.x, y: ZERO }, lang)}.` : `The zero is x = ${num(z.x)}, the point ${pointText({ x: z.x, y: ZERO }, lang)}.`,
  ];
}

/** m and b from two points, with their own numbers. */
export function twoPointSteps(p: RPoint, q: RPoint, lang: Lang): string[] {
  const de = lang === "de";
  const t = throughPoints(p, q);
  if (t.kind === "same") return [de ? "Das ist zweimal derselbe Punkt. Tippe einen zweiten an." : "That's the same point twice. Tap a second one."];
  if (t.kind === "vertical") {
    return [de ? `Beide Punkte haben x = ${num(t.x)}: Die Gerade ist senkrecht. Das ist keine Funktion (zu einem x gehören viele y), also gibt es kein m.` : `Both points have x = ${num(t.x)}: the line is vertical. That isn't a function (one x has many y), so there's no m.`];
  }
  const { m, b } = t.line;
  return [
    `m = (y₂ − y₁) : (x₂ − x₁) = (${num(q.y)} − ${numP(p.y)}) : (${num(q.x)} − ${numP(p.x)}) = ${num(sub(q.y, p.y))} : ${numP(sub(q.x, p.x))} = ${num(m)}`,
    de
      ? `b = y₁ − m · x₁ = ${num(p.y)} − ${numP(m)} · ${numP(p.x)} = ${num(b)} (setze einen Punkt in y = m·x + b ein und löse nach b auf)`
      : `b = y₁ − m · x₁ = ${num(p.y)} − ${numP(m)} · ${numP(p.x)} = ${num(b)} (put one point into y = m·x + b and solve for b)`,
    de ? `Also: ${lineText(t.line)}` : `So: ${lineText(t.line)}`,
  ];
}

/** Punktprobe: put x in, compare with y. */
export function probeSteps(l: Line, p: RPoint, lang: Lang): string[] {
  const de = lang === "de";
  const y = yAt(l, p.x);
  const on = onLine(l, p);
  const calc = `y = ${isZero(l.m) ? num(l.b) : `${num(l.m)} · ${numP(p.x)}${isZero(l.b) ? "" : ` ${l.b.n < 0 ? "−" : "+"} ${num(abs(l.b))}`}`} = ${num(y)}`;
  return [
    de ? `Setze x = ${num(p.x)} in ${lineText(l)} ein: ${calc}` : `Put x = ${num(p.x)} into ${lineText(l)}: ${calc}`,
    on
      ? de ? `${num(y)} = ${num(p.y)} ✓ Der Punkt liegt auf der Geraden.` : `${num(y)} = ${num(p.y)} ✓ The point is on the line.`
      : de ? `${num(y)} ≠ ${num(p.y)}: Der Punkt liegt nicht auf der Geraden.` : `${num(y)} ≠ ${num(p.y)}: the point isn't on the line.`,
  ];
}

/** Two lines: set the right-hand sides equal. */
export function meetSteps(l1: Line, l2: Line, lang: Lang): string[] {
  const de = lang === "de";
  const r = meet(l1, l2);
  if (r.kind === "same") return [de ? "Das ist zweimal dieselbe Gerade." : "That's the same line twice."];
  if (r.kind === "parallel") return [de ? `Beide haben m = ${num(l1.m)}: Die Geraden sind parallel und schneiden sich nie.` : `Both have m = ${num(l1.m)}: the lines are parallel and never meet.`];
  const dm = sub(l1.m, l2.m), db = sub(l2.b, l1.b);
  return [
    de ? `Im Schnittpunkt haben beide dasselbe y. Setze gleich: ${linear([[l1.m, "x"]], l1.b)} = ${linear([[l2.m, "x"]], l2.b)}` : `Where they cross, both have the same y. Set them equal: ${linear([[l1.m, "x"]], l1.b)} = ${linear([[l2.m, "x"]], l2.b)}`,
    `${linear([[dm, "x"]])} = ${num(db)} → x = ${num(r.at.x)}`,
    de ? `y = ${num(l1.m)} · ${numP(r.at.x)} ${l1.b.n < 0 ? "−" : "+"} ${num(abs(l1.b))} = ${num(r.at.y)}, also schneiden sie sich in S${pointText(r.at, lang)}. Mehr dazu bei Gleichungssysteme.` : `y = ${num(l1.m)} · ${numP(r.at.x)} ${l1.b.n < 0 ? "−" : "+"} ${num(abs(l1.b))} = ${num(r.at.y)}, so they cross at S${pointText(r.at, lang)}. More on this in Simultaneous equations.`,
  ];
}

// ---------- tariffs ----------

/** Cents as money: 3,50 € or 3.50 €. */
export function euros(cents: number, lang: Lang): string {
  const s = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return `${lang === "de" ? s.replace(".", ",") : s} €`;
}
const UNIT = { de: { phone: "Minute", taxi: "km" }, en: { phone: "minute", taxi: "km" } } as const;
const UNITS = { de: { phone: "Minuten", taxi: "km" }, en: { phone: "minutes", taxi: "km" } } as const;

function tariffLine(t: Tariff, story: "phone" | "taxi", lang: Lang): string {
  const per = `${euros(t.per, lang)} ${lang === "de" ? "pro" : "per"} ${UNIT[lang][story]}`;
  if (t.base === 0) return per;
  return lang === "de" ? `${euros(t.base, lang)} Grundgebühr + ${per}` : `${euros(t.base, lang)} fixed + ${per}`;
}

// ---------- quiz ----------

export function quizPrompt(q: FunctionQuestion, lang: Lang): string {
  const de = lang === "de";
  switch (q.kind) {
    case "readM": return de ? "Wie groß ist die Steigung m der Geraden?" : "What is the slope m of the line?";
    case "readB": return de ? "Wo schneidet die Gerade die y-Achse? b = ?" : "Where does the line cross the y-axis? b = ?";
    case "pickGraph": return de ? `Welche Gerade gehört zu ${lineText(q.line)}?` : `Which line is ${lineText(q.line)}?`;
    case "twoPoints": return de ? `Eine Gerade geht durch ${pointText(q.p, lang, "P")} und ${pointText(q.q, lang, "Q")}. Wie groß ist m?` : `A line goes through ${pointText(q.p, lang, "P")} and ${pointText(q.q, lang, "Q")}. What is m?`;
    case "probe": return de ? `Liegt ${pointText(q.p, lang, "P")} auf der Geraden ${lineText(q.line)}?` : `Is ${pointText(q.p, lang, "P")} on the line ${lineText(q.line)}?`;
    case "zero": return de ? `Wo schneidet ${lineText(q.line)} die x-Achse? x = ?` : `Where does ${lineText(q.line)} cross the x-axis? x = ?`;
    case "tariff": {
      const what = q.story === "phone" ? (de ? "Handytarif" : "Phone plan") : de ? "Taxi" : "Taxi";
      return de
        ? `${what} A: ${tariffLine(q.a, q.story, lang)}. ${what} B: ${tariffLine(q.b, q.story, lang)}. Bei wie vielen ${UNITS[lang][q.story]} kosten beide gleich viel?`
        : `${what} A: ${tariffLine(q.a, q.story, lang)}. ${what} B: ${tariffLine(q.b, q.story, lang)}. At how many ${UNITS[lang][q.story]} do both cost the same?`;
    }
  }
}

export function quizChoice(q: FunctionQuestion, c: string, lang: Lang): string {
  switch (q.kind) {
    case "probe": return c === "yes" ? (lang === "de" ? "Ja" : "Yes") : lang === "de" ? "Nein" : "No";
    case "pickGraph": return ["①", "②", "③", "④"][Number(c) - 1]!;
    case "readM": return `m = ${num(parseRat(c))}`;
    case "readB": return `b = ${num(parseRat(c))}`;
    case "twoPoints": return `m = ${num(parseRat(c))}`;
    case "zero": return `x = ${num(parseRat(c))}`;
    case "tariff": return `${c} ${UNITS[lang][q.story]}`;
  }
}

export function quizSteps(q: FunctionQuestion, lang: Lang): string[] {
  const de = lang === "de";
  switch (q.kind) {
    case "readM":
      return [slopeText(q.line, lang), de ? "Zähl am Steigungsdreieck ab: so viel nach oben (oder unten) wie nach rechts. m = hoch : rechts." : "Count on the slope triangle: up (or down) divided by across. m = rise : run."];
    case "readB":
      return [interceptText(q.line, lang), de ? "b liest du dort ab, wo die Gerade die y-Achse kreuzt, also bei x = 0. Nicht verwechseln mit der Nullstelle auf der x-Achse!" : "Read b where the line crosses the y-axis, at x = 0. Don't mix it up with the zero on the x-axis!"];
    case "pickGraph":
      return [interceptText(q.line, lang), slopeText(q.line, lang), de ? `Das passt nur zu Gerade ${["①", "②", "③", "④"][q.answer]}.` : `Only line ${["①", "②", "③", "④"][q.answer]} fits.`];
    case "twoPoints":
      return twoPointSteps(q.p, q.q, lang);
    case "probe":
      return probeSteps(q.line, q.p, lang);
    case "zero":
      return zeroSteps(q.line, lang);
    case "tariff": {
      const u = UNITS[lang][q.story];
      const cost = (t: Tariff) => t.base + t.per * q.at;
      const lineOf = (t: Tariff) => `y = ${euros(t.per, lang)} · x${t.base ? ` + ${euros(t.base, lang)}` : ""}`;
      return [
        de ? `Als Geraden (x = ${u}, y = Preis): A: ${lineOf(q.a)}, B: ${lineOf(q.b)}. Die Grundgebühr ist b, der Preis pro ${UNIT[lang][q.story]} ist m.` : `As lines (x = ${u}, y = price): A: ${lineOf(q.a)}, B: ${lineOf(q.b)}. The fixed amount is b, the price per ${UNIT[lang][q.story]} is m.`,
        de
          ? `B kostet pro ${UNIT[lang][q.story]} ${euros(q.b.per - q.a.per, lang)} mehr, A hat ${euros(q.a.base - q.b.base, lang)} mehr Grundgebühr. ${euros(q.a.base - q.b.base, lang)} : ${euros(q.b.per - q.a.per, lang)} = ${q.at}.`
          : `B costs ${euros(q.b.per - q.a.per, lang)} more per ${UNIT[lang][q.story]}, A has ${euros(q.a.base - q.b.base, lang)} more fixed. ${euros(q.a.base - q.b.base, lang)} ÷ ${euros(q.b.per - q.a.per, lang)} = ${q.at}.`,
        de
          ? `Probe: Bei ${q.at} ${u} kosten beide ${euros(cost(q.a), lang)}. Darunter ist B günstiger, darüber A: Dort schneiden sich die Geraden.`
          : `Check: at ${q.at} ${u} both cost ${euros(cost(q.a), lang)}. Below that B is cheaper, above it A: that's where the lines cross.`,
      ];
    }
  }
}

