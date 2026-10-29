// Prüft, ob alle im Code verwendeten Übersetzungsschlüssel in messages/de.json existieren.
// Aufruf: npm run check:messages
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const messages = JSON.parse(readFileSync("messages/de.json", "utf8"));
const get = (key) => key.split(".").reduce((o, p) => (o == null ? undefined : o[p]), messages);

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f)) files.push(p);
  }
})("src");

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let missing = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const vars = {};
  for (const m of src.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\("([^"]+)"\)/g)) vars[m[1]] = m[2];
  for (const [v, ns] of Object.entries(vars)) {
    if (get(ns) === undefined) {
      console.log(`Namespace fehlt: ${ns} (${file})`);
      missing++;
    }
    for (const m of src.matchAll(new RegExp(`\\b${escape(v)}\\("([^"]+)"`, "g"))) {
      if (get(`${ns}.${m[1]}`) === undefined) {
        console.log(`Schlüssel fehlt: ${ns}.${m[1]} (${file})`);
        missing++;
      }
    }
    for (const m of src.matchAll(new RegExp(`\\b${escape(v)}\\(\`([^\`]+)\``, "g"))) {
      const prefix = m[1].split("${")[0].replace(/\.$/, "");
      if (prefix && get(`${ns}.${prefix}`) === undefined) {
        console.log(`Schlüssel fehlt: ${ns}.${prefix}.* (${file})`);
        missing++;
      }
    }
  }
}

if (missing) {
  console.error(`${missing} fehlende Übersetzungen`);
  process.exit(1);
}
console.log("Alle Übersetzungsschlüssel vorhanden.");
