// Erzeugt src/styles/tokens.css aus design/project/tokens.json.
// Nicht von Hand bearbeiten – Änderungen gehören in die Design-Übergabe.
// Aufruf: npm run tokens
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(resolve(root, "design/project/tokens.json"), "utf8"));
const outFile = resolve(root, "src/styles/tokens.css");

const light = (v) => (typeof v === "object" ? v.light : v);
const dark = (v) => (typeof v === "object" ? (v.dark ?? v.light) : v);
const list = (family) => tokens[family]?.tokens ?? [];
const strip = (name, prefix) => name.replace(new RegExp(`^${prefix}-`), "");

// Schriften werden über next/font selbst gehostet (keine Anfragen an Google → DSGVO).
// Die von next/font gesetzte Variable steht vorne, die Design-Kette dahinter als Fallback.
const loadedFont = { display: "--font-loaded-display", sans: "--font-loaded-sans", mono: "--font-loaded-mono" };

const themed = [...list("color"), ...list("shadow")];
const themeVars = (pick) => themed.map((t) => `  --${t.name}: ${pick(t.value)};`).join("\n");

const lines = [];
lines.push(`/* Taktwerk – generiert aus design/project/tokens.json (npm run tokens). Nicht bearbeiten. */`);
lines.push("");
lines.push("@theme static {");
lines.push("  --color-*: initial;");
for (const t of list("color")) lines.push(`  --${t.name}: ${light(t.value)};`);
lines.push("  --shadow-*: initial;");
for (const t of list("shadow")) lines.push(`  --${t.name}: ${light(t.value)};`);
lines.push("  --radius-*: initial;");
for (const t of list("radius")) lines.push(`  --radius-${strip(t.name, "radius")}: ${t.value};`);
lines.push("  --font-*: initial;");
for (const [key, stack] of Object.entries(tokens.type.families)) {
  lines.push(`  --font-${key}: var(${loadedFont[key]}), ${stack};`);
}
lines.push("  --breakpoint-*: initial;");
for (const t of list("breakpoint")) {
  if (parseFloat(t.value) > 0) lines.push(`  --breakpoint-${strip(t.name, "bp")}: ${t.value};`);
}
lines.push("  --ease-*: initial;");
for (const t of list("easing")) lines.push(`  --ease-${strip(t.name, "ease")}: ${t.value};`);
lines.push("  --text-*: initial;");
// 4-px-Raster: p-4 = space-4 = 16px. Erlaubt sind nur die Stufen aus tokens.json.
const unit = list("spacing").find((t) => t.name === "space-1")?.value ?? "4px";
lines.push(`  --spacing: ${unit};`);
lines.push("}");
lines.push("");

lines.push(":root {");
lines.push("  color-scheme: light;");
for (const fam of ["spacing", "size", "duration", "zIndex", "breakpoint"]) {
  for (const t of list(fam)) lines.push(`  --${t.name}: ${t.value};`);
}
lines.push("}");
lines.push("");
lines.push(`[data-theme="dark"] {\n  color-scheme: dark;\n${themeVars(dark)}\n}`);
lines.push("");
lines.push(`@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n${themeVars(dark).replace(/^/gm, "  ")}\n  }\n}`);
lines.push("");

// Typo-Stile als Utilities (text-display, text-h1, …)
for (const group of tokens.type.groups) {
  for (const s of group.styles) {
    const decl = [
      `font-family: var(--font-${group.family});`,
      `font-size: ${s.fontSize};`,
      `line-height: ${s.lineHeight};`,
      `font-weight: ${s.fontWeight};`,
    ];
    if (s.letterSpacing) decl.push(`letter-spacing: ${s.letterSpacing};`);
    if (s.name === "text-kpi") decl.push("font-variant-numeric: tabular-nums;");
    lines.push(`@utility ${s.name} {\n  ${decl.join("\n  ")}\n}`);
  }
}
lines.push("");

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, lines.filter((l) => l !== "").join("\n").replace(/\n(@|\[|:root)/g, "\n\n$1") + "\n");
console.log(`tokens.css geschrieben (${list("color").length} Farben).`);
