// Führt die pgTAP-Tests direkt im lokalen DB-Container aus.
// (`supabase test db` kann unter Windows Pfade auf anderen Laufwerken nicht einbinden.)
// Aufruf: npm run test:db
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/tests/database";
const container = "supabase_db_taktwerk";
let failed = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  let out;
  try {
    out = execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-q", "-X", "-t", "-A", "-v", "ON_ERROR_STOP=1"], {
      input: readFileSync(join(dir, file)),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e) {
    console.error(`✗ ${file}\n${e.stderr || e.message}`);
    failed++;
    continue;
  }
  const lines = out.split(/\r?\n/).filter((l) => /^(ok|not ok|#)/.test(l));
  const bad = lines.filter((l) => l.startsWith("not ok") || /Looks like/.test(l));
  const passed = lines.filter((l) => l.startsWith("ok")).length;
  if (bad.length) {
    failed++;
    console.error(`✗ ${file}\n${bad.join("\n")}`);
  } else {
    console.log(`✓ ${file} – ${passed} Tests bestanden`);
  }
}

process.exit(failed ? 1 : 0);
