"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { addDays } from "@/lib/calendar";
import { getOrgContext, requirePermission } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { dbError, guard, type ActionResult } from "@/server/action-result";
import { sendPendingPushes } from "@/server/push/send";

const monday = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 1, "monday");

const WEEK_ERRORS: Record<string, string> = {
  nothing_to_submit: "nothingToSubmit",
  week_empty: "weekEmpty",
  week_start_monday: "invalid",
};
const weekError = (e: { message?: string; code?: string }) => (e.message && WEEK_ERRORS[e.message]) || dbError(e);

function revalidate(slug: string) {
  revalidatePath(`/o/${slug}`, "layout");
}

export async function copyPreviousWeek(slug: string, weekStart: string, channelId?: string): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const week = monday.safeParse(weekStart);
    if (!week.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.create");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("copy_week", {
      p_org: organization.id,
      p_from: addDays(week.data, -7),
      p_to: week.data,
      p_channel: channelId,
    });
    if (error) return { error: weekError(error) };
    revalidate(slug);
    return { ok: true, data: { count: data } };
  });
}

export async function listWeekTemplates(slug: string) {
  const { organization } = await getOrgContext(slug);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("week_templates")
    .select("id, name, is_default, week_template_slots(count)")
    .eq("organization_id", organization.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map(({ week_template_slots, ...t }) => ({ ...t, slots: week_template_slots[0]?.count ?? 0 }));
}

export async function saveWeekAsTemplate(slug: string, weekStart: string, name: string, isDefault: boolean): Promise<ActionResult> {
  return guard(async () => {
    const week = monday.safeParse(weekStart);
    const n = z.string().trim().min(1).max(120).safeParse(name);
    if (!week.success || !n.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.create");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("save_week_as_template", {
      p_org: organization.id,
      p_week_start: week.data,
      p_name: n.data,
      p_default: isDefault,
    });
    if (error) return { error: weekError(error) };
    return { ok: true };
  });
}

export async function applyWeekTemplate(slug: string, templateId: string, weekStart: string): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const week = monday.safeParse(weekStart);
    const id = z.uuid().safeParse(templateId);
    if (!week.success || !id.success) return { error: "invalid" };
    await requirePermission(slug, "posts.create");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("apply_week_template", { p_template: id.data, p_week_start: week.data });
    if (error) return { error: weekError(error) };
    revalidate(slug);
    return { ok: true, data: { count: data } };
  });
}

export async function deleteWeekTemplate(slug: string, templateId: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await requirePermission(slug, "posts.create");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("week_templates").delete().eq("id", templateId).eq("organization_id", organization.id);
    return error ? { error: dbError(error) } : { ok: true };
  });
}

export async function submitWeek(slug: string, weekStart: string, channelId?: string, message?: string): Promise<ActionResult> {
  return guard(async () => {
    const week = monday.safeParse(weekStart);
    if (!week.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("submit_week_for_approval", {
      p_org: organization.id,
      p_week_start: week.data,
      p_channel: channelId,
      p_message: message?.trim() || undefined,
    });
    if (error) return { error: weekError(error) };
    after(() => sendPendingPushes(organization.id));
    revalidate(slug);
    return { ok: true };
  });
}

export async function approveWeek(slug: string, requestId: string): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const id = z.uuid().safeParse(requestId);
    if (!id.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.approve");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("approve_week", { p_request: id.data });
    if (error) return { error: weekError(error) };
    after(() => sendPendingPushes(organization.id));
    revalidate(slug);
    return { ok: true, data: { count: data } };
  });
}

export async function listPromptTemplates(slug: string) {
  const { organization } = await getOrgContext(slug);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("prompt_templates")
    .select("id, name, kind, prompt")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
