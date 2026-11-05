import "./sw-register";
import "../styles/zone.css";
import "../styles/tests.css";
import { loadTestReport, type AssertionResult } from "./report";

declare const __BUILD_SHA__: string;

const $ = (id: string) => document.getElementById(id)!;

function row(t: AssertionResult): HTMLLIElement {
  const li = document.createElement("li");
  li.className = t.status;
  const mark = document.createElement("span");
  mark.className = "mark";
  mark.textContent = t.status === "passed" ? "✓" : t.status === "failed" ? "✗" : "–";
  mark.setAttribute("aria-label", t.status);
  const name = document.createElement("span");
  name.textContent = t.title;
  const ms = document.createElement("span");
  ms.className = "ms";
  ms.textContent = t.duration != null ? `${t.duration < 1 ? "<1" : Math.round(t.duration)} ms` : "";
  li.append(mark, name, ms);
  if (t.status === "failed" && t.failureMessages.length) {
    const why = document.createElement("span");
    why.className = "why";
    why.textContent = t.failureMessages[0]!.split("\n").slice(0, 3).join("\n");
    li.appendChild(why);
  }
  return li;
}

const report = await loadTestReport();
if (!report) {
  $("empty").hidden = false;
  $("summary").hidden = true;
} else {
  $("n-pass").textContent = String(report.numPassedTests);
  $("n-fail").textContent = String(report.numFailedTests);
  $("n-files").textContent = String(report.testResults.length);
  $("fail-tile").classList.toggle("has-fail", report.numFailedTests > 0);

  const when = new Date(report.startTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const sha = __BUILD_SHA__;
  $("when").innerHTML = sha === "local"
    ? `Run ${when} on this computer`
    : `Run ${when} for commit <a href="https://github.com/littleGex/fordMath/commit/${sha}">${sha.slice(0, 7)}</a>`;

  const files = [...report.testResults].sort((a, b) => a.name.localeCompare(b.name));
  for (const file of files) {
    const box = document.createElement("section");
    box.className = "file";
    const h = document.createElement("h2");
    const passed = file.assertionResults.filter((t) => t.status === "passed").length;
    h.innerHTML = `<span></span><span class="count"></span>`;
    h.firstElementChild!.textContent = file.name.replace(/^.*?\/src\//, "src/");
    h.lastElementChild!.textContent = `${passed}/${file.assertionResults.length}`;
    box.appendChild(h);

    // group by the innermost describe() block
    const groups = new Map<string, AssertionResult[]>();
    for (const t of file.assertionResults) {
      const g = t.ancestorTitles.join(" › ") || "(top level)";
      groups.set(g, [...(groups.get(g) ?? []), t]);
    }
    for (const [g, tests] of groups) {
      const gh = document.createElement("h3");
      gh.textContent = g;
      const ul = document.createElement("ul");
      ul.append(...tests.map(row));
      box.append(gh, ul);
    }
    $("files").appendChild(box);
  }
}
