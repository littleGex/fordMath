import "./style.css";
import { methods } from "./registry";
import { formatNumber, parseValues } from "./parse";
import { assertValid } from "./lib";

const input = document.querySelector<HTMLTextAreaElement>("#values")!;
const errorBox = document.querySelector<HTMLParagraphElement>("#error")!;
const grid = document.querySelector<HTMLDListElement>("#results")!;
const meta = document.querySelector<HTMLParagraphElement>("#meta")!;

// Build one result cell per registered method.
const outputs = new Map<string, HTMLElement>();
for (const m of methods) {
  const cell = document.createElement("div");
  cell.className = "result";
  cell.innerHTML = `<dt></dt><dd>–</dd><p class="desc"></p>`;
  cell.querySelector("dt")!.textContent = m.label;
  cell.querySelector(".desc")!.textContent = m.description;
  outputs.set(m.id, cell.querySelector("dd")!);
  grid.appendChild(cell);
}

const show = (r: number | number[]): string =>
  Array.isArray(r) ? (r.length ? r.map(formatNumber).join(", ") : "none") : formatNumber(r);

function update(): void {
  try {
    const values = parseValues(input.value);
    if (values.length === 0) throw new Error("Enter at least one number.");
    assertValid(values);
    for (const m of methods) outputs.get(m.id)!.textContent = show(m.compute(values));
    meta.textContent = `${values.length} values`;
    errorBox.hidden = true;
  } catch (e) {
    for (const el of outputs.values()) el.textContent = "–";
    meta.textContent = "";
    errorBox.textContent = e instanceof Error ? e.message : String(e);
    errorBox.hidden = false;
  }
}

input.addEventListener("input", update);
document.querySelectorAll<HTMLButtonElement>("[data-example]").forEach((b) =>
  b.addEventListener("click", () => {
    input.value = b.dataset.example ?? "";
    update();
  }),
);
update();
