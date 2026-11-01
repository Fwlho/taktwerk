"use server";

import { z } from "zod";
import { getOrgContext, requireUser } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { dbError, type ActionResult } from "@/server/action-result";

export type NotificationItem = {
  id: string;
  type: string;
  payload: { post_id?: string; title?: string };
  read_at: string | null;
  created_at: string;
};

/** Letzte Benachrichtigungen der angemeldeten Person in diesem Unternehmen (RLS: nur eigene). */
export async function fetchNotifications(slug: string): Promise<{ items: NotificationItem[]; unread: number }> {
  const { organization, user } = await getOrgContext(slug);
  const supabase = await createSupabaseServerClient();
  const [list, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, payload, read_at, created_at")
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);
  return { items: (list.data ?? []) as NotificationItem[], unread: unread.count ?? 0 };
}

export async function markNotificationsRead(slug: string, ids: string[] | "all"): Promise<ActionResult> {
  const { organization, user } = await getOrgContext(slug);
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .is("read_at", null);
  if (ids !== "all") {
    const parsed = z.array(z.uuid()).max(100).safeParse(ids);
    if (!parsed.success) return { error: "invalid" };
    q = q.in("id", parsed.data);
  }
  const { error } = await q;
  return error ? { error: dbError(error) } : { ok: true };
}

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Gerät für Push anmelden (gehört der Person, nicht dem Unternehmen). */
export async function savePushSubscription(input: unknown, userAgent: string): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  // Gleicher Endpunkt (z. B. nach Neuanmeldung) wird ersetzt
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: userAgent.slice(0, 300),
  });
  return error ? { error: dbError(error) } : { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return error ? { error: dbError(error) } : { ok: true };
}

/** Testnachricht an die eigenen Geräte */
export async function sendTestPush(slug: string): Promise<ActionResult> {
  const { organization, user } = await getOrgContext(slug);
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (!count) return { error: "noDevice" };
  const { sendTestNotification } = await import("@/server/push/test");
  await sendTestNotification(user.id, organization.slug);
  return { ok: true };
}
