import { seededRandom } from "../lib/random";
import { TOPICS, makeMixedQuestion, topicsFor, type TopicId } from "./daily-topics";

describe("Heute üben topics", () => {
  it("each level has several topics", () => {
    expect(topicsFor("grundschule").length).toBeGreaterThanOrEqual(5);
    expect(topicsFor("sek1").length).toBeGreaterThanOrEqual(7);
  });
  it.each(Object.keys(TOPICS) as TopicId[])("%s: questions read well, with one right choice among different ones", (topic) => {
    const r = seededRandom(topic.length);
    for (const level of TOPICS[topic].levels) {
      for (let i = 0; i < 150; i++) {
        const q = makeMixedQuestion(topic, level, r);
        expect(q.topic).toBe(topic);
        for (const lang of ["de", "en"] as const) {
          const choices = q.choices(lang);
          expect(choices.length).toBeGreaterThanOrEqual(2);
          expect(new Set(choices).size).toBe(choices.length);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(choices.length);
          const text = [q.prompt(lang), ...choices, ...q.steps(lang)].join("\n");
          expect(text).not.toMatch(/undefined|NaN|\[object/);
          expect(q.steps(lang).length).toBeGreaterThan(0);
        }
      }
    }
  });
});
