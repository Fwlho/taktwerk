"use server";

import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import {
  forgotPasswordSchema,
  newPasswordSchema,
  safeNextPath,
  signInSchema,
  signUpSchema,
  type ForgotPasswordInput,
  type NewPasswordInput,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validation";
import { createSupabaseServerClient } from "@/server/db/supabase";

export type AuthResult = {
  error?: "invalidCredentials" | "emailNotConfirmed" | "emailTaken" | "rateLimited" | "samePassword" | "invalid" | "generic";
  ok?: true;
};

function siteUrl() {
  return publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

export async function signIn(input: SignInInput, next?: string): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "emailNotConfirmed" };
    if (error.status === 429) return { error: "rateLimited" };
    return { error: error.code === "invalid_credentials" ? "invalidCredentials" : "generic" };
  }
  redirect(safeNextPath(next));
}

export async function signUp(input: SignUpInput, next?: string): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(safeNextPath(next))}`,
    },
  });
  if (error) {
    if (error.status === 429) return { error: "rateLimited" };
    if (error.code === "user_already_exists") return { error: "emailTaken" };
    return { error: "generic" };
  }
  // Ohne E-Mail-Bestätigung (lokal abschaltbar) direkt weiter
  if (data.session) redirect(safeNextPath(next));
  return { ok: true };
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/set-password`,
  });
  if (error?.status === 429) return { error: "rateLimited" };
  // Immer "ok" – verrät nicht, ob die Adresse existiert.
  return { ok: true };
}

export async function updatePassword(input: NewPasswordInput, next?: string): Promise<AuthResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.code === "same_password" ? "samePassword" : "generic" };
  redirect(safeNextPath(next));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
