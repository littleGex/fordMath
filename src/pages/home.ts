import "../styles/zone.css";
import { version } from "../../package.json";
import { loadTestReport } from "./report";

// ---- version footer ----
document.getElementById("version")!.innerHTML =
  `v${version} · <a href="https://github.com/littleGex/fordMath">GitHub</a> · ` +
  `<a href="https://github.com/littleGex/fordMath/issues">Ideas and plans</a>`;

// ---- filters (remembered on this device) ----
const FILTER_KEY = "fm.filter";
const chips = document.querySelectorAll<HTMLButtonElement>(".chip");
const tiles = document.querySelectorAll<HTMLElement>("#helpers .tile");

function applyFilter(f: string): void {
  if (![...chips].some((c) => c.dataset.filter === f)) f = "all";
  chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === f)));
  tiles.forEach((t) => (t.hidden = f !== "all" && t.dataset.state !== f));
  try { localStorage.setItem(FILTER_KEY, f); } catch { /* storage blocked: filter just isn't remembered */ }
}
chips.forEach((c) => c.addEventListener("click", () => applyFilter(c.dataset.filter ?? "all")));
let saved = "all";
try { saved = localStorage.getItem(FILTER_KEY) ?? "all"; } catch { /* ignore */ }
applyFilter(saved);

// ---- live test count on the Tests tile ----
loadTestReport().then((r) => {
  if (!r) return;
  const badge = document.getElementById("tests-badge")!;
  badge.textContent = r.numFailedTests ? `${r.numFailedTests} failing` : `${r.numPassedTests} ✓`;
});
