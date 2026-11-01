import "server-only";
import webpush from "web-push";
import { getTranslations } from "next-intl/server";
import { createSupabaseAdminClient } from "@/server/db/supabase";
import { notificationLink } from "@/lib/notifications";

let configured: boolean | undefined;

function configure(): boolean {
  if (configured !== undefined) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  configured = Boolean(pub && priv && subject);
  if (configured) webpush.setVapidDetails(subject!, pub!, priv!);
  return configured;
}

/**
 * Versendet Push-Nachrichten für neue Benachrichtigungen (pushed_at leer).
 * Wird nach Aktionen aufgerufen, die Benachrichtigungen erzeugen (Freigabe, Kommentar, Zuweisung).
 * Admin-Client, weil Empfänger andere Personen sind; es werden nur Titel und Link übertragen.
 */
export async function sendPendingPushes(organizationId: string) {
  if (!configure()) return;
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: pending } = await admin
    .from("notifications")
    .select("id, user_id, type, payload, organizations(slug)")
    .eq("organization_id", organizationId)
    .is("pushed_at", null)
    .gte("created_at", since)
    .limit(50);
  if (!pending?.length) return;

  // Sofort markieren – verhindert doppelten Versand bei parallelen Aufrufen
  const ids = pending.map((n) => n.id);
  await admin.from("notifications").update({ pushed_at: new Date().toISOString() }).in("id", ids).is("pushed_at", null);

  const userIds = [...new Set(pending.map((n) => n.user_id))];
  const { data: subs } = await admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds);
  if (!subs?.length) return;

  const t = await getTranslations("notifications");
  await Promise.all(
    pending.flatMap((n) => {
      const payload = (n.payload ?? {}) as { title?: string; post_id?: string };
      const slug = (n.organizations as { slug: string } | null)?.slug ?? "";
      const body = JSON.stringify({
        title: t(`push.${n.type}` as never),
        body: payload.title || t("untitled"),
        url: notificationLink(slug, n.type, payload.post_id),
        tag: `${n.type}-${payload.post_id ?? n.id}`,
      });
      return subs
        .filter((s) => s.user_id === n.user_id)
        .map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 });
          } catch (e) {
            // Abgemeldete Geräte entfernen
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
          }
        });
    }),
  );
}
