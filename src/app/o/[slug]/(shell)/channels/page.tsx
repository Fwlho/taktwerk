import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChannelCard } from "@/components/channels/ChannelCard";
import { Banner } from "@/components/ui/Banner";
import { CHANNEL_TYPES } from "@/lib/domain";
import { can } from "@/lib/permissions";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listChannels } from "@/server/channels/queries";
import { facebookAvailable } from "@/server/publishing/connect";

const CONNECT_ERRORS = ["cancelled", "failed", "busy", "stateMismatch", "metaNotConfigured", "forbidden"] as const;

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("channels") };
}

export default async function ChannelsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const { error } = await searchParams;
  const { organization, role } = await requireNavAccess(slug, "channels");
  const t = await getTranslations("channels");
  const channels = await listChannels(organization.id);
  const manage = can(role, "channels.manage");
  const connectError = CONNECT_ERRORS.find((e) => e === error);

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      {connectError && (
        <Banner kind={connectError === "cancelled" ? "info" : "error"} className="mb-6">
          {t(`connectErrors.${connectError}`)}
        </Banner>
      )}
      <ul className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        {CHANNEL_TYPES.map((type) => {
          const channel = channels.find((c) => c.type === type) ?? null;
          return (
            <li key={type}>
              <ChannelCard slug={slug} type={type} channel={channel} canManage={manage} connectAvailable={type === "facebook" && facebookAvailable()} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
