import { expect, test } from "@playwright/test";
import { preview, type PreviewServer } from "vite";

/**
 * Gleichungen: on every level, solve a whole round of five by tapping steps until the line
 * "x = …" (or L = { }) appears. Wrong taps must show an explanation and switch that button off.
 */
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

for (const level of [1, 2, 3, 4, 5]) {
  test(`a round of equations on level ${level}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${origin}/fordMath/gleichungen/`);
    await page.locator("#levels button").nth(level - 1).click();
    for (let task = 0; task < 5; task++) {
      for (let tap = 0; tap < 40 && !(await page.locator("#end").isVisible()); tap++) {
        const lines = await page.locator("#book .math").count();
        await page.locator("#choices button:not([disabled])").first().click();
        if ((await page.locator("#book .math").count()) === lines) {
          // A wrong step: explained, and that button can't be tapped again.
          await expect(page.locator("#message")).toBeVisible();
          await expect(page.locator("#choices button.wrong")).not.toHaveCount(0);
        }
      }
      await expect(page.locator("#result")).toContainText("L = ");
      await page.click("#next");
    }
    await expect(page.locator("#done")).toBeVisible();
    await expect(page.locator("#stars")).toContainText("★");
    expect(errors).toEqual([]);
  });
}

test("solves a typed equation", async ({ page }) => {
  await page.goto(`${origin}/fordMath/gleichungen/`);
  await page.fill("#own", "4(x - 1) = 2x + 6");
  await page.click("#own-go");
  await expect(page.locator("#book .math").first()).toHaveText("4(x − 1) = 2x + 6");
  await page.fill("#own", "x^2 = 4");
  await page.click("#own-go");
  await expect(page.locator("#own-error")).toBeVisible();
});
