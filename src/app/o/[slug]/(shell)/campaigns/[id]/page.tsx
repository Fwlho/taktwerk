import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CampaignDetailHeader } from "@/components/campaigns/CampaignDetailHeader";
import { CampaignPostsTable } from "@/components/campaigns/CampaignPostsTable";
import { can } from "@/lib/permissions";
import { centsToEuroInput } from "@/lib/format";
import { requireNavAccess } from "@/server/auth/nav-access";
import { getCampaign } from "@/server/campaigns/queries";
import { listChannels } from "@/server/channels/queries";
import { listPostsForCampaign } from "@/server/posts/queries";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { organization } = await requireNavAccess(slug, "campaigns");
  const campaign = await getCampaign(organization.id, id);
  return { title: campaign?.name };
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { organization, role } = await requireNavAccess(slug, "campaigns");
  const t = await getTranslations("campaigns");
  const [campaign, channels, posts] = await Promise.all([
    getCampaign(organization.id, id),
    listChannels(organization.id),
    listPostsForCampaign(organization.id, id),
  ]);
  if (!campaign) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/o/${slug}/campaigns`} className="inline-flex items-center gap-1 self-start text-label text-primary hover:underline">
        <ChevronLeft aria-hidden className="icon-sm" />
        {t("title")}
      </Link>
      <CampaignDetailHeader
        slug={slug}
        campaign={campaign}
        channels={channels.map((c) => ({ id: c.id, type: c.type, name: c.name }))}
        canEdit={can(role, "campaigns.update")}
        canDelete={can(role, "campaigns.delete")}
        defaults={{
          name: campaign.name,
          goal: campaign.goal,
          goalDescription: campaign.goal_description ?? "",
          goalTarget: campaign.goal_target != null ? String(campaign.goal_target) : "",
          startDate: campaign.start_date,
          endDate: campaign.end_date ?? "",
          budget: centsToEuroInput(campaign.budget_planned_cents),
          status: campaign.status,
          channelIds: campaign.channelIds,
        }}
      />
      <CampaignPostsTable slug={slug} posts={posts} />
    </div>
  );
}
