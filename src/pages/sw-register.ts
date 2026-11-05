/**
 * Registers the service worker (build/sw-template.js) so the whole site works offline
 * after the first visit. Only in the built site: during `npm run dev` it would serve
 * stale files while you're editing.
 */
export const offlineSupported = "serviceWorker" in navigator && import.meta.env.PROD;

export const offlineReady: Promise<boolean> = offlineSupported
  ? navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then(() => navigator.serviceWorker.ready)
      .then(() => true)
      .catch(() => false)
  : Promise.resolve(false);
