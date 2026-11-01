import { notFound, redirect } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { OnboardingChannels } from "@/components/onboarding/OnboardingChannels";
import { OnboardingGoal } from "@/components/onboarding/OnboardingGoal";
import { ProfileForm } from "@/components/organization/ProfileForm";
import { Banner } from "@/components/ui/Banner";
import { Logo } from "@/components/ui/Logo";
import { cx } from "@/lib/cx";
import type { ChannelType } from "@/lib/domain";
import { can } from "@/lib/permissions";
import { columnsToVoice } from "@/lib/validation";
import { aiConfigured } from "@/server/ai/client";
import { getOrgContext } from "@/server/auth/session";
import { listChannels } from "@/server/channels/queries";
import { getOrganizationProfile } from "@/server/organizations/queries";

export async function generateMetadata() {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

// Betrieb → Kanäle → erstes Ziel (ScreenOnboarding)
const STEPS = ["company", "channels", "goal"] as const;
type Step = (typeof STEPS)[number];

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { slug } = await params;
  const { step: rawStep } = await searchParams;
  const { organization, role } = await getOrgContext(slug);
  if (!can(role, "profile.update")) notFound();
  const step: Step = (STEPS as readonly string[]).includes(rawStep ?? "") ? (rawStep as Step) : "company";

  // Schritte ohne Recht überspringen
  if (step === "channels" && !can(role, "channels.manage")) redirect(`/o/${slug}/onboarding?step=goal`);
  if (step === "goal" && !can(role, "campaigns.create")) redirect(`/o/${slug}`);

  const t = await getTranslations("onboarding");
  const current = STEPS.indexOf(step);
  const [profile, channels] = await Promise.all([
    step === "company" ? getOrganizationProfile(organization.id) : Promise.resolve(null),
    step === "channels" ? listChannels(organization.id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg desktop:flex-row">
      <aside className="flex flex-col gap-8 border-border bg-surface px-4 py-6 tablet:px-10 desktop:w-[400px] desktop:flex-none desktop:border-r desktop:py-12">
        <Logo />
        <div className="hidden flex-col gap-2 desktop:flex">
          <h2 className="text-h2">{t("asideTitle")}</h2>
          <p className="text-body text-text-muted">{t("asideText")}</p>
        </div>
        {/* Mobil: Fortschritt als Leiste */}
        <div className="flex gap-1 desktop:hidden" role="img" aria-label={t("progress", { step: current + 1, total: STEPS.length })}>
          {STEPS.map((s, i) => (
            <i key={s} className={cx("block h-1 flex-1 rounded-[2px]", i <= current ? "bg-primary" : "bg-border")} />
          ))}
        </div>
        <ol className="hidden flex-col desktop:flex">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === current ? "step" : undefined} className="flex items-center gap-3 py-2.5">
              <span
                className={cx(
                  "flex size-8 items-center justify-center rounded-full font-bold",
                  i < current ? "bg-success text-on-primary" : i === current ? "bg-primary text-on-primary" : "border border-border-strong text-text-muted",
                )}
              >
                {i < current ? <Check aria-hidden className="icon-sm" /> : i + 1}
              </span>
              <span className={cx("text-label", i > current && "text-text-muted")}>{t(`steps.${s}`)}</span>
            </li>
          ))}
        </ol>
        <Banner kind="info" icon={<ShieldCheck aria-hidden />} className="mt-auto hidden desktop:flex">
          {t("trust")}
        </Banner>
      </aside>
      <main className="flex flex-1 flex-col gap-8 px-4 py-8 tablet:px-12 desktop:px-24 desktop:py-14">
        <div className="flex flex-col gap-3">
          <h1 className="text-h1 desktop:text-display">{t(`headings.${step}`)}</h1>
          <p className="max-w-[620px] text-body-lg text-text-muted">{t(`subheadings.${step}`)}</p>
        </div>
        {step === "company" && (
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
        )}
        {step === "channels" && <OnboardingChannels slug={slug} existing={channels.map((c) => c.type as ChannelType)} />}
        {step === "goal" && <OnboardingGoal slug={slug} configured={aiConfigured()} />}
      </main>
    </div>
  );
}
