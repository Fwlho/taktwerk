import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/db/supabase";
import type { MemberRole } from "@/server/db/database.types";
import { can, type Permission } from "@/lib/permissions";

export type CurrentUser = { id: string; email: string; fullName: string };

/** Angemeldete Person oder null. Einmal pro Anfrage. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .maybeSingle();
  return { id: data.user.id, email: data.user.email ?? "", fullName: profile?.full_name ?? "" };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type OrgContext = {
  user: CurrentUser;
  organization: { id: string; name: string; slug: string };
  role: MemberRole;
};

/** Unternehmen + eigene Rolle anhand des Slugs. 404, wenn keine Mitgliedschaft (verrät nichts). */
export const getOrgContext = cache(async (slug: string): Promise<OrgContext> => {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, slug, memberships!inner(role, user_id)")
    .eq("slug", slug)
    .eq("memberships.user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const membership = data.memberships[0];
  if (!membership) notFound();
  return { user, organization: { id: data.id, name: data.name, slug: data.slug }, role: membership.role };
});

export class ForbiddenError extends Error {
  constructor() {
    super("forbidden");
  }
}

/** Für Server Actions: Rolle prüfen, sonst Fehler. */
export async function requirePermission(slug: string, permission: Permission): Promise<OrgContext> {
  const ctx = await getOrgContext(slug);
  if (!can(ctx.role, permission)) throw new ForbiddenError();
  return ctx;
}

/** Alle Unternehmen der angemeldeten Person. */
export async function listMyOrganizations() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).flatMap((m) => (m.organizations ? [{ ...m.organizations, role: m.role }] : []));
}
