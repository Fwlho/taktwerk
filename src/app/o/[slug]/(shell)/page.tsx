import Link from "next/link";
import { CircleCheck, Circle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cx } from "@/lib/cx";
import { can } from "@/lib/permissions";
import { requireNavAccess } from "@/server/auth/nav-access";
import { getOrganizationProfile } from "@/server/organizations/queries";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("dashboard") };
}

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, organization, role } = await requireNavAccess(slug, "dashboard");
  const t = await getTranslations("dashboard");
  const profile = await getOrganizationProfile(organization.id);
  const firstName = user.fullName.split(" ")[0] ?? "";
  const hour = Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", timeZone: "Europe/Berlin" }).format(new Date()));
  const greeting = hour < 11 ? "morning" : hour < 18 ? "day" : "evening";

  const checklist = [
    { key: "profile", done: Boolean(profile?.onboarding_completed_at), href: `/o/${slug}/onboarding`, enabled: can(role, "profile.update") },
    { key: "channels", done: false, href: null, enabled: false },
    { key: "campaign", done: false, href: null, enabled: false },
  ] as const;
  const showChecklist = checklist.some((c) => !c.done);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 desktop:text-display">{t(`greeting.${greeting}`, { name: firstName || organization.name })}</h1>
        <p className="text-body-lg text-text-muted">{t("intro")}</p>
      </header>

      <div className="grid gap-4 desktop:grid-cols-12">
        <section aria-labelledby="week-h" className="rounded-lg border border-border bg-surface p-5 desktop:col-span-8">
          <h2 id="week-h" className="text-h2">
            {t("thisWeek")}
          </h2>
          <EmptyState kind="first-use" title={t("weekEmptyTitle")} text={t("weekEmptyText")} />
        </section>

        {showChecklist && (
          <section aria-labelledby="check-h" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 desktop:col-span-4">
            <h2 id="check-h" className="text-h2">
              {t("checklist.title")}
            </h2>
            <ul className="flex flex-col gap-3">
              {checklist.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  {item.done ? (
                    <CircleCheck aria-hidden className="text-success" />
                  ) : (
                    <Circle aria-hidden className="text-text-muted" />
                  )}
                  <span className={cx("flex-1 text-body", item.done && "text-text-muted line-through")}>
                    {t(`checklist.${item.key}`)}
                    <span className="sr-only"> – {t(item.done ? "checklist.done" : "checklist.open")}</span>
                  </span>
                  {!item.done && item.href && item.enabled && (
                    <Link href={item.href} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                      {t("checklist.start")}
                    </Link>
                  )}
                  {!item.done && !item.href && <span className="text-caption text-text-muted">{t("checklist.soon")}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
