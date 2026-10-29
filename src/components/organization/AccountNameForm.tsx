"use client";

import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useServerForm } from "@/components/forms/use-server-form";
import { profileNameSchema } from "@/lib/validation";
import { updateProfileName } from "@/server/account/actions";

export function AccountNameForm({ fullName }: { fullName: string }) {
  const t = useTranslations("account");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const toast = useToast();
  const { form, onSubmit, pending, result } = useServerForm(profileNameSchema, { fullName }, async (v) => {
    const res = await updateProfileName(v);
    if (res.ok) toast({ kind: "success", title: t("saved") });
    return res;
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-[760px] flex-col gap-4 tablet:flex-row tablet:items-end">
      {result?.error && <Banner kind="error">{te(result.error)}</Banner>}
      <TextField
        label={t("fullName")}
        autoComplete="name"
        className="flex-1"
        error={errors.fullName?.message && tv(errors.fullName.message)}
        {...form.register("fullName")}
      />
      <Button type="submit" loading={pending}>
        {t("save")}
      </Button>
    </form>
  );
}
