import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/organization/ProfileForm";
import { RenameOrganizationForm } from "@/components/organization/RenameOrganizationForm";
import { can } from "@/lib/permissions";
import { columnsToVoice } from "@/lib/validation";
import { getOrgContext } from "@/server/auth/session";
import { getOrganizationProfile } from "@/server/organizations/queries";

export default async function CompanySettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, role } = await getOrgContext(slug);
  if (role === "external") notFound();
  const t = await getTranslations("settings.company");
  const profile = await getOrganizationProfile(organization.id);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 tablet:p-6">
        <h2 className="text-h2">{t("nameTitle")}</h2>
        <RenameOrganizationForm slug={slug} name={organization.name} readOnly={!can(role, "organization.update")} />
      </section>
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 tablet:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2">{t("profileTitle")}</h2>
          <p className="text-body text-text-muted">{t("profileIntro")}</p>
        </div>
        <ProfileForm
          slug={slug}
          mode="settings"
          readOnly={!can(role, "profile.update")}
          defaults={{
            industry: (profile?.industry ?? "") as never,
            location: profile?.location ?? "",
            radiusKm: profile?.radius_km != null ? String(profile.radius_km) : "",
            website: profile?.website ?? "",
            targetAudiences: (profile?.target_audiences ?? []) as never,
            voice: columnsToVoice(profile?.address_form ?? "du", profile?.tone ?? null),
            services: (profile?.services ?? []).join(", "),
          }}
        />
      </section>
    </div>
  );
}
