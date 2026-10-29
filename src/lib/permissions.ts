import type { MemberRole } from "@/server/db/database.types";

export const ROLES = ["owner", "editor", "external", "viewer"] as const satisfies readonly MemberRole[];

/**
 * Rechte je Rolle. Gilt für Oberfläche und Server Actions;
 * die Datenbank (RLS) erzwingt dieselben Regeln unabhängig davon.
 */
const PERMISSIONS = {
  "organization.update": ["owner"],
  "organization.delete": ["owner"],
  "profile.update": ["owner", "editor"],
  "members.view": ["owner", "editor", "external", "viewer"],
  "members.manage": ["owner"],
  "invitations.manage": ["owner"],
  "nav.approvals": ["owner", "editor", "external"],
  "nav.reports": ["owner", "editor", "viewer"],
  "nav.dashboard": ["owner", "editor", "viewer"],
  "nav.channels": ["owner", "editor", "viewer"],
  "nav.settings": ["owner", "editor", "external", "viewer"],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: MemberRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(role);
}

export function isRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
