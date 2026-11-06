import { expect, test } from "@playwright/test";
import { preview, type PreviewServer } from "vite";

/**
 * Every page that uses the shared quiz (src/pages/quiz.ts): play a whole round by always
 * tapping the first choice, and check the stars appear at the end. This proves the shared
 * component is wired up on each page, whatever the page's own questions are.
 */
const QUIZZES: Array<[path: string, host: string, before?: string]> = [
  ["groessen/", "#quiz"],
  ["stellenwerte/", "#quiz"],
  ["umfang-flaeche/", "#quiz"],
  ["dezimalzahlen/", "#quiz"],
  ["negative-zahlen/", "#quiz"],
  ["quader/", "#quiz"],
  ["symmetrie/", "#axes-mode", '[data-mode="axes"]'],
  ["heute/", "#quiz"],
  ["prozent/", "#quiz"],
];

let server: PreviewServer;
let origin = "";

test.beforeAll(async () => {
  server = await preview({ preview: { port: 0, strictPort: false }, logLevel: "error" });
  const address = server.httpServer.address();
  if (!address || typeof address === "string") throw new Error("preview server has no port");
  origin = `http://localhost:${address.port}`;
});

test.afterAll(async () => {
  await server?.close().catch(() => {});
});

for (const [path, host, before] of QUIZZES) {
  test(`a whole quiz round on /${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${origin}/fordMath/${path}`);
    if (before) await page.click(before);
    const quiz = page.locator(host);
    const start = quiz.locator(".quiz-start button.big-btn");
    if (await start.isVisible()) await start.click();
    for (let i = 0; i < 20 && (await quiz.locator(".quiz-play").isVisible()); i++) {
      await quiz.locator(".quiz-choices button").first().click();
      await expect(quiz.locator(".quiz-feedback")).toBeVisible();
      await expect(quiz.locator(".quiz-feedback .steps li").first()).toBeVisible();
      await quiz.locator(".quiz-feedback button").click();
    }
    await expect(quiz.locator(".quiz-done .stars")).toHaveText(/[⭐☆]{3}/u);
    expect(errors).toEqual([]);
  });
}
