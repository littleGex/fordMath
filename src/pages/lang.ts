import type { Lang } from "../explain/lang";

/** One language setting shared by all the children's pages, remembered on this device. */
const KEY = "fm.lang";

export function getLang(fallback: Lang = "de"): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === "de" || v === "en" ? v : fallback;
  } catch {
    return fallback;
  }
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
}
