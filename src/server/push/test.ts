import "server-only";
import webpush from "web-push";
import { getTranslations } from "next-intl/server";
import { createSupabaseAdminClient } from "@/server/db/supabase";

/** Testnachricht an alle Geräte einer Person */
export async function sendTestNotification(userId: string, slug: string) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return;
  webpush.setVapidDetails(subject, pub, priv);
  const admin = createSupabaseAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  const t = await getTranslations("notifications");
  const body = JSON.stringify({ title: t("testTitle"), body: t("testBody"), url: `/o/${slug}`, tag: "test" });
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 300 });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
}
