"use client";

import { useState, useTransition } from "react";
import { LogOut, Trash2, UserMinus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { MemberRole } from "@/server/db/database.types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ROLES } from "@/lib/permissions";
import { changeMemberRole, removeMember, revokeInvitation } from "@/server/organizations/actions";

type Member = { userId: string; role: MemberRole; fullName: string };

export function MemberRow({
  slug,
  member,
  isSelf,
  canManage,
  isLastOwner,
}: {
  slug: string;
  member: Member;
  isSelf: boolean;
  canManage: boolean;
  isLastOwner: boolean;
}) {
  const t = useTranslations("settings.team");
  const tr = useTranslations("nav.roles");
  const te = useTranslations("errors");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const name = member.fullName || t("unnamed");

  function onRoleChange(role: string) {
    startTransition(async () => {
      const res = await changeMemberRole(slug, member.userId, role);
      if (res.error) toast({ kind: "error", title: te(res.error) });
      else toast({ kind: "success", title: t("roleChanged", { name, role: tr(role) }) });
    });
  }

  function onRemove() {
    startTransition(async () => {
      const res = await removeMember(slug, member.userId);
      setConfirm(false);
      if (res?.error) toast({ kind: "error", title: te(res.error) });
      else toast({ kind: "success", title: t("removed", { name }) });
    });
  }

  const canChangeRole = canManage && !isLastOwner;
  const canRemove = (canManage || isSelf) && !isLastOwner;

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={name} size="lg" external={member.role === "external"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label">
          {name}
          {isSelf && <span className="font-normal text-text-muted"> ({t("you")})</span>}
        </span>
        <span className="text-small text-text-muted">{t(`roleDescriptions.${member.role}`)}</span>
      </div>
      {canChangeRole ? (
        <label className="flex items-center gap-2">
          <span className="sr-only">{t("roleFor", { name })}</span>
          <select
            value={member.role}
            disabled={pending}
            onChange={(e) => onRoleChange(e.target.value)}
            className="h-(--size-control-sm) cursor-pointer rounded-md border border-border-strong bg-surface px-2 text-small font-semibold hover:border-text disabled:text-text-disabled"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tr(r)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="text-small font-semibold">{tr(member.role)}</span>
      )}
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={isSelf ? t("leave") : t("removeFor", { name })}
          icon={isSelf ? <LogOut className="icon-sm" /> : <UserMinus className="icon-sm" />}
          onClick={() => setConfirm(true)}
          className="text-text-muted"
        />
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        variant="danger"
        size="sm"
        busy={pending}
        icon={isSelf ? <LogOut /> : <UserMinus />}
        title={isSelf ? t("leaveTitle") : t("removeTitle", { name })}
        footer={
          <>
            <Button onClick={() => setConfirm(false)} disabled={pending} data-autofocus>
              {t("keep")}
            </Button>
            <Button variant="danger" loading={pending} onClick={onRemove}>
              {isSelf ? t("leaveConfirm") : t("removeConfirm")}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-muted">{isSelf ? t("leaveText") : t("removeText", { name })}</p>
      </Modal>
    </div>
  );
}

type Invitation = { id: string; email: string; role: MemberRole; expires_at: string };

export function InvitationRow({ slug, invitation }: { slug: string; invitation: Invitation }) {
  const t = useTranslations("settings.team");
  const tr = useTranslations("nav.roles");
  const te = useTranslations("errors");
  const format = useFormatter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const expired = new Date(invitation.expires_at) < new Date();

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label">{invitation.email}</span>
        <span className="text-small text-text-muted">
          {tr(invitation.role)} ·{" "}
          {expired
            ? t("expired")
            : t("expires", { date: format.dateTime(new Date(invitation.expires_at), { day: "numeric", month: "short" }) })}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        icon={<Trash2 className="icon-sm" />}
        onClick={() =>
          startTransition(async () => {
            const res = await revokeInvitation(slug, invitation.id);
            if (res.error) toast({ kind: "error", title: te(res.error) });
            else toast({ kind: "success", title: t("revoked") });
          })
        }
      >
        {t("revoke")}
      </Button>
    </div>
  );
}
