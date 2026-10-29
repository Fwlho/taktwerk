import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/Button";
import { homePath } from "@/components/nav/nav-items";
import { listMyOrganizations, requireUser } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { PendingInvitation } from "./PendingInvitation";

export async function generateMetadata() {
  const t = await getTranslations("start");
  return { title: t("metaTitle") };
}

/** Nach der Anmeldung: Einladungen zeigen, Unternehmen wählen oder anlegen. */
export default async function StartPage({ searchParams }: { searchParams: Promise<{ choose?: string }> }) {
  const { choose } = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("start");
  const tr = await getTranslations("nav.roles");
  const supabase = await createSupabaseServerClient();
  const [organizations, { data: invitations }] = await Promise.all([
    listMyOrganizations(),
    supabase.rpc("my_pending_invitations"),
  ]);
  const pending = invitations ?? [];

  if (!choose && pending.length === 0) {
    if (organizations.length === 0) redirect("/organizations/new");
    if (organizations.length === 1) {
      const [only] = organizations;
      redirect(homePath(only!.slug, only!.role));
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title", { name: user.fullName.split(" ")[0] || "" })}</h1>
        <p className="text-body text-text-muted">{t("intro")}</p>
      </div>

      {pending.length > 0 && (
        <section aria-labelledby="inv-h" className="flex flex-col gap-3">
          <h2 id="inv-h" className="text-h3">
            {t("invitations")}
          </h2>
          <ul className="flex flex-col gap-2">
            {pending.map((inv) => (
              <li key={inv.id}>
                <PendingInvitation id={inv.id} organizationName={inv.organization_name} roleLabel={tr(inv.role)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {organizations.length > 0 && (
        <section aria-labelledby="org-h" className="flex flex-col gap-3">
          <h2 id="org-h" className="text-h3">
            {t("organizations")}
          </h2>
          <ul className="flex flex-col gap-2">
            {organizations.map((o) => (
              <li key={o.id}>
                <Link
                  href={homePath(o.slug, o.role)}
                  className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors duration-(--duration-fast) hover:border-border-strong hover:bg-surface-hover"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label">{o.name}</span>
                    <span className="text-small text-text-muted">{tr(o.role)}</span>
                  </span>
                  <ChevronRight aria-hidden className="text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/organizations/new" className={buttonClasses({ variant: "ghost", block: true })}>
        <Plus aria-hidden />
        {t("createOrganization")}
      </Link>
    </>
  );
}
