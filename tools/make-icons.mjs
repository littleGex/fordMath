// Draws the favicon and Home Screen icons:  npm run icons
// Same style as Game Zone's icons: one flat symbol on the dark background.
// fordMath's symbol is four calculator keys (+ − × ÷) in the Game Zone controller-button colours.
// Writes public/favicon.svg plus public/icons/apple-touch-icon.png (180), icon-192.png and icon-512.png.
// The files are committed, so this only needs running after changing the art.
//
// Drawn on a 512 square. Android can crop to a circle, so the art is scaled to stay inside a
// circle of radius ~204 round the middle. iOS needs a square with no transparency.
import { mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const ROOT = new URL("../public/", import.meta.url).pathname;
const BG = "#141c2e";
const INK = "#eef3fb";

const key = (x, y, fill, symbol) =>
  `<rect x="${x}" y="${y}" width="164" height="164" rx="34" fill="${fill}"/>` +
  `<g transform="translate(${x + 82} ${y + 82})">${symbol}</g>`;

const stroke = (d, colour = INK) =>
  `<path d="${d}" fill="none" stroke="${colour}" stroke-width="24" stroke-linecap="round"/>`;

const ART = [
  key(84, 84, "#e84a5f", stroke("M-40 0H40M0 -40V40")),                    // +
  key(264, 84, "#3b7fc4", stroke("M-40 0H40")),                            // −
  key(84, 264, "#f2c81c", stroke("M-30 -30L30 30M30 -30L-30 30", BG)),     // ×
  key(264, 264, "#6aa84f",                                                 // ÷
    stroke("M-40 0H40") + `<circle cx="0" cy="-34" r="13" fill="${INK}"/><circle cx="0" cy="34" r="13" fill="${INK}"/>`),
].join("");

const svg = ({ fit = 1, rounded = false } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
  `<rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="${BG}"/>` +
  `<g transform="translate(256 256) scale(${fit}) translate(-256 -256)">${ART}</g></svg>`;

mkdirSync(`${ROOT}icons`, { recursive: true });

// Browser tab: rounded corners, art nearly full size so it reads at 16px.
writeFileSync(`${ROOT}favicon.svg`, svg({ fit: 1.08, rounded: true }) + "\n");

// Home Screen: square, art kept inside the safe zone.
for (const [file, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  const png = new Resvg(svg({ fit: 0.86 }), { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(`${ROOT}icons/${file}`, png);
}
console.log("favicon.svg and 3 PNG icons written to public/");
