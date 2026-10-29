import { describe, expect, it } from "vitest";
import {
  columnsToVoice,
  inviteSchema,
  newPasswordSchema,
  organizationProfileSchema,
  safeNextPath,
  signUpSchema,
  slugify,
  voiceToColumns,
} from "@/lib/validation";

describe("safeNextPath", () => {
  it("lässt nur interne Pfade zu", () => {
    expect(safeNextPath("/o/malerei")).toBe("/o/malerei");
    expect(safeNextPath("https://evil.example")).toBe("/start");
    expect(safeNextPath("//evil.example")).toBe("/start");
    expect(safeNextPath("/\\evil.example")).toBe("/start");
    expect(safeNextPath(undefined)).toBe("/start");
  });
});

describe("slugify", () => {
  it("ersetzt Umlaute und Sonderzeichen", () => {
    expect(slugify("Bäckerei Müller & Söhne")).toBe("baeckerei-mueller-soehne");
    expect(slugify("  Malerei Krause GmbH ")).toBe("malerei-krause-gmbh");
  });
  it("erfüllt die DB-Regel", () => {
    for (const name of ["A", "Ü", "!!", "Ein sehr sehr sehr sehr sehr langer Firmenname mit Zusatz"]) {
      expect(slugify(name)).toMatch(/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/);
    }
  });
});

describe("Formulare", () => {
  it("Registrierung verlangt 10 Zeichen Passwort und gültige E-Mail", () => {
    expect(signUpSchema.safeParse({ fullName: "Anna", email: "anna@test.de", password: "kurz" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "Anna", email: "anna@", password: "langesPasswort1" }).success).toBe(false);
    const ok = signUpSchema.safeParse({ fullName: " Anna ", email: " Anna@Test.de ", password: "langesPasswort1" });
    expect(ok.success && ok.data.email).toBe("anna@test.de");
  });

  it("Passwort-Wiederholung muss passen", () => {
    expect(newPasswordSchema.safeParse({ password: "langesPasswort1", confirm: "anders12345" }).success).toBe(false);
  });

  it("Einladung: nur bekannte Rollen", () => {
    expect(inviteSchema.safeParse({ email: "x@test.de", role: "admin" }).success).toBe(false);
    expect(inviteSchema.safeParse({ email: "x@test.de", role: "external" }).success).toBe(true);
  });

  it("Unternehmensprofil: Webseite und Leistungen werden normalisiert", () => {
    const r = organizationProfileSchema.safeParse({
      industry: "craft",
      location: "",
      radiusKm: "15",
      website: "malerei-krause.de",
      targetAudiences: ["private"],
      voice: "sie_formal",
      services: "Fassade, Tapezieren,\nBoden, ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.website).toBe("https://malerei-krause.de");
      expect(r.data.services).toEqual(["Fassade", "Tapezieren", "Boden"]);
      expect(r.data.location).toBeNull();
      expect(r.data.radiusKm).toBe(15);
    }
  });

  it("Unternehmensprofil: Branche ist Pflicht", () => {
    const r = organizationProfileSchema.safeParse({
      industry: "",
      location: "",
      radiusKm: "",
      website: "",
      targetAudiences: [],
      voice: "du_casual",
      services: "",
    });
    expect(r.success).toBe(false);
  });

  it("Ansprache ↔ Spalten", () => {
    expect(voiceToColumns("sie_formal")).toEqual({ addressForm: "sie", tone: "formal" });
    expect(columnsToVoice("sie", "formal")).toBe("sie_formal");
    expect(columnsToVoice("du", null)).toBe("du_casual");
    expect(columnsToVoice("sie", "unbekannt")).toBe("sie_friendly");
  });
});

describe("Neuer Beitrag", () => {
  it("akzeptiert Tag + Uhrzeit, lehnt kaputte Uhrzeit ab", async () => {
    const { newPostSchema } = await import("@/lib/validation");
    const base = { title: "X", channelId: "735c15f6-0655-494d-8cea-d386f2630a26", campaignId: "", plannedOn: "2026-11-04", status: "draft" as const };
    expect(newPostSchema.safeParse({ ...base, time: "09:00" }).success).toBe(true);
    expect(newPostSchema.safeParse({ ...base, time: "" }).success).toBe(true);
    expect(newPostSchema.safeParse({ ...base, time: "9 Uhr" }).success).toBe(false);
  });
});
