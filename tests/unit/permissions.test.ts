import { describe, expect, it } from "vitest";
import { homePath, navItemsFor } from "@/components/nav/nav-items";
import { can, isRole } from "@/lib/permissions";

describe("Rollenrechte", () => {
  it("nur Inhaber verwalten Mitglieder und Einladungen", () => {
    expect(can("owner", "members.manage")).toBe(true);
    expect(can("owner", "invitations.manage")).toBe(true);
    for (const role of ["editor", "external", "viewer"] as const) {
      expect(can(role, "members.manage")).toBe(false);
      expect(can(role, "invitations.manage")).toBe(false);
      expect(can(role, "organization.update")).toBe(false);
      expect(can(role, "organization.delete")).toBe(false);
    }
  });

  it("Unternehmensprofil: Inhaber und Ersteller, nicht Externe/Betrachter", () => {
    expect(can("owner", "profile.update")).toBe(true);
    expect(can("editor", "profile.update")).toBe(true);
    expect(can("external", "profile.update")).toBe(false);
    expect(can("viewer", "profile.update")).toBe(false);
  });

  it("ohne Rolle keine Rechte", () => {
    expect(can(null, "members.view")).toBe(false);
    expect(can(undefined, "profile.update")).toBe(false);
  });

  it("isRole erkennt nur gültige Rollen", () => {
    expect(isRole("owner")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("Navigation je Rolle", () => {
  const keys = (role: Parameters<typeof navItemsFor>[0]) => navItemsFor(role).map((i) => i.key);

  it("Externe sehen nur Kalender, Kampagnen, Beiträge und Einstellungen", () => {
    expect(keys("external")).toEqual(["calendar", "campaigns", "posts", "settings"]);
  });

  it("Betrachter sehen keine Freigaben", () => {
    expect(keys("viewer")).not.toContain("approvals");
  });

  it("Inhaber sehen alles in Design-Reihenfolge", () => {
    expect(keys("owner")).toEqual(["dashboard", "calendar", "campaigns", "posts", "approvals", "reports", "channels", "settings"]);
  });

  it("Startseite: Externe ohne Dashboard", () => {
    expect(homePath("malerei", "external")).toBe("/o/malerei/posts");
    expect(homePath("malerei", "owner")).toBe("/o/malerei");
  });
});
