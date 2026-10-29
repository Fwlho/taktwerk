import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Banner } from "@/components/ui/Banner";
import { Logo } from "@/components/ui/Logo";
import { can } from "@/lib/permissions";
import { columnsToVoice } from "@/lib/validation";
import { getOrgContext } from "@/server/auth/session";
import { getOrganizationProfile } from "@/server/organizations/queries";
import { ProfileForm } from "@/components/organization/ProfileForm";

export async function generateMetadata() {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

// Schritte 2 (Kanäle) und 3 (erstes Ziel) folgen in Phase 2 und 3.
const STEPS = ["company"] as const;

export default async function OnboardingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, role } = await getOrgContext(slug);
  if (!can(role, "profile.update")) notFound();
  const t = await getTranslations("onboarding");
  const profile = await getOrganizationProfile(organization.id);

  return (
    <div className="flex min-h-dvh flex-col bg-bg desktop:flex-row">
      <aside className="flex flex-col gap-8 border-border bg-surface px-4 py-6 tablet:px-10 desktop:w-[400px] desktop:flex-none desktop:border-r desktop:py-12">
        <Logo />
        <div className="hidden flex-col gap-2 desktop:flex">
          <h2 className="text-h2">{t("asideTitle")}</h2>
          <p className="text-body text-text-muted">{t("asideText")}</p>
        </div>
        <ol className="hidden flex-col desktop:flex">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3 py-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary font-bold text-on-primary">{i + 1}</span>
              <span className="text-label">{t(`steps.${step}`)}</span>
            </li>
          ))}
        </ol>
        <Banner kind="info" icon={<ShieldCheck aria-hidden />} className="mt-auto hidden desktop:flex">
          {t("trust")}
        </Banner>
      </aside>
      <main className="flex flex-1 flex-col gap-8 px-4 py-8 tablet:px-12 desktop:px-24 desktop:py-14">
        <div className="flex flex-col gap-3">
          <h1 className="text-h1 desktop:text-display">{t("heading")}</h1>
          <p className="max-w-[620px] text-body-lg text-text-muted">{t("subheading")}</p>
        </div>
        <ProfileForm
          slug={slug}
          mode="onboarding"
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
      </main>
    </div>
  );
}
