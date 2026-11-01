import "server-only";
import { createHmac } from "node:crypto";
import { PublishError, type PostMetrics, type PublishInput, type PublishResult, type PublishingProvider } from "./types";

// Facebook-Seiten über die Meta Graph API (ohne Zwischenanbieter).
// Zugang: META_APP_ID + META_APP_SECRET aus der eigenen Meta-App; Version über META_GRAPH_VERSION.

const SCOPES = ["pages_show_list", "pages_manage_posts", "pages_read_engagement"];
const MAX_IMAGES = 10;

export type FacebookCredentials = { pageId: string; pageName: string; accessToken: string };
export type FacebookPage = { id: string; name: string; accessToken: string };

export function metaConfig() {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  return { appId, appSecret, version: process.env.META_GRAPH_VERSION?.trim() || "v24.0" };
}

export function metaConfigured(): boolean {
  const c = metaConfig();
  return Boolean(c.appId && c.appSecret);
}

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number; is_transient?: boolean } };

/** Meta-Fehlercodes → verständlicher Fehler mit Wiederholungs-Regel */
export function toPublishError(status: number, body: GraphError): PublishError {
  const e = body.error ?? {};
  const code = e.code ?? 0;
  if (code === 190 || code === 102 || e.error_subcode === 463 || e.error_subcode === 460) return new PublishError("expired", false);
  if (e.is_transient || [1, 2, 4, 17, 32, 341, 368, 613].includes(code) || status >= 500) return new PublishError("busy", true);
  return new PublishError("rejected", false, e.message?.slice(0, 300));
}

async function graph<T>(path: string, token: string | null, init: { method?: "GET" | "POST"; params?: Record<string, string>; form?: FormData } = {}): Promise<T> {
  const { appSecret, version } = metaConfig();
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  for (const [k, v] of Object.entries(init.params ?? {})) url.searchParams.set(k, v);
  if (token) {
    url.searchParams.set("access_token", token);
    // Schützt gestohlene Tokens: Aufrufe nur zusammen mit dem App-Geheimnis gültig
    if (appSecret) url.searchParams.set("appsecret_proof", createHmac("sha256", appSecret).update(token).digest("hex"));
  }
  let res: Response;
  try {
    res = await fetch(url, { method: init.method ?? "GET", body: init.form, cache: "no-store", signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new PublishError("busy", true);
  }
  const body = (await res.json().catch(() => ({}))) as T & GraphError;
  if (!res.ok || body.error) throw toPublishError(res.status, body);
  return body;
}

// ---------------------------------------------------------------------------
// Anmeldung (OAuth)
// ---------------------------------------------------------------------------
export function facebookAuthorizeUrl(state: string, redirectUri: string): string {
  const { appId, version } = metaConfig();
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.searchParams.set("client_id", appId ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(","));
  return url.toString();
}

/** Code → langlebiger Nutzer-Token (ca. 60 Tage); daraus abgeleitete Seiten-Tokens laufen nicht ab. */
export async function exchangeFacebookCode(code: string, redirectUri: string): Promise<string> {
  const { appId, appSecret } = metaConfig();
  const short = await graph<{ access_token: string }>("oauth/access_token", null, {
    params: { client_id: appId ?? "", client_secret: appSecret ?? "", redirect_uri: redirectUri, code },
  });
  const long = await graph<{ access_token: string }>("oauth/access_token", null, {
    params: { grant_type: "fb_exchange_token", client_id: appId ?? "", client_secret: appSecret ?? "", fb_exchange_token: short.access_token },
  });
  return long.access_token;
}

/** Seiten, auf denen die Person Beiträge erstellen darf */
export async function listFacebookPages(userToken: string): Promise<FacebookPage[]> {
  const res = await graph<{ data: { id: string; name: string; access_token?: string; tasks?: string[] }[] }>("me/accounts", userToken, {
    params: { fields: "id,name,access_token,tasks", limit: "100" },
  });
  return (res.data ?? [])
    .filter((p) => p.access_token && (!p.tasks || p.tasks.includes("CREATE_CONTENT") || p.tasks.includes("MANAGE")))
    .map((p) => ({ id: p.id, name: p.name, accessToken: p.access_token! }));
}

// ---------------------------------------------------------------------------
// Veröffentlichen
// ---------------------------------------------------------------------------
const postUrl = (id: string) => `https://www.facebook.com/${id}`;

function photoForm(c: FacebookCredentials, image: PublishInput["images"][number], extra: Record<string, string>): FormData {
  const form = new FormData();
  form.set("source", new Blob([new Uint8Array(image.data)], { type: image.mimeType }), image.fileName);
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return form;
}

export class FacebookPageProvider implements PublishingProvider<FacebookCredentials> {
  readonly id = "meta";

  async publish(c: FacebookCredentials, input: PublishInput): Promise<PublishResult> {
    if (input.hasVideo) throw new PublishError("videoUnsupported", false);
    if (input.images.length > MAX_IMAGES) throw new PublishError("tooManyImages", false);
    if (!input.text.trim() && input.images.length === 0) throw new PublishError("emptyPost", false);

    if (input.images.length === 0) {
      const form = new FormData();
      form.set("message", input.text);
      const res = await graph<{ id: string }>(`${c.pageId}/feed`, c.accessToken, { method: "POST", form });
      return { externalId: res.id, url: postUrl(res.id) };
    }

    if (input.images.length === 1) {
      const res = await graph<{ id: string; post_id?: string }>(`${c.pageId}/photos`, c.accessToken, {
        method: "POST",
        form: photoForm(c, input.images[0]!, { message: input.text, published: "true" }),
      });
      const id = res.post_id ?? res.id;
      return { externalId: id, url: postUrl(id) };
    }

    // Mehrere Bilder: erst unveröffentlicht hochladen, dann gemeinsam als ein Beitrag
    const ids: string[] = [];
    for (const image of input.images) {
      const res = await graph<{ id: string }>(`${c.pageId}/photos`, c.accessToken, { method: "POST", form: photoForm(c, image, { published: "false" }) });
      ids.push(res.id);
    }
    const form = new FormData();
    form.set("message", input.text);
    ids.forEach((id, i) => form.set(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
    const res = await graph<{ id: string }>(`${c.pageId}/feed`, c.accessToken, { method: "POST", form });
    return { externalId: res.id, url: postUrl(res.id) };
  }

  async fetchMetrics(c: FacebookCredentials, externalId: string): Promise<PostMetrics> {
    const res = await graph<{
      shares?: { count?: number };
      comments?: { summary?: { total_count?: number } };
      reactions?: { summary?: { total_count?: number } };
    }>(externalId, c.accessToken, { params: { fields: "shares,comments.limit(0).summary(true),reactions.limit(0).summary(true)" } });
    return {
      reactions: res.reactions?.summary?.total_count ?? null,
      comments: res.comments?.summary?.total_count ?? null,
      shares: res.shares?.count ?? 0,
    };
  }
}
