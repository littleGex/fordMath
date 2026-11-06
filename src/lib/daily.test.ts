import { chooseTopics, currentStreak, dayOf, daysBetween, finishRound, recordAnswer, topicWeight, type Day, type Progress } from "./daily";
import { seededRandom } from "./random";

const D = (s: string) => s as Day;

describe("days", () => {
  it("writes a local date as YYYY-MM-DD", () => {
    expect(dayOf(new Date(2026, 10, 6, 23, 59))).toBe("2026-11-06");
  });
  it("counts days across months and a clock change", () => {
    expect(daysBetween(D("2026-10-31"), D("2026-11-01"))).toBe(1);
    expect(daysBetween(D("2026-10-24"), D("2026-10-26"))).toBe(2); // the clocks go back on 25 October
    expect(daysBetween(D("2026-11-06"), D("2026-11-06"))).toBe(0);
  });
});

describe("the streak", () => {
  it("grows day by day, stays within a day, and starts again after a gap", () => {
    let s = finishRound({ last: null, days: 0 }, D("2026-11-04"));
    expect(s).toEqual({ last: "2026-11-04", days: 1 });
    s = finishRound(s, D("2026-11-05"));
    s = finishRound(s, D("2026-11-05"));
    expect(s.days).toBe(2);
    s = finishRound(s, D("2026-11-06"));
    expect(s.days).toBe(3);
    expect(finishRound(s, D("2026-11-09"))).toEqual({ last: "2026-11-09", days: 1 });
  });
  it("shows as broken once a day is missed", () => {
    const s = { last: D("2026-11-05"), days: 4 };
    expect(currentStreak(s, D("2026-11-06"))).toBe(4); // yesterday: still alive, practise today to keep it
    expect(currentStreak(s, D("2026-11-07"))).toBe(0);
    expect(currentStreak({ last: null, days: 0 }, D("2026-11-07"))).toBe(0);
  });
});

describe("progress and choosing topics", () => {
  it("records answers without changing the old object", () => {
    const p: Progress = {};
    const q = recordAnswer(recordAnswer(p, "kopf", true, D("2026-11-06")), "kopf", false, D("2026-11-06"));
    expect(q).toEqual({ kopf: { seen: 2, right: 1, last: "2026-11-06" } });
    expect(p).toEqual({});
  });
  it("weak topics weigh more than strong ones", () => {
    const today = D("2026-11-06");
    const strong = topicWeight({ seen: 10, right: 10, last: today }, today);
    const weak = topicWeight({ seen: 10, right: 3, last: today }, today);
    const unseen = topicWeight(undefined, today);
    expect(weak).toBeGreaterThan(unseen);
    expect(unseen).toBeGreaterThan(strong);
    expect(topicWeight({ seen: 10, right: 10, last: D("2026-11-01") }, today)).toBeGreaterThan(strong);
  });
  it("chooses n topics, at most two of each, and the weak one most often", () => {
    const topics = ["a", "b", "c", "d", "e", "f"] as const;
    const today = D("2026-11-06");
    const p: Progress = { a: { seen: 20, right: 2, last: today }, b: { seen: 20, right: 20, last: today } };
    const r = seededRandom(28);
    const counts = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      const round = chooseTopics(topics, p, today, r);
      expect(round).toHaveLength(10);
      for (const t of topics) expect(round.filter((x) => x === t).length).toBeLessThanOrEqual(2);
      for (const t of round) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    expect(counts.get("a")!).toBeGreaterThan(counts.get("b")!);
  });
  it("allows more of each when there are few topics", () => {
    expect(chooseTopics(["x", "y"], {}, D("2026-11-06"), seededRandom(1))).toHaveLength(10);
  });
});
