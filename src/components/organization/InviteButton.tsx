"use client";

import { useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useServerForm } from "@/components/forms/use-server-form";
import { ROLES } from "@/lib/permissions";
import { inviteSchema } from "@/lib/validation";
import { inviteMember, type InviteResult } from "@/server/organizations/actions";

export function InviteButton({ slug }: { slug: string }) {
  const t = useTranslations("settings.invite");
  const tr = useTranslations("nav.roles");
  const td = useTranslations("settings.team.roleDescriptions");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending, result, setResult } = useServerForm<typeof inviteSchema, InviteResult>(
    inviteSchema,
    { email: "", role: "editor" },
    (v) => inviteMember(slug, v),
  );
  const { errors } = form.formState;
  const role = form.watch("role");
  const done = result?.ok ? result.data : undefined;

  function close() {
    setOpen(false);
    setResult(null);
    form.reset();
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast({ kind: "success", title: t("copied") });
    } catch {
      toast({ kind: "error", title: t("copyFailed") });
    }
  }

  return (
    <>
      <Button variant="primary" icon={<UserPlus aria-hidden />} onClick={() => setOpen(true)}>
        {t("open")}
      </Button>
      <Modal
        open={open}
        onClose={close}
        busy={pending}
        icon={<UserPlus />}
        title={done ? t("doneTitle") : t("title")}
        subtitle={done ? undefined : t("subtitle")}
        footer={
          done ? (
            <Button variant="primary" onClick={close}>
              {t("finish")}
            </Button>
          ) : (
            <>
              <Button onClick={close} disabled={pending}>
                {t("cancel")}
              </Button>
              <Button variant="primary" type="submit" form="invite-form" loading={pending}>
                {t("submit")}
              </Button>
            </>
          )
        }
      >
        {done ? (
          <>
            <p className="text-body">{done.emailSent ? t("emailSent") : t("emailNotSent")}</p>
            <div className="flex flex-col gap-2">
              <span className="text-label">{t("linkLabel")}</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={done.link}
                  aria-label={t("linkLabel")}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-(--size-control) min-w-0 flex-1 rounded-md border border-border bg-surface-sunken px-3 text-mono"
                />
                <Button iconOnly aria-label={t("copy")} icon={<Copy />} onClick={() => copy(done.link)} />
              </div>
              <p className="text-small text-text-muted">{t("linkHint")}</p>
            </div>
          </>
        ) : (
          <form id="invite-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {result?.error && <Banner kind="error">{te(result.error)}</Banner>}
            <TextField
              label={t("email")}
              type="email"
              autoComplete="off"
              autoFocus
              error={errors.email?.message && tv(errors.email.message)}
              {...form.register("email")}
            />
            <Select
              label={t("role")}
              options={ROLES.map((r) => ({ value: r, label: tr(r) }))}
              hint={td(role)}
              {...form.register("role")}
            />
          </form>
        )}
      </Modal>
    </>
  );
}
