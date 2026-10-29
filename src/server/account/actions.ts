"use server";

import { revalidatePath } from "next/cache";
import { profileNameSchema, type ProfileNameInput } from "@/lib/validation";
import { requireUser } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";

export async function updateProfileName(input: ProfileNameInput): Promise<{ ok?: true; error?: string }> {
  const parsed = profileNameSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", user.id);
  if (error) return { error: "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}
