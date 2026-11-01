import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { cancelFacebookConnect, finishFacebookConnect } from "@/server/publishing/connect";

/** Rückkehr von der Meta-Anmeldung (diese Adresse ist in der Meta-App als Weiterleitung eingetragen) */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = req.nextUrl.searchParams;
  const code = params.get("code");

  if (!code) {
    const slug = await cancelFacebookConnect(user.id);
    redirect(slug ? `/o/${slug}/channels?error=cancelled` : "/start");
  }

  const { slug, error } = await finishFacebookConnect(user.id, code, params.get("state") ?? "");
  // Ohne gültigen Ablauf ist kein Unternehmen bekannt → Startseite
  if (!slug) redirect("/start");
  redirect(error ? `/o/${slug}/channels?error=${error}` : `/o/${slug}/channels/facebook`);
}
