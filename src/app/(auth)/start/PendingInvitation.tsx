"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { acceptInvitationById } from "@/server/organizations/actions";

export function PendingInvitation({ id, organizationName, roleLabel }: { id: string; organizationName: string; roleLabel: string }) {
  const t = useTranslations("start");
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-status-review p-4">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label">{organizationName}</span>
        <span className="text-small text-text-muted">{t("invitedAs", { role: roleLabel })}</span>
      </span>
      <Button
        variant="primary"
        size="sm"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await acceptInvitationById(id);
            if (res?.error) toast({ kind: "error", title: t("acceptFailed") });
          })
        }
      >
        {t("accept")}
      </Button>
    </div>
  );
}
