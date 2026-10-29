import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/validation";
import { createSupabaseServerClient } from "@/server/db/supabase";

// Ziel der Links aus Bestätigungs-, Passwort- und Einladungs-Mails.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createSupabaseServerClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  // Eingeladene Personen ohne Passwort zuerst Passwort setzen lassen
  const target = ok && type === "invite" ? `/set-password?next=${encodeURIComponent(next)}` : next;
  return NextResponse.redirect(new URL(ok ? target : "/login?error=link", origin));
}
