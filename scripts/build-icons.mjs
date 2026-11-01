// Erzeugt die App-Icons (PWA, Favicon) aus dem Logo-Zeichen und den Design-Farben.
// Aufruf: npm run icons
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const tokens = JSON.parse(readFileSync("design/project/tokens.json", "utf8"));
const color = (name) => {
  const v = tokens.color.tokens.find((t) => t.name === name).value;
  return typeof v === "string" ? v : v.light;
};
const primary = color("color-primary");
const onPrimary = color("color-on-primary");
const accent = color("color-accent");

// Logo-Zeichen: drei Balken (8/14/10 auf 28er Raster), der dritte apricot
function svg(size, { padding = 0.18, rounded = true, mono = false } = {}) {
  const s = size;
  const inner = s * (1 - padding * 2);
  const unit = inner / 28;
  const barW = 4 * unit;
  const gap = 3 * unit;
  const heights = [8, 14, 10].map((h) => h * unit);
  const totalW = barW * 3 + gap * 2;
  const x0 = (s - totalW) / 2;
  const cy = s / 2;
  const bars = heights
    .map((h, i) => {
      const fill = mono ? "#ffffff" : i === 2 ? accent : onPrimary;
      return `<rect x="${x0 + i * (barW + gap)}" y="${cy - h / 2}" width="${barW}" height="${h}" rx="${barW / 2}" fill="${fill}"/>`;
    })
    .join("");
  const bg = mono ? "" : `<rect width="${s}" height="${s}" rx="${rounded ? s * 0.22 : 0}" fill="${primary}"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">${bg}${bars}</svg>`);
}

mkdirSync("public/icons", { recursive: true });
await sharp(svg(192)).png().toFile("public/icons/icon-192.png");
await sharp(svg(512)).png().toFile("public/icons/icon-512.png");
// „maskable“: volle Fläche, mehr Rand (Android schneidet zu)
await sharp(svg(512, { padding: 0.28, rounded: false })).png().toFile("public/icons/icon-maskable-512.png");
await sharp(svg(180, { rounded: false })).png().toFile("src/app/apple-icon.png");
// Badge für die Statusleiste: einfarbig weiß auf transparent
await sharp(svg(72, { mono: true, padding: 0.12 })).png().toFile("public/icons/badge-72.png");
writeFileSync("src/app/icon.svg", svg(64));
console.log("Icons erzeugt.");
