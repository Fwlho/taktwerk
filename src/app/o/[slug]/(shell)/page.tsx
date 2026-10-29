import { getTranslations } from "next-intl/server";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { can } from "@/lib/permissions";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listCampaigns } from "@/server/campaigns/queries";
import { listChannels } from "@/server/channels/queries";
import { getDashboardData } from "@/server/dashboard/queries";
import { getOrganizationProfile, listMembers } from "@/server/organizations/queries";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("dashboard") };
}

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, organization, role } = await requireNavAccess(slug, "dashboard");
  const [profile, data, members, channels, campaigns] = await Promise.all([
    getOrganizationProfile(organization.id),
    getDashboardData(organization.id),
    listMembers(organization.id),
    listChannels(organization.id),
    listCampaigns(organization.id),
  ]);
  const base = `/o/${slug}`;

  return (
    <DashboardView
      slug={slug}
      role={role}
      firstName={user.fullName.split(" ")[0] ?? ""}
      organizationName={organization.name}
      data={data}
      members={members.map((m) => ({ userId: m.userId, fullName: m.fullName, role: m.role }))}
      checklist={[
        { key: "profile", done: Boolean(profile?.onboarding_completed_at), href: can(role, "profile.update") ? `${base}/onboarding` : null },
        { key: "channels", done: channels.length > 0, href: can(role, "channels.manage") ? `${base}/channels` : null },
        { key: "campaign", done: campaigns.length > 0, href: can(role, "campaigns.create") ? `${base}/campaigns` : null },
      ]}
    />
  );
}
