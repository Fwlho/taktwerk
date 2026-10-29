"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import { isRole } from "@/lib/permissions";
import {
  inviteSchema,
  organizationProfileSchema,
  organizationSchema,
  slugify,
  voiceToColumns,
  type InviteInput,
  type OrganizationInput,
  type OrganizationProfileFormValues,
} from "@/lib/validation";
import { ForbiddenError, getOrgContext, requirePermission, requireUser } from "@/server/auth/session";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/server/db/supabase";
import { homePath } from "@/components/nav/nav-items";

export type ActionResult<T = undefined> = { ok?: true; data?: T; error?: string };

const UNIQUE_VIOLATION = "23505";

async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: "forbidden" };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Unternehmen
// ---------------------------------------------------------------------------

export async function createOrganization(input: OrganizationInput): Promise<ActionResult> {
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const base = slugify(parsed.data.name);
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.rpc("create_organization", { p_name: parsed.data.name, p_slug: slug });
    if (!error) redirect(`/o/${slug}/onboarding`);
    if (error.code !== UNIQUE_VIOLATION) return { error: "generic" };
    slug = `${base.slice(0, 40)}-${randomBytes(2).toString("hex")}`;
  }
  return { error: "generic" };
}

export async function renameOrganization(slug: string, input: OrganizationInput): Promise<ActionResult> {
  return guard(async () => {
    const parsed = organizationSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "organization.update");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("organizations").update({ name: parsed.data.name }).eq("id", organization.id);
    if (error) return { error: "generic" };
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true };
  });
}

export async function saveOrganizationProfile(
  slug: string,
  input: OrganizationProfileFormValues,
  options: { completeOnboarding?: boolean } = {},
): Promise<ActionResult> {
  return guard(async () => {
    // Server prüft die Rohwerte erneut (Client-Werte nie ungeprüft übernehmen)
    const parsed = organizationProfileSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "profile.update");
    const v = parsed.data;
    const { addressForm, tone } = voiceToColumns(v.voice);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("organization_profiles")
      .update({
        industry: v.industry,
        location: v.location,
        radius_km: v.radiusKm,
        website: v.website,
        target_audiences: v.targetAudiences,
        address_form: addressForm,
        tone,
        services: v.services,
        ...(options.completeOnboarding ? { onboarding_completed_at: new Date().toISOString() } : {}),
      })
      .eq("organization_id", organization.id);
    if (error) return { error: "generic" };
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true };
  });
}

/** Onboarding überspringen – Dashboard zeigt dann die Checkliste. */
export async function skipOnboarding(slug: string) {
  const ctx = await getOrgContext(slug);
  redirect(homePath(slug, ctx.role));
}

// ---------------------------------------------------------------------------
// Mitglieder
// ---------------------------------------------------------------------------

export async function changeMemberRole(slug: string, userId: string, role: string): Promise<ActionResult> {
  return guard(async () => {
    if (!isRole(role)) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "members.manage");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("memberships")
      .update({ role }, { count: "exact" })
      .eq("organization_id", organization.id)
      .eq("user_id", userId);
    if (error) return { error: error.message === "last_owner" ? "lastOwner" : "generic" };
    if (!count) return { error: "forbidden" };
    revalidatePath(`/o/${slug}/settings/team`);
    return { ok: true };
  });
}

export async function removeMember(slug: string, userId: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization, user } = await getOrgContext(slug);
    if (userId !== user.id) await requirePermission(slug, "members.manage");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("memberships")
      .delete({ count: "exact" })
      .eq("organization_id", organization.id)
      .eq("user_id", userId);
    if (error) return { error: error.message === "last_owner" ? "lastOwner" : "generic" };
    if (!count) return { error: "forbidden" };
    if (userId === user.id) redirect("/start?choose=1");
    revalidatePath(`/o/${slug}/settings/team`);
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Einladungen
// ---------------------------------------------------------------------------

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export type InviteResult = ActionResult<{ link: string; emailSent: boolean }>;

export async function inviteMember(slug: string, input: InviteInput): Promise<InviteResult> {
  return guard(async () => {
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "invitations.manage");
    const supabase = await createSupabaseServerClient();

    const token = randomBytes(32).toString("base64url");
    const { error } = await supabase.from("invitations").insert({
      organization_id: organization.id,
      email: parsed.data.email,
      role: parsed.data.role,
      token_hash: hashToken(token),
    });
    if (error) return { error: error.code === UNIQUE_VIOLATION ? "alreadyInvited" : "generic" };

    const site = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    const link = `${site}/invite/${token}`;

    // Neue Personen bekommen die Einladungs-Mail von Supabase; bestehende Konten
    // sehen die Einladung nach der Anmeldung unter /start. Der Link geht immer.
    let emailSent = false;
    const admin = createSupabaseAdminClient();
    const { error: mailError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: `${site}/auth/confirm?next=${encodeURIComponent(`/invite/${token}`)}`,
    });
    emailSent = !mailError;

    revalidatePath(`/o/${slug}/settings/team`);
    return { ok: true, data: { link, emailSent } };
  });
}

export async function revokeInvitation(slug: string, invitationId: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await requirePermission(slug, "invitations.manage");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("invitations").delete().eq("id", invitationId).eq("organization_id", organization.id);
    if (error) return { error: "generic" };
    revalidatePath(`/o/${slug}/settings/team`);
    return { ok: true };
  });
}

async function goToOrganization(organizationId: string): Promise<never> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("organizations").select("slug").eq("id", organizationId).single();
  redirect(data ? `/o/${data.slug}` : "/start");
}

export async function acceptInvitationByToken(token: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: error.message === "invitation_email_mismatch" ? "emailMismatch" : "invalid" };
  return goToOrganization(data);
}

export async function acceptInvitationById(invitationId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_invitation_by_id", { p_invitation_id: invitationId });
  if (error) return { error: "invalid" };
  return goToOrganization(data);
}
