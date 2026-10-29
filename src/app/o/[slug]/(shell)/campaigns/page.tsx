import { getTranslations } from "next-intl/server";
import { CampaignsView } from "@/components/campaigns/CampaignsView";
import { can } from "@/lib/permissions";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listCampaigns } from "@/server/campaigns/queries";
import { listChannels } from "@/server/channels/queries";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("campaigns") };
}

export default async function CampaignsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, role } = await requireNavAccess(slug, "campaigns");
  const [campaigns, channels] = await Promise.all([listCampaigns(organization.id), listChannels(organization.id)]);
  return (
    <CampaignsView
      slug={slug}
      campaigns={campaigns}
      channels={channels.map((c) => ({ id: c.id, type: c.type, name: c.name }))}
      canCreate={can(role, "campaigns.create")}
    />
  );
}
