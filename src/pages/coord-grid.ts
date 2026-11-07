/**
 * Squared paper with an x- and a y-axis, shared by Koordinaten (#30) and Lineare Funktionen (#37).
 * Draw on it in maths coordinates (y goes up); taps come back as the nearest grid point.
 */
export interface GridView {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
export interface GridPoint {
  x: number;
  y: number;
}

const NS = "http://www.w3.org/2000/svg";
export const COLOURS = {
  grid: "#26324c", axis: "#a9b8c9", label: "#a9b8c9", ink: "#eef3fb",
  a: "#ffd84d", b: "#ff4da6", c: "#34d399", d: "#7c8cff", miss: "#6f8296", hit: "#ff5566",
} as const;

export class CoordGrid {
  private readonly size = 360;
  private readonly pad = 26;
  private nodes: SVGElement[] = [];

  constructor(private readonly svg: SVGSVGElement, public view: GridView, private readonly label = "") {
    svg.setAttribute("viewBox", `0 0 ${this.size} ${this.size}`);
    svg.setAttribute("role", "img");
  }

  private get unit(): number {
    const span = Math.max(this.view.xMax - this.view.xMin, this.view.yMax - this.view.yMin);
    return (this.size - 2 * this.pad) / span;
  }
  /** Maths coordinates to SVG pixels. */
  sx = (x: number): number => this.pad + (x - this.view.xMin) * this.unit;
  sy = (y: number): number => this.size - this.pad - (y - this.view.yMin) * this.unit;

  private add(tag: string, attrs: Record<string, string | number>, text?: string): SVGElement {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (text !== undefined) n.textContent = text;
    this.nodes.push(n);
    return n;
  }

  /** Starts a fresh drawing: grid lines, both axes with arrows, numbers on them. */
  begin(): this {
    this.nodes = [];
    const { xMin, xMax, yMin, yMax } = this.view;
    const step = xMax - xMin > 14 ? 2 : 1; // numbers on every line, or every other on a big grid
    for (let x = Math.ceil(xMin); x <= xMax; x++) this.add("line", { x1: this.sx(x), x2: this.sx(x), y1: this.sy(yMin), y2: this.sy(yMax), stroke: COLOURS.grid, "stroke-width": 1 });
    for (let y = Math.ceil(yMin); y <= yMax; y++) this.add("line", { x1: this.sx(xMin), x2: this.sx(xMax), y1: this.sy(y), y2: this.sy(y), stroke: COLOURS.grid, "stroke-width": 1 });
    const ox = Math.min(Math.max(0, xMin), xMax), oy = Math.min(Math.max(0, yMin), yMax);
    const arrow = (x1: number, y1: number, x2: number, y2: number) => {
      this.add("line", { x1, y1, x2, y2, stroke: COLOURS.axis, "stroke-width": 2 });
      const a = Math.atan2(y2 - y1, x2 - x1), h = 8;
      this.add("polygon", { points: `${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}`, fill: COLOURS.axis });
    };
    arrow(this.sx(xMin), this.sy(oy), this.sx(xMax) + 10, this.sy(oy));
    arrow(this.sx(ox), this.sy(yMin), this.sx(ox), this.sy(yMax) - 10);
    this.add("text", { x: this.sx(xMax) + 6, y: this.sy(oy) - 8, fill: COLOURS.label, "font-size": 13, "font-style": "italic", "text-anchor": "end" }, "x");
    this.add("text", { x: this.sx(ox) + 9, y: this.sy(yMax) - 2, fill: COLOURS.label, "font-size": 13, "font-style": "italic" }, "y");
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      if (x === ox || x % step !== 0) continue;
      this.add("line", { x1: this.sx(x), x2: this.sx(x), y1: this.sy(oy) - 3, y2: this.sy(oy) + 3, stroke: COLOURS.axis, "stroke-width": 1.5 });
      this.add("text", { x: this.sx(x), y: this.sy(oy) + 15, fill: COLOURS.label, "font-size": 11, "text-anchor": "middle" }, minus(x));
    }
    for (let y = Math.ceil(yMin); y <= yMax; y++) {
      if (y === oy || y % step !== 0) continue;
      this.add("line", { x1: this.sx(ox) - 3, x2: this.sx(ox) + 3, y1: this.sy(y), y2: this.sy(y), stroke: COLOURS.axis, "stroke-width": 1.5 });
      this.add("text", { x: this.sx(ox) - 6, y: this.sy(y) + 4, fill: COLOURS.label, "font-size": 11, "text-anchor": "end" }, minus(y));
    }
    this.add("text", { x: this.sx(ox) - 6, y: this.sy(oy) + 15, fill: COLOURS.label, "font-size": 11, "text-anchor": "end" }, "0");
    return this;
  }

  /** A point, with an optional name like "A" next to it. */
  dot(p: GridPoint, colour: string = COLOURS.a, name = "", r = 6): this {
    this.add("circle", { cx: this.sx(p.x), cy: this.sy(p.y), r, fill: colour });
    if (name) this.add("text", { x: this.sx(p.x) + 8, y: this.sy(p.y) - 8, fill: colour, "font-size": 15, "font-weight": 700 }, name);
    return this;
  }
  /** A cross, e.g. a miss in Schiffe versenken. */
  cross(p: GridPoint, colour: string = COLOURS.miss, r = 6): this {
    const [x, y] = [this.sx(p.x), this.sy(p.y)];
    this.add("path", { d: `M${x - r} ${y - r}L${x + r} ${y + r}M${x - r} ${y + r}L${x + r} ${y - r}`, stroke: colour, "stroke-width": 2.5, "stroke-linecap": "round" });
    return this;
  }
  /** A straight piece between two points, solid or dashed. */
  segment(a: GridPoint, b: GridPoint, colour: string = COLOURS.ink, width = 2.5, dash = ""): this {
    this.add("line", { x1: this.sx(a.x), y1: this.sy(a.y), x2: this.sx(b.x), y2: this.sy(b.y), stroke: colour, "stroke-width": width, "stroke-linecap": "round", ...(dash ? { "stroke-dasharray": dash } : {}) });
    return this;
  }
  /** Points joined in order; closed makes a shape. */
  polygon(points: readonly GridPoint[], colour: string = COLOURS.c, closed = true, fillOpacity = 0.18): this {
    const pts = points.map((p) => `${this.sx(p.x)},${this.sy(p.y)}`).join(" ");
    this.add(closed ? "polygon" : "polyline", { points: pts, fill: closed ? colour : "none", "fill-opacity": closed ? fillOpacity : 0, stroke: colour, "stroke-width": 2.5, "stroke-linejoin": "round" });
    return this;
  }
  /** The line y = m·x + b across the whole grid. */
  line(m: number, b: number, colour: string = COLOURS.a, width = 3): this {
    const { xMin, xMax, yMin, yMax } = this.view;
    // Cut the line where it leaves the grid, so it doesn't run over the edge.
    const ends: GridPoint[] = [];
    const tryPoint = (x: number, y: number) => {
      if (x >= xMin - 1e-9 && x <= xMax + 1e-9 && y >= yMin - 1e-9 && y <= yMax + 1e-9 && !ends.some((e) => Math.abs(e.x - x) < 1e-9 && Math.abs(e.y - y) < 1e-9)) ends.push({ x, y });
    };
    tryPoint(xMin, m * xMin + b);
    tryPoint(xMax, m * xMax + b);
    if (m !== 0) {
      tryPoint((yMin - b) / m, yMin);
      tryPoint((yMax - b) / m, yMax);
    }
    if (ends.length >= 2) this.segment(ends[0]!, ends[1]!, colour, width);
    return this;
  }
  /** Text at a point, nudged by (dx, dy) pixels. */
  text(p: GridPoint, text: string, colour: string = COLOURS.ink, dx = 0, dy = 0, anchor: "start" | "middle" | "end" = "middle", size = 13): this {
    this.add("text", { x: this.sx(p.x) + dx, y: this.sy(p.y) + dy, fill: colour, "font-size": size, "font-weight": 700, "text-anchor": anchor }, text);
    return this;
  }

  /** Puts the drawing on the page. */
  end(): void {
    if (this.label) this.svg.setAttribute("aria-label", this.label);
    this.svg.replaceChildren(...this.nodes);
  }

  /** Calls back with the nearest grid point when the child taps the paper. */
  onTap(handler: (p: GridPoint) => void): void {
    this.svg.addEventListener("click", (ev) => {
      const box = this.svg.getBoundingClientRect();
      const px = ((ev.clientX - box.left) / box.width) * this.size;
      const py = ((ev.clientY - box.top) / box.height) * this.size;
      const x = Math.round(this.view.xMin + (px - this.pad) / this.unit);
      const y = Math.round(this.view.yMin + (this.size - this.pad - py) / this.unit);
      if (x < this.view.xMin || x > this.view.xMax || y < this.view.yMin || y > this.view.yMax) return;
      handler({ x, y });
    });
  }
}

const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));
