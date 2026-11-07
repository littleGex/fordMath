import { expect, test } from "@playwright/test";
import type { Server } from "node:http";
import { preview, type PreviewServer } from "vite";

/**
 * Every page, with something only its script draws, so the test proves the JavaScript
 * ran offline too, not just the HTML (which an earlier version of this test missed).
 */
const PAGES: Array<[path: string, drawnByScript: string]> = [
  ["", "#version .offline"],
  ["stats/", "#results .tile"],
  ["quadratic/", "#plot path"],
  ["function/", "#plot path"],
  ["einmaleins/", ".table-btn"],
  ["schriftlich/", "#board .cell"],
  ["teiler/", "#rules .rule"],
  ["brueche/", ".level-btn"],
  ["stellenwerte/", "#pv-table .pv-digit"],
  ["groessen/", "#unit-list .unit-row"],
  ["punkt-vor-strich/", "#working .op"],
  ["gleichungssysteme/", "#graph circle"],
  ["kopfrechnen/", "#levels .level-pick"],
  ["umfang-flaeche/", "#grid .cell"],
  ["dezimalzahlen/", "#pv td"],
  ["negative-zahlen/", "#thermo circle"],
  ["sachaufgaben/", "#story .sentence"],
  ["symmetrie/", "#mirror-grid .given"],
  ["winkel/", "#board .vertex"],
  ["quader/", "#cuboid .top"],
  ["heute/", "#topics .topic-row"],
  ["halbschriftlich/", "#working input"],
  ["prozent/", "#dreisatz span"],
  ["dreisatz/", "#graph circle"],
  ["gleichungen/", "#choices button"],
  ["koordinaten/", "#draw polygon"],
  ["tests/", "#n-pass, #empty"],
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

test("every page works offline after one visit", async ({ page }) => {
  // First visit, online: the service worker installs and stores the whole site.
  await page.goto(`${origin}/fordMath/`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.locator(".offline")).toHaveText("✓ works offline");

  // Switch the server off completely: from now on only the service worker can answer.
  (server.httpServer as Server).closeAllConnections();
  await server.close();
  const refused = await page.evaluate(async (url) => {
    try {
      await fetch(url, { cache: "no-store" });
      return false;
    } catch {
      return true;
    }
  }, `${origin}/does-not-exist-${Date.now()}`);
  expect(refused).toBe(true);

  for (const [path, drawn] of PAGES) {
    await page.goto(`${origin}/fordMath/${path}`);
    await expect(page.locator(drawn).first(), `page /${path}`).toBeVisible();
  }

  // And a game really runs offline, not just the page shell.
  await page.goto(`${origin}/fordMath/einmaleins/`);
  await page.click("#start");
  await expect(page.locator("#question")).toHaveText(/^\d+ [·:] \d+$/);
  await page.goto(`${origin}/fordMath/schriftlich/#mal`);
  await expect(page.locator("#board .cell").first()).toBeVisible();
});
