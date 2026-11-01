import "server-only";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import { openFromString, sealToString } from "@/server/crypto/secrets";
import { FAKE_PAGES, publishFake } from "./fake";
import { PublishError } from "./types";
import { exchangeFacebookCode, facebookAuthorizeUrl, listFacebookPages, metaConfigured, type FacebookPage } from "./meta";

// Facebook verbinden: 1) Anmeldung bei Meta (state im Cookie gegen Fälschung), 2) Rückkehr mit Code → Nutzer-Token
// verschlüsselt in kurzlebigem Cookie, 3) Seite auswählen → Seiten-Token verschlüsselt in channel_credentials.

const OAUTH_COOKIE = "tw_fb_oauth";
const TOKEN_COOKIE = "tw_fb_user";
const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production" && publicEnv.NEXT_PUBLIC_SITE_URL.startsWith("https"), sameSite: "lax" as const, path: "/", maxAge });

export const facebookRedirectUri = () => `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/auth/facebook/callback`;

export function facebookAvailable(): boolean {
  return publishFake() || metaConfigured();
}

type Pending = { state: string; slug: string; uid: string };
type UserToken = { token: string; slug: string; uid: string };

/** Schritt 1: Ziel-Adresse der Meta-Anmeldung (im Testbetrieb direkt zur Rückkehr) */
export async function beginFacebookConnect(slug: string, uid: string, state: string): Promise<string> {
  const jar = await cookies();
  jar.set(OAUTH_COOKIE, sealToString(JSON.stringify({ state, slug, uid } satisfies Pending)), cookieOptions(600));
  if (publishFake()) return `/auth/facebook/callback?code=fake&state=${state}`;
  return facebookAuthorizeUrl(state, facebookRedirectUri());
}

async function takePending(uid: string): Promise<Pending | null> {
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  jar.delete(OAUTH_COOKIE);
  const pending = raw ? (JSON.parse(openFromString(raw) ?? "null") as Pending | null) : null;
  return pending?.uid === uid ? pending : null;
}

/** Abbruch bei Meta: Slug für die Rückkehr zur Kanäle-Seite */
export async function cancelFacebookConnect(uid: string): Promise<string | null> {
  return (await takePending(uid))?.slug ?? null;
}

/** Schritt 2: state prüfen, Code eintauschen; liefert den Slug fürs Weiterleiten (und ggf. einen Fehler) */
export async function finishFacebookConnect(uid: string, code: string, state: string): Promise<{ slug: string | null; error: string | null }> {
  const jar = await cookies();
  const pending = await takePending(uid);
  if (!pending || pending.state !== state) return { slug: null, error: "stateMismatch" };
  try {
    const token = publishFake() ? "fake-user-token" : await exchangeFacebookCode(code, facebookRedirectUri());
    jar.set(TOKEN_COOKIE, sealToString(JSON.stringify({ token, slug: pending.slug, uid } satisfies UserToken)), cookieOptions(900));
    return { slug: pending.slug, error: null };
  } catch (e) {
    return { slug: pending.slug, error: e instanceof PublishError && e.code === "busy" ? "busy" : "failed" };
  }
}

/** Schritt 3: Seiten der angemeldeten Person (null = Anmeldung abgelaufen) */
export async function pendingFacebookPages(slug: string, uid: string): Promise<FacebookPage[] | null> {
  const raw = (await cookies()).get(TOKEN_COOKIE)?.value;
  const data = raw ? (JSON.parse(openFromString(raw) ?? "null") as UserToken | null) : null;
  if (!data || data.slug !== slug || data.uid !== uid) return null;
  return publishFake() ? FAKE_PAGES : listFacebookPages(data.token);
}

export async function clearFacebookConnect() {
  (await cookies()).delete(TOKEN_COOKIE);
}
