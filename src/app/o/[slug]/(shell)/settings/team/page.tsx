import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InviteButton } from "@/components/organization/InviteButton";
import { InvitationRow, MemberRow } from "@/components/organization/TeamRows";
import { EmptyState } from "@/components/ui/EmptyState";
import { can } from "@/lib/permissions";
import { getOrgContext } from "@/server/auth/session";
import { listMembers, listOpenInvitations } from "@/server/organizations/queries";

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, role, user } = await getOrgContext(slug);
  if (role === "external") notFound();
  const t = await getTranslations("settings.team");
  const manage = can(role, "members.manage");
  const [members, invitations] = await Promise.all([
    listMembers(organization.id),
    manage ? listOpenInvitations(organization.id) : Promise.resolve([]),
  ]);
  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="members-h" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 tablet:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="members-h" className="text-h2">
              {t("membersTitle", { count: members.length })}
            </h2>
            <p className="text-body text-text-muted">{t("rolesIntro")}</p>
          </div>
          {can(role, "invitations.manage") && <InviteButton slug={slug} />}
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {members.map((m) => (
            <li key={m.userId}>
              <MemberRow
                slug={slug}
                member={m}
                isSelf={m.userId === user.id}
                canManage={manage}
                isLastOwner={m.role === "owner" && ownerCount === 1}
              />
            </li>
          ))}
        </ul>
      </section>

      {manage && (
        <section aria-labelledby="inv-h" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 tablet:p-6">
          <h2 id="inv-h" className="text-h2">
            {t("invitationsTitle")}
          </h2>
          {invitations.length === 0 ? (
            <EmptyState kind="done" inline title={t("noInvitations")} />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {invitations.map((inv) => (
                <li key={inv.id}>
                  <InvitationRow slug={slug} invitation={inv} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
