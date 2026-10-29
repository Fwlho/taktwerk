import { redirect } from "next/navigation";
import { getOrgContext } from "@/server/auth/session";

export default async function SettingsIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { role } = await getOrgContext(slug);
  redirect(`/o/${slug}/settings/${role === "external" ? "account" : "company"}`);
}
