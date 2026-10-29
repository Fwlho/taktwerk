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
  "channels.manage": ["owner"],
  "campaigns.create": ["owner", "editor"],
  "campaigns.update": ["owner", "editor"],
  "campaigns.delete": ["owner"],
  "posts.create": ["owner", "editor"],
  "posts.delete": ["owner", "editor"],
  "posts.assign": ["owner", "editor"],
  "posts.approve": ["owner"],
  "posts.schedule": ["owner", "editor"],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: MemberRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(role);
}

export function isRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
