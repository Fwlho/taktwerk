import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { getOrgContext } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { beginFacebookConnect, facebookAvailable } from "@/server/publishing/connect";

/** „Facebook verbinden“: Kanal sicherstellen, dann zur Anmeldung bei Meta */
export async function GET(_req: Request, ctx: RouteContext<"/o/[slug]/channels/facebook/connect">) {
  const { slug } = await ctx.params;
  const { organization, role, user } = await getOrgContext(slug);
  if (!can(role, "channels.manage")) redirect(`/o/${slug}/channels?error=forbidden`);
  if (!facebookAvailable()) redirect(`/o/${slug}/channels?error=metaNotConfigured`);

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from("channels").select("id").eq("organization_id", organization.id).eq("type", "facebook").maybeSingle();
  if (!existing) await supabase.from("channels").insert({ organization_id: organization.id, type: "facebook", name: "Facebook" });

  redirect(await beginFacebookConnect(slug, user.id, randomBytes(16).toString("base64url")));
}
