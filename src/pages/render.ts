import type { ExplainSection } from "../explain/types";

/**
 * Renders explanation sections as collapsible lists inside `box`.
 * Sections keep their open/closed state between updates, matched by title.
 */
export function renderSections(box: HTMLElement, sections: readonly ExplainSection[], colour: string): void {
  const wasOpen = new Map(
    [...box.querySelectorAll("details")].map((d) => [d.querySelector("summary")?.textContent ?? "", d.open]),
  );
  box.replaceChildren(
    ...sections.map((section) => {
      const details = document.createElement("details");
      details.className = colour;
      details.open = wasOpen.get(section.title) ?? true;
      const summary = document.createElement("summary");
      summary.textContent = section.title;
      const ol = document.createElement("ol");
      ol.append(...section.steps.map((step) => Object.assign(document.createElement("li"), { textContent: step })));
      details.append(summary, ol);
      return details;
    }),
  );
}
