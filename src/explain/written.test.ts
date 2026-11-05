import { writtenAdd, writtenDivide, writtenMultiply, writtenSubtract } from "../lib/written";
import { finishText, fullText, introText, placeName, stepTexts, walkthrough } from "./written";

const full = (t: { place: string; work: string; write: string }) => `${t.place}: ${t.work} ${t.write}`;

describe("addition texts", () => {
  const texts = stepTexts(writtenAdd([473, 259]), "de");
  it("works column by column with the carry named", () => {
    expect(texts.map(full)).toEqual([
      "Einer: 3 + 9 = 12. Schreibe 2, merke 1.",
      "Zehner: 7 + 5 + 1 (Übertrag) = 13. Schreibe 3, merke 1.",
      "Hunderter: 4 + 2 + 1 (Übertrag) = 7. Schreibe 7.",
    ]);
  });
  it("asks without giving the answer away", () => {
    expect(texts[1]!.ask).toBe("7 + 5 + 1 (Übertrag) = ?");
  });
  it("explains a final carry on its own", () => {
    const t = stepTexts(writtenAdd([999, 1]), "en");
    expect(full(t[3]!)).toBe("Thousands: Just the carried 1. Write 1.");
  });
  it("skips zeros from shorter numbers but keeps a real 0 on top", () => {
    expect(stepTexts(writtenAdd([1205, 38]), "de")[2]!.work).toBe("2 = 2.");
    expect(stepTexts(writtenAdd([40, 3]), "de")[0]!.work).toBe("0 + 3 = 3.");
  });
});

describe("Ergänzungsverfahren texts", () => {
  const texts = stepTexts(writtenSubtract(824, 357, "complement"), "de");
  it("adds on from the bottom number", () => {
    expect(full(texts[0]!)).toBe("Einer: 7 plus wie viel ergibt 4? Das geht nicht, also bis 14: 7 + 7 = 14. Schreibe 7, merke 1.");
  });
  it("adds the carry to the bottom digit first", () => {
    expect(full(texts[1]!)).toBe(
      "Zehner: 5 + 1 (Übertrag) = 6. 6 plus wie viel ergibt 2? Das geht nicht, also bis 12: 6 + 6 = 12. Schreibe 6, merke 1.",
    );
    expect(full(texts[2]!)).toBe("Hunderter: 3 + 1 (Übertrag) = 4. 4 plus wie viel ergibt 8? 4 + 4 = 8. Schreibe 4.");
  });
  it("says why a leading 0 is blank", () => {
    expect(stepTexts(writtenSubtract(105, 98, "complement"), "de")[2]!.write).toBe("Eine 0 ganz vorne schreibt man nicht.");
  });
  it("has English too", () => {
    expect(stepTexts(writtenSubtract(824, 357, "complement"), "en")[0]!.ask).toBe("7 plus what makes 4?");
  });
});

describe("Abziehverfahren texts", () => {
  it("explains an exchange", () => {
    const t = stepTexts(writtenSubtract(824, 357, "borrow"), "de");
    expect(full(t[0]!)).toBe(
      "Einer: 4 − 7 geht nicht. Entbündle: tausche 1 Zehner (Zehner 2 → 1), dann hast du 14 Einer. 14 − 7 = 7. Schreibe 7.",
    );
    expect(full(t[2]!)).toBe("Hunderter: 7 − 3 = 4. Schreibe 4.");
  });
  it("explains a chain of exchanges across zeros", () => {
    const t = stepTexts(writtenSubtract(1000, 1, "borrow"), "en");
    expect(t[0]!.work).toBe(
      "0 − 1 isn't possible. Exchange 1 thousand (Thousands 1 → 0, Hundreds 0 → 9, Tens 0 → 9), so now you have 10 ones. 10 − 1 = 9.",
    );
  });
});

describe("intro and finish", () => {
  it("tells you how to line the numbers up", () => {
    expect(introText(writtenAdd([1, 2]), "de")).toContain("Einer unter Einer");
    expect(introText(writtenSubtract(9, 2, "complement"), "de")).toContain("Wie viel fehlt");
  });
  it("finishes with a check using the opposite sum", () => {
    expect(finishText(writtenSubtract(824, 357, "borrow"), "de")).toEqual({
      result: "Fertig! 824 − 357 = 467",
      check: "Probe: 467 + 357 = 824 ✓",
    });
    expect(finishText(writtenAdd([473, 259]), "en").check).toBe("Check: 732 − 259 = 473 ✓");
  });
});

describe("placeName", () => {
  it("names the columns", () => {
    expect([0, 1, 2, 3].map((c) => placeName(c, "de"))).toEqual(["Einer", "Zehner", "Hunderter", "Tausender"]);
  });
});


describe("multiplication walkthrough", () => {
  const w = walkthrough(writtenMultiply(473, 26), "de");
  it("works line by line, starting with the first digit of the second number", () => {
    expect(fullText(w[0]!.text)).toBe("473 · 2: Jetzt mal 2: das Ergebnis endet genau unter der 2. 3 · 2 = 6. Schreibe 6.");
    expect(fullText(w[4]!.text)).toBe("473 · 6: 7 · 6 = 42, plus 1 gemerkt = 43. Schreibe 3, merke 4.");
    expect(fullText(w[6]!.text)).toBe("473 · 6: Keine Ziffer mehr übrig: die gemerkte 2 kommt vorne hin. Schreibe 2.");
  });
  it("then adds the lines up", () => {
    expect(fullText(w[7]!.text)).toBe("Zusammenzählen, Einer: 8 = 8. Schreibe 8.");
    expect(fullText(w[8]!.text)).toBe("Zusammenzählen, Zehner: 6 + 3 = 9. Schreibe 9.");
  });
  it("asks for one digit at every step", () => {
    expect(w.map((x) => x.answer)).toEqual([6, 4, 9, 8, 3, 8, 2, 8, 9, 2, 2, 1]);
  });
  it("finishes with a division check", () => {
    expect(finishText(writtenMultiply(473, 26), "de")).toEqual({ result: "Fertig! 473 · 26 = 12298", check: "Probe: 12298 : 26 = 473 ✓" });
  });
});

describe("division walkthrough", () => {
  const w = walkthrough(writtenDivide(285, 6), "de");
  it("divides, multiplies and subtracts, brings down, and ends with the Rest", () => {
    expect(w.map((x) => fullText(x.text))).toEqual([
      "28 : 6: 2 ist kleiner als 6, also nimm 28. Die 6 passt 4-mal in die 28: 4 · 6 = 24 (5 · 6 = 30 wäre zu viel). Schreibe 4 ins Ergebnis.",
      "28 : 6: 4 · 6 = 24. Schreibe 24 darunter und ziehe ab: 28 − 24 = 4.",
      "Herunterholen: Hole die nächste Ziffer herunter: 5. Jetzt hast du 45.",
      "45 : 6: Die 6 passt 7-mal in die 45: 7 · 6 = 42 (8 · 6 = 48 wäre zu viel). Schreibe 7 ins Ergebnis.",
      "45 : 6: 7 · 6 = 42. Schreibe 42 darunter und ziehe ab: 45 − 42 = 3.",
      "Rest: Es gibt keine Ziffer mehr zum Herunterholen. 3 bleibt übrig: das ist der Rest.",
    ]);
  });
  it("only asks for the answer digits", () => {
    expect(w.map((x) => x.answer)).toEqual([4, null, null, 7, null, null]);
  });
  it("reminds you to write a 0 in the middle", () => {
    const z = walkthrough(writtenDivide(612, 6), "de");
    expect(z.find((x) => x.answer === 0)!.text.write).toBe("Schreibe 0 ins Ergebnis. Die 0 nicht vergessen!");
  });
  it("finishes with the Rest and a check", () => {
    expect(finishText(writtenDivide(285, 6), "de")).toEqual({ result: "Fertig! 285 : 6 = 47 Rest 3", check: "Probe: 47 · 6 + 3 = 285 ✓" });
    expect(finishText(writtenDivide(612, 6), "en").check).toBe("Check: 102 · 6 = 612 ✓");
  });
  it("has English too", () => {
    expect(walkthrough(writtenDivide(285, 6), "en")[0]!.text.ask).toBe("2 is smaller than 6, so take 28. How many times does 6 go into 28?");
  });
});
