import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <EmptyState
        kind="no-results"
        title={t("title")}
        text={t("text")}
        actions={
          <Link href="/start" className={buttonClasses({ variant: "primary" })}>
            {t("home")}
          </Link>
        }
      />
    </main>
  );
}
