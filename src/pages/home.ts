import "../styles/zone.css";
import { version } from "../../package.json";
import { loadTestReport } from "./report";
import { offlineReady } from "./sw-register";
import { currentStreak, dayOf, daysBetween, type Streak } from "../lib/daily";

// ---- the grown-ups' footer: tests, source, plans, version, offline ----
const footer = document.getElementById("version")!;
const testsLink = Object.assign(document.createElement("a"), { href: "tests/", textContent: "✅ Tests" });
footer.append(
  testsLink, " · ",
  Object.assign(document.createElement("a"), { href: "https://github.com/littleGex/fordMath", textContent: "Source" }), " · ",
  Object.assign(document.createElement("a"), { href: "https://github.com/littleGex/fordMath/issues", textContent: "Ideas and plans" }), " · ",
  `v${version}`,
);
offlineReady.then((ready) => {
  if (ready) footer.append(" · ", Object.assign(document.createElement("span"), { textContent: "✓ works offline", className: "offline" }));
});

// ---- school level filter (remembered on this device) ----
const LEVELS = ["all", "grundschule", "sek1", "oberstufe"] as const;
type Level = (typeof LEVELS)[number];
const isLevel = (s: string | null): s is Level => LEVELS.some((l) => l === s);

const LEVEL_KEY = "fm.level";
const chips = document.querySelectorAll<HTMLButtonElement>(".chip[data-level]");
const tiles = document.querySelectorAll<HTMLElement>("#helpers .tile");
const note = document.getElementById("level-note")!;

function applyLevel(level: Level): void {
  chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.level === level)));
  let ready = 0;
  let planned = 0;
  tiles.forEach((t) => {
    const levels = (t.dataset.levels ?? "").split(" ");
    const show = level === "all" || levels.includes(level);
    t.hidden = !show;
    if (show && level !== "all") t.classList.contains("planned") ? planned++ : ready++;
  });
  note.textContent =
    level === "all" ? "" : `${ready} ready to use, ${planned} coming soon. Faded tiles open their plan on GitHub.`;
  try { localStorage.setItem(LEVEL_KEY, level); } catch { /* storage blocked: the choice just isn't remembered */ }
}

chips.forEach((c) => c.addEventListener("click", () => applyLevel(isLevel(c.dataset.level ?? null) ? (c.dataset.level as Level) : "all")));

let saved: string | null = null;
try { saved = localStorage.getItem(LEVEL_KEY); } catch { /* ignore */ }
applyLevel(isLevel(saved) ? saved : "all");

// ---- live test count in the footer ----
loadTestReport().then((r) => {
  if (!r) return;
  testsLink.textContent = r.numFailedTests ? `⚠️ ${r.numFailedTests} tests failing` : `✅ ${r.numPassedTests} tests`;
});

// ---- the day streak on the "Heute üben" tile ----
try {
  const daily = JSON.parse(localStorage.getItem("fm.daily.v1") ?? "null") as { streak?: Streak } | null;
  const streak = daily?.streak;
  const today = dayOf(new Date());
  if (streak?.last && currentStreak(streak, today) > 0) {
    const doneToday = daysBetween(streak.last, today) === 0;
    document.getElementById("daily-desc")!.textContent = `🔥 ${streak.days} · ${doneToday ? "done today ✓" : "keep it going today!"}`;
  }
} catch {
  /* storage blocked: the tile just shows its usual text */
}
