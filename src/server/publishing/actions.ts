"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PublishErrorCode } from "@/lib/publishing";
import { requirePermission } from "@/server/auth/session";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/server/db/supabase";
import { guard, type ActionResult } from "@/server/action-result";
import { schedulePost } from "@/server/posts/actions";
import { clearFacebookConnect, pendingFacebookPages } from "./connect";
import { publishFake } from "./fake";
import { publishPostNow, saveCredentials } from "./service";

/** Ausgewählte Facebook-Seite verbinden: Seiten-Token verschlüsselt speichern, Kanal auf „Verbunden“. */
export async function connectFacebookPage(slug: string, pageId: string): Promise<ActionResult<{ name: string }>> {
  return guard(async () => {
    if (!z.string().min(1).max(120).safeParse(pageId).success) return { error: "invalid" };
    const { organization, user } = await requirePermission(slug, "channels.manage");
    const pages = await pendingFacebookPages(slug, user.id).catch(() => null);
    if (!pages) return { error: "connectExpired" };
    const page = pages.find((p) => p.id === pageId);
    if (!page) return { error: "invalid" };

    // Kanal über RLS ermitteln (gehört sicher zu diesem Unternehmen)
    const supabase = await createSupabaseServerClient();
    const { data: channel } = await supabase.from("channels").select("id").eq("organization_id", organization.id).eq("type", "facebook").maybeSingle();
    if (!channel) return { error: "gone" };

    const admin = createSupabaseAdminClient();
    await saveCredentials(admin, channel.id, organization.id, { pageId: page.id, pageName: page.name, accessToken: page.accessToken });
    const { error } = await admin
      .from("channels")
      .update({
        connection_status: "connected",
        provider: publishFake() ? "fake" : "meta",
        external_account_id: page.id,
        external_account_name: page.name.slice(0, 120),
      })
      .eq("id", channel.id);
    if (error) return { error: "generic" };
    await clearFacebookConnect();
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true, data: { name: page.name } };
  });
}

/** Verbindung trennen: Zugangsdaten löschen. Geplante Beiträge bleiben, werden aber nicht mehr veröffentlicht. */
export async function disconnectChannel(slug: string, channelId: string): Promise<ActionResult> {
  return guard(async () => {
    if (!z.uuid().safeParse(channelId).success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "channels.manage");
    const supabase = await createSupabaseServerClient();
    const { data: channel } = await supabase.from("channels").select("id").eq("id", channelId).eq("organization_id", organization.id).maybeSingle();
    if (!channel) return { error: "gone" };
    const admin = createSupabaseAdminClient();
    await admin.from("channel_credentials").delete().eq("channel_id", channel.id);
    const { error } = await admin
      .from("channels")
      .update({ connection_status: "not_connected", provider: null, external_account_id: null, external_account_name: null })
      .eq("id", channel.id);
    if (error) return { error: "generic" };
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true };
  });
}

/** Freigegebenen oder geplanten Beitrag sofort veröffentlichen. */
export async function publishNow(slug: string, postId: string): Promise<ActionResult<{ url: string | null }> & { publishError?: PublishErrorCode }> {
  return guard(async () => {
    if (!z.uuid().safeParse(postId).success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.schedule");
    const supabase = await createSupabaseServerClient();
    const { data: post } = await supabase
      .from("posts")
      .select("status, version, channels(connection_status)")
      .eq("id", postId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!post) return { error: "gone" };
    if (post.channels?.connection_status !== "connected") return { error: "publish", publishError: "notConnected" };
    if (post.status !== "approved" && post.status !== "scheduled") return { error: "forbidden" };
    if (post.status === "approved") {
      // Über den normalen Weg einplanen (prüft Rolle + Übergang), dann sofort ausführen
      const scheduled = await schedulePost(slug, postId, new Date(Date.now() + 60_000).toISOString(), post.version);
      if (scheduled.error) return { error: scheduled.error };
    }
    const res = await publishPostNow(postId);
    revalidatePath(`/o/${slug}`, "layout");
    if ("error" in res) return { error: "publish", publishError: res.error };
    return { ok: true, data: { url: res.url } };
  });
}
