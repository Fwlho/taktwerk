import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POST_STATUSES } from "@/lib/domain";
import { allowedTargets, canTransition, statusStep } from "@/lib/post-transitions";

// Liest die erlaubten Übergänge direkt aus der Migration – Oberfläche und Datenbank dürfen nicht auseinanderlaufen.
function sqlRules(role: string): Set<string> {
  const sql = readFileSync("supabase/migrations/20261030090000_kern.sql", "utf8");
  const block = sql.split(`when '${role}' then`)[1]?.split(/when '|else false/)[0] ?? "";
  return new Set([...block.matchAll(/\('(\w+)', '(\w+)'\)/g)].map((m) => `${m[1]}>${m[2]}`));
}

describe("Statuswechsel", () => {
  for (const role of ["owner", "editor", "external"] as const) {
    it(`${role}: Oberfläche und Datenbank erlauben dieselben Übergänge`, () => {
      const ui = new Set<string>();
      for (const from of POST_STATUSES) for (const to of allowedTargets(role, from)) ui.add(`${from}>${to}`);
      expect(ui).toEqual(sqlRules(role));
    });
  }

  it("nur Inhaber geben frei", () => {
    expect(canTransition("owner", "in_review", "approved")).toBe(true);
    expect(canTransition("editor", "in_review", "approved")).toBe(false);
    expect(canTransition("external", "in_review", "approved")).toBe(false);
  });

  it("Betrachter ändern nie den Status", () => {
    for (const from of POST_STATUSES) expect(allowedTargets("viewer", from)).toEqual([]);
  });

  it("Veröffentlicht/Ausgewertet nie per Hand", () => {
    for (const role of ["owner", "editor", "external"] as const)
      for (const from of POST_STATUSES) {
        expect(canTransition(role, from, "published")).toBe(false);
        expect(canTransition(role, "published", from)).toBe(false);
      }
  });

  it("Fortschrittsleiste", () => {
    expect(statusStep("idea")).toBe(1);
    expect(statusStep("changes_requested")).toBe(2);
    expect(statusStep("evaluated")).toBe(7);
  });
});
