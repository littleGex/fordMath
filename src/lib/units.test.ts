import { seededRandom } from "./random";
import {
  QUANTITIES, UNITS, UnitError, changeFor, clockText, formatIn, formatMixed, parseAmount, parseClock, ratio,
  timeSpan, unitTable, type Quantity, type UnitSymbol,
} from "./units";

describe("parseAmount", () => {
  it("reads decimal commas and dots exactly", () => {
    expect(parseAmount("2,35", "length", "m")).toBe(2350);
    expect(parseAmount("2.35", "length", "m")).toBe(2350);
    expect(parseAmount("3,5", "money", "€")).toBe(350);
    expect(parseAmount("1,5", "time", "h")).toBe(5400);
  });
  it("adds 0,1 + 0,2 exactly", () => {
    expect(parseAmount("0,1", "length", "m") + parseAmount("0,2", "length", "m")).toBe(parseAmount("0,3", "length", "m"));
  });
  it("refuses amounts finer than the smallest unit", () => {
    expect(() => parseAmount("0,0001", "length", "m")).toThrow(UnitError);
    expect(() => parseAmount("1,234", "money", "€")).toThrow("too-precise");
  });
  it("names the problem", () => {
    const code = (f: () => unknown) => { try { f(); } catch (e) { return (e as UnitError).code; } return null; };
    expect(code(() => parseAmount("", "mass", "kg"))).toBe("empty");
    expect(code(() => parseAmount("2,3,4", "mass", "kg"))).toBe("format");
    expect(code(() => parseAmount("-3", "mass", "kg"))).toBe("format");
    expect(code(() => parseAmount("1", "mass", "lb"))).toBe("unit");
  });
});

describe("formatIn", () => {
  it("writes an amount in any unit, exactly", () => {
    expect(formatIn(2350, "length", "m")).toBe("2,35");
    expect(formatIn(2350, "length", "cm")).toBe("235");
    expect(formatIn(2350, "length", "km")).toBe("0,00235");
    expect(formatIn(2350, "length", "m", "en")).toBe("2.35");
  });
  it("always gives euros two decimals", () => {
    expect(formatIn(350, "money", "€")).toBe("3,50");
    expect(formatIn(500, "money", "€")).toBe("5,00");
    expect(formatIn(350, "money", "ct")).toBe("350");
  });
  it("groups thousands", () => {
    expect(formatIn(1_250_000_000, "mass", "g")?.replace(/ /g, " ")).toBe("1 250 000");
  });
  it("writes time as whole or with up to two decimals, else null", () => {
    expect(formatIn(5400, "time", "min")).toBe("90");
    expect(formatIn(5400, "time", "h")).toBe("1,5");
    expect(formatIn(4500, "time", "h")).toBe("1,25");
    expect(formatIn(100, "time", "min")).toBeNull(); // 1,666… min
  });
  it("round-trips through parseAmount for random amounts", () => {
    const r = seededRandom(16);
    for (const q of ["money", "length", "mass"] as const) {
      for (let i = 0; i < 200; i++) {
        const base = Math.floor(r() * 1e10);
        for (const u of UNITS[q]) expect(parseAmount(formatIn(base, q, u.symbol)!, q, u.symbol)).toBe(base);
      }
    }
  });
});

describe("formatMixed", () => {
  it("writes amounts the school way", () => {
    expect(formatMixed(2350, "length")).toBe("2 m 35 cm");
    expect(formatMixed(5700, "time")).toBe("1 h 35 min");
    expect(formatMixed(350, "money")).toBe("3 € 50 ct");
    expect(formatMixed(1_250_000, "mass")).toBe("1 kg 250 g");
    expect(formatMixed(0, "length")).toBe("0 mm");
  });
});

describe("ratio (Umrechnungszahl)", () => {
  it("knows the steps between units", () => {
    expect(ratio("length", "m", "cm")).toBe(100);
    expect(ratio("mass", "t", "kg")).toBe(1000);
    expect(ratio("time", "h", "min")).toBe(60);
    expect(ratio("length", "cm", "m")).toBe(0.01);
  });
});

describe("unitTable", () => {
  const show = (base: number, q: Quantity) =>
    unitTable(base, q).map((c) => `${c.unit}${c.place}:${c.digit ?? "·"}`).join(" ");
  it("gives each unit its columns", () => {
    expect(show(2350, "length")).toBe("km0:· m2:· m1:· m0:2 dm0:3 cm0:5 mm0:0");
    expect(show(350, "money")).toBe("€0:3 ct1:5 ct0:0");
  });
  it("widens the biggest unit for big amounts", () => {
    expect(unitTable(12_000_000, "length").filter((c) => c.unit === "km")).toHaveLength(2);
  });
  it("puts every digit in exactly one column", () => {
    const r = seededRandom(3);
    for (const q of ["money", "length", "mass"] as const) {
      for (let i = 0; i < 100; i++) {
        const base = Math.floor(r() * 1e9);
        const digits = unitTable(base, q).filter((c) => c.digit !== null).map((c) => c.digit).join("");
        expect(Number(digits)).toBe(base);
      }
    }
  });
});

describe("timeSpan", () => {
  it("jumps to the full hour, then whole hours, then the rest", () => {
    const s = timeSpan(parseClock("08:45"), parseClock("10:20"));
    expect(s.minutes).toBe(95);
    expect(s.steps.map((x) => `${clockText(x.from)}-${clockText(x.to)}=${x.minutes}`)).toEqual([
      "08:45-09:00=15", "09:00-10:00=60", "10:00-10:20=20",
    ]);
  });
  it("handles spans inside one hour", () => {
    expect(timeSpan(parseClock("8:10"), parseClock("8:40")).steps).toHaveLength(1);
  });
  it("goes past midnight", () => {
    const s = timeSpan(parseClock("22:30"), parseClock("01:15"));
    expect(s.minutes).toBe(165);
    expect(clockText(s.steps.at(-1)!.to)).toBe("01:15");
  });
  it("refuses impossible times", () => {
    expect(() => parseClock("24:00")).toThrow();
    expect(() => parseClock("8:75")).toThrow();
  });
});

describe("changeFor", () => {
  it("counts up from the price", () => {
    const c = changeFor(365, 500);
    expect(c.change).toBe(135);
    expect(c.steps.map((s) => `${s.from}→${s.to}`)).toEqual(["365→370", "370→400", "400→500"]);
    expect(c.pieces).toEqual([100, 20, 10, 5]);
  });
  it("goes through 5 € and 10 € on the way to a bigger note", () => {
    expect(changeFor(365, 2000).steps.map((s) => s.to)).toEqual([370, 400, 500, 1000, 2000]);
  });
  it("gives no change when paid exactly", () => {
    expect(changeFor(500, 500)).toEqual({ change: 0, steps: [], pieces: [] });
  });
  it("refuses to pay too little", () => {
    expect(() => changeFor(500, 400)).toThrow("not-enough-paid");
  });
  it("always adds up, with the fewest pieces", () => {
    const r = seededRandom(5);
    for (let i = 0; i < 300; i++) {
      const price = Math.floor(r() * 10000);
      const paid = price + Math.floor(r() * 10000);
      const c = changeFor(price, paid);
      expect(c.steps.reduce((a, s) => a + s.add, 0)).toBe(paid - price);
      expect(c.pieces.reduce((a, p) => a + p, 0)).toBe(paid - price);
    }
  });
});

describe("types from data", () => {
  it("lists every quantity", () => {
    expect(QUANTITIES).toEqual(["money", "length", "mass", "time"]);
    const cm: UnitSymbol<"length"> = "cm"; // "kg" here would not compile
    expect(cm).toBe("cm");
  });
});
