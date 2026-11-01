import "server-only";
import type { ChannelType } from "@/lib/domain";
import type { PublishErrorCode } from "@/lib/publishing";
import { fromBytea, open, seal, toBytea } from "@/server/crypto/secrets";
import { createSupabaseAdminClient } from "@/server/db/supabase";
import { sendPendingPushes } from "@/server/push/send";
import { FakeProvider, publishFake } from "./fake";
import { FacebookPageProvider } from "./meta";
import { PublishError, type MediaFile, type PublishInput, type PublishingProvider } from "./types";

// Veröffentlichen läuft ohne Nutzerkontext (Service-Rolle): Zugangsdaten sind nur für den Server lesbar,
// Statuswechsel auf „Veröffentlicht“ darf nur das System.

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Anbieter je Kanal – hier kommen weitere Plattformen dazu */
export function providerFor(type: ChannelType): PublishingProvider | null {
  if (type === "facebook") return publishFake() ? new FakeProvider() : new FacebookPageProvider();
  return null;
}

export async function saveCredentials(admin: Admin, channelId: string, organizationId: string, data: object) {
  const s = seal(JSON.stringify(data));
  const { error } = await admin.from("channel_credentials").upsert({
    channel_id: channelId,
    organization_id: organizationId,
    ciphertext: toBytea(s.ciphertext),
    iv: toBytea(s.iv),
    auth_tag: toBytea(s.authTag),
  });
  if (error) throw error;
}

async function loadCredentials(admin: Admin, channelId: string): Promise<unknown | null> {
  const { data } = await admin.from("channel_credentials").select("ciphertext, iv, auth_tag").eq("channel_id", channelId).maybeSingle();
  if (!data) return null;
  try {
    return JSON.parse(open({ ciphertext: fromBytea(data.ciphertext), iv: fromBytea(data.iv), authTag: fromBytea(data.auth_tag) }));
  } catch {
    return null;
  }
}

async function loadInput(admin: Admin, postId: string): Promise<{ input: PublishInput; type: ChannelType; channelId: string }> {
  const { data: post } = await admin.from("posts").select("body, channel_id, channels(type)").eq("id", postId).single();
  if (!post?.channels) throw new PublishError("notConnected", false);
  const { data: links } = await admin
    .from("post_assets")
    .select("position, assets(kind, storage_path, mime_type, file_name)")
    .eq("post_id", postId)
    .order("position");
  const media = (links ?? []).flatMap((l) => (l.assets ? [l.assets] : []));
  const images: MediaFile[] = [];
  for (const a of media.filter((m) => m.kind === "image" || m.kind === "logo")) {
    const { data, error } = await admin.storage.from("assets").download(a.storage_path);
    if (error || !data) throw new PublishError("busy", true);
    images.push({ data: Buffer.from(await data.arrayBuffer()), mimeType: a.mime_type, fileName: a.file_name });
  }
  return {
    input: { text: post.body, images, hasVideo: media.some((m) => m.kind === "video") },
    type: post.channels.type as ChannelType,
    channelId: post.channel_id,
  };
}

async function publishClaimed(admin: Admin, postId: string, organizationId: string): Promise<{ ok: true } | { error: PublishErrorCode }> {
  const res = await publishOne(admin, postId);
  // Benachrichtigungen (Erfolg / endgültiger Fehler) auch aufs Handy
  await sendPendingPushes(organizationId).catch(() => undefined);
  return res;
}

async function publishOne(admin: Admin, postId: string): Promise<{ ok: true } | { error: PublishErrorCode }> {
  let channelId: string | null = null;
  try {
    const { input, type, channelId: cid } = await loadInput(admin, postId);
    channelId = cid;
    const provider = providerFor(type);
    const credentials = provider ? await loadCredentials(admin, cid) : null;
    if (!provider || !credentials) throw new PublishError("notConnected", false);
    const result = await provider.publish(credentials, input);
    const { error } = await admin.rpc("mark_post_published", { p_post: postId, p_external_id: result.externalId, p_url: result.url ?? "" });
    if (error) console.error("[publish] Markieren fehlgeschlagen", postId, error.message);
    return { ok: true };
  } catch (e) {
    const err = e instanceof PublishError ? e : new PublishError("unknown", true);
    if (!(e instanceof PublishError)) console.error("[publish]", postId, e instanceof Error ? e.message : e);
    await admin.rpc("mark_post_failed", { p_post: postId, p_error: err.message, p_retry: err.retry });
    if (err.expired && channelId) await admin.from("channels").update({ connection_status: "expired" }).eq("id", channelId);
    return { error: err.code };
  }
}

/** Fällige geplante Beiträge veröffentlichen (vom Hintergrund-Takt aufgerufen). */
export async function runDuePublishing(): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data: claimed, error } = await admin.rpc("claim_due_posts", { p_limit: 10 });
  if (error) {
    console.error("[publish] Reservieren fehlgeschlagen", error.message);
    return 0;
  }
  let published = 0;
  for (const c of claimed ?? []) if ("ok" in (await publishClaimed(admin, c.post_id, c.organization_id))) published++;
  return published;
}

/** „Jetzt veröffentlichen“ für einen geplanten Beitrag (Rechte prüft die aufrufende Action). */
export async function publishPostNow(postId: string): Promise<{ ok: true; url: string | null } | { error: PublishErrorCode }> {
  const admin = createSupabaseAdminClient();
  const { data: claimed } = await admin.rpc("claim_due_posts", { p_limit: 1, p_post: postId });
  // Nicht reservierbar: Kanal nicht verbunden, gerade in Arbeit oder zu viele Versuche
  if (!claimed?.length) return { error: "notConnected" };
  const res = await publishClaimed(admin, postId, claimed[0]!.organization_id);
  if ("error" in res) return res;
  const { data } = await admin.from("posts").select("external_url").eq("id", postId).single();
  return { ok: true, url: data?.external_url ?? null };
}
