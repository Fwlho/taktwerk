import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/server/db/supabase";

export const getOrganizationProfile = cache(async (organizationId: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
});

export async function listMembers(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", organizationId)
    .order("created_at");
  if (error) throw error;
  const ids = (memberships ?? []).map((m) => m.user_id);
  const { data: profiles, error: pErr } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [], error: null };
  if (pErr) throw pErr;
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return (memberships ?? []).map((m) => ({ userId: m.user_id, role: m.role, fullName: names.get(m.user_id) ?? "" }));
}

export async function listOpenInvitations(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, expires_at, created_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
