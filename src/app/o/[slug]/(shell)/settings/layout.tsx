import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsTabs } from "@/components/organization/SettingsTabs";
import { getOrgContext } from "@/server/auth/session";

export async function generateMetadata() {
  const tn = await getTranslations("settings");
  return { title: tn("title") };
}

export default async function SettingsLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { role } = await getOrgContext(slug);
  const t = await getTranslations("settings");
  const tabs = role === "external" ? (["account"] as const) : (["company", "team", "account"] as const);
  return (
    <>
      <PageHeader title={t("title")} />
      <SettingsTabs slug={slug} tabs={[...tabs]} />
      <div className="mt-6">{children}</div>
    </>
  );
}
