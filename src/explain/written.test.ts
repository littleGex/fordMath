import { writtenAdd, writtenSubtract } from "../lib/written";
import { finishText, introText, placeName, stepTexts } from "./written";

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
