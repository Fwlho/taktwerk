import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FacebookPagePicker } from "@/components/channels/FacebookPagePicker";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { can } from "@/lib/permissions";
import { requireNavAccess } from "@/server/auth/nav-access";
import { pendingFacebookPages } from "@/server/publishing/connect";

export async function generateMetadata() {
  const t = await getTranslations("channels.facebook");
  return { title: t("title") };
}

/** Schritt 3 der Verbindung: Facebook-Seite auswählen (nach der Anmeldung bei Meta) */
export default async function FacebookPagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { role, user } = await requireNavAccess(slug, "channels");
  if (!can(role, "channels.manage")) notFound();
  const t = await getTranslations("channels.facebook");
  let pages: Awaited<ReturnType<typeof pendingFacebookPages>> = null;
  let failed = false;
  try {
    pages = await pendingFacebookPages(slug, user.id);
  } catch {
    failed = true;
  }
  const retry = (
    <a href={`/o/${slug}/channels/facebook/connect`} className={buttonClasses({ variant: "primary" })}>
      {t("retry")}
    </a>
  );
  const back = (
    <Link href={`/o/${slug}/channels`} className={buttonClasses({ variant: "ghost" })}>
      {t("back")}
    </Link>
  );

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className="max-w-[640px] rounded-lg border border-border bg-surface">
        {failed ? (
          <EmptyState kind="error" title={t("failedTitle")} text={t("failedText")} actions={<>{retry}{back}</>} />
        ) : pages === null ? (
          <EmptyState kind="first-use" title={t("expiredTitle")} text={t("expiredText")} actions={<>{retry}{back}</>} />
        ) : pages.length === 0 ? (
          <EmptyState kind="first-use" title={t("noPagesTitle")} text={t("noPagesText")} actions={<>{retry}{back}</>} />
        ) : (
          <FacebookPagePicker slug={slug} pages={pages.map((p) => ({ id: p.id, name: p.name }))} />
        )}
      </div>
    </>
  );
}
