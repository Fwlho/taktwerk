import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChannelCard } from "@/components/channels/ChannelCard";
import { CHANNEL_TYPES } from "@/lib/domain";
import { can } from "@/lib/permissions";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listChannels } from "@/server/channels/queries";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("channels") };
}

export default async function ChannelsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, role } = await requireNavAccess(slug, "channels");
  const t = await getTranslations("channels");
  const channels = await listChannels(organization.id);
  const manage = can(role, "channels.manage");

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <ul className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        {CHANNEL_TYPES.map((type) => {
          const channel = channels.find((c) => c.type === type) ?? null;
          return (
            <li key={type}>
              <ChannelCard slug={slug} type={type} channel={channel} canManage={manage} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
