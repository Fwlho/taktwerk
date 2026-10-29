import { getTranslations } from "next-intl/server";
import type { NavItem } from "@/components/nav/nav-items";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireNavAccess } from "@/server/auth/nav-access";
import { PageHeader } from "./PageHeader";

/** Platzhalter für Bereiche späterer Phasen – mit Leerzustand statt leerer Fläche. */
export async function ComingSoonPage({ slug, section }: { slug: string; section: NavItem["key"] }) {
  await requireNavAccess(slug, section);
  const t = await getTranslations("nav.items");
  const tc = await getTranslations("comingSoon");
  return (
    <>
      <PageHeader title={t(section)} />
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState kind="first-use" title={tc("title")} text={tc(`texts.${section}`)} />
      </div>
    </>
  );
}
