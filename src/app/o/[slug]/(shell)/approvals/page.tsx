import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ApprovalList } from "@/components/approvals/ApprovalList";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listMembers } from "@/server/organizations/queries";
import { listPendingApprovals } from "@/server/posts/approvals";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("approvals") };
}

export default async function ApprovalsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, role } = await requireNavAccess(slug, "approvals");
  const t = await getTranslations("approvals");
  const [pending, members] = await Promise.all([listPendingApprovals(organization.id), listMembers(organization.id)]);
  const isOwner = role === "owner";

  return (
    <>
      <PageHeader
        title={t("title")}
        intro={pending.length ? t("intro", { count: pending.length }) : undefined}
        actions={
          isOwner && pending.length > 0 ? (
            <Link href={`/o/${slug}/approvals/review`} className={buttonClasses({ variant: "primary", size: "lg" })}>
              {t("reviewAll")}
            </Link>
          ) : undefined
        }
      />
      {pending.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState kind="done" title={t("doneTitle")} text={t("doneText")} />
        </div>
      ) : (
        <ApprovalList
          slug={slug}
          items={pending}
          members={members.map((m) => ({ userId: m.userId, fullName: m.fullName, role: m.role }))}
          isOwner={isOwner}
        />
      )}
    </>
  );
}
