/* fordMath service worker: makes the site work offline after the first visit.
 *
 * BASE, VERSION and PRECACHE are written above this file by build/sw-plugin.ts at build time:
 *   BASE      the site's path, "/fordMath/"
 *   VERSION   a hash of every built file, so each deploy gets a fresh cache
 *   PRECACHE  every page, script, style and icon of the site
 *
 * Strategies:
 *   pages (HTML)       network first, stored copy after 3 s or when offline, so updates arrive when online
 *   test-results.json  network first, the same way
 *   scripts, styles    stored copy first (their file names change whenever their content does)
 *   Google Fonts       stored copy straight away, refreshed in the background
 */

const CACHE = `fordmath-${VERSION}`;
const FONTS = "fordmath-fonts";
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  // Store everything, then take over straight away instead of waiting for every tab to close.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Delete the caches of older versions.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("fordmath-") && k !== CACHE && k !== FONTS).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

/** Safari refuses a page that a service worker answers with a redirected response, so copy it. */
async function clean(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers });
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("network timeout")), ms));
}

/**
 * Servers often add a "Vary" header (e.g. Vary: Origin), and module scripts are requested with
 * an Origin header that the install step didn't send. Matching on Vary would then miss every
 * stored file, so it's ignored: each URL here has exactly one stored version anyway.
 */
const MATCH = { ignoreVary: true };

async function networkFirst(request, key) {
  const cache = await caches.open(CACHE);
  try {
    const response = await clean(await Promise.race([fetch(request), timeout(NETWORK_TIMEOUT_MS)]));
    if (response.ok) await cache.put(key, response.clone());
    return response;
  } catch {
    const stored = await cache.match(key, { ...MATCH, ignoreSearch: true });
    if (stored) return stored;
    return new Response("Offline, and this page hasn't been stored yet.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const stored = await caches.match(request, MATCH);
  if (stored) return stored;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(FONTS);
  const stored = await cache.match(request, MATCH);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => stored);
  return stored ?? fresh;
}

/** "/fordMath/stats", "/fordMath/stats/" and "/fordMath/stats/index.html" are the same page. */
function pageKey(pathname) {
  if (pathname.endsWith("/index.html")) return pathname.slice(0, -"index.html".length);
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, pageKey(url.pathname)));
  } else if (url.pathname.endsWith("/test-results.json")) {
    event.respondWith(networkFirst(request, url.pathname));
  } else {
    event.respondWith(cacheFirst(request));
  }
});
