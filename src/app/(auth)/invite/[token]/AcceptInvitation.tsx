"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/app/(auth)/actions";
import { acceptInvitationByToken } from "@/server/organizations/actions";

export function AcceptInvitation({ token }: { token: string }) {
  const t = useTranslations("invite");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {error && <Banner kind="error">{t(`errors.${error}`)}</Banner>}
      <Button
        variant="primary"
        block
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await acceptInvitationByToken(token);
            if (res?.error) setError(res.error);
          })
        }
      >
        {t("accept")}
      </Button>
      {error === "emailMismatch" && (
        <form action={signOut}>
          <Button type="submit" variant="ghost" block>
            {t("switchAccount")}
          </Button>
        </form>
      )}
    </div>
  );
}
