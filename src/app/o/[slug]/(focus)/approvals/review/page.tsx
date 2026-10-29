import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApprovalReview } from "@/components/approvals/ApprovalReview";
import { getOrgContext } from "@/server/auth/session";
import { listMembers } from "@/server/organizations/queries";
import { listPendingApprovals } from "@/server/posts/approvals";

export async function generateMetadata() {
  const t = await getTranslations("approvals");
  return { title: t("reviewTitle") };
}

// Freigabe-Ansicht ohne untere Navigation – die Aktionsleiste liegt im Daumenbereich.
export default async function ApprovalReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const { slug } = await params;
  const { start } = await searchParams;
  const { organization, role } = await getOrgContext(slug);
  if (role !== "owner") notFound();
  const [pending, members] = await Promise.all([listPendingApprovals(organization.id), listMembers(organization.id)]);
  const startIndex = Math.max(0, pending.findIndex((p) => p.id === start));
  return (
    <ApprovalReview
      slug={slug}
      organizationName={organization.name}
      items={pending}
      startIndex={startIndex}
      members={members.map((m) => ({ userId: m.userId, fullName: m.fullName, role: m.role }))}
    />
  );
}
