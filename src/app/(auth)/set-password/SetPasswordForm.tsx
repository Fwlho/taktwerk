"use client";

import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useServerForm } from "@/components/forms/use-server-form";
import { newPasswordSchema } from "@/lib/validation";
import { updatePassword } from "../actions";

export function SetPasswordForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");

  const { form, onSubmit, pending, result } = useServerForm(newPasswordSchema, { password: "", confirm: "" }, (v) =>
    updatePassword(v, next),
  );
  const { errors } = form.formState;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("setPassword.title")}</h1>
        <p className="text-body text-text-muted">{t("setPassword.intro")}</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {result?.error && <Banner kind="error">{t(`errors.${result.error}`)}</Banner>}
        <TextField
          label={t("newPassword")}
          type="password"
          autoComplete="new-password"
          hint={t("passwordHint")}
          error={errors.password?.message && tv(errors.password.message)}
          {...form.register("password")}
        />
        <TextField
          label={t("confirmPassword")}
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message && tv(errors.confirm.message)}
          {...form.register("confirm")}
        />
        <Button type="submit" variant="primary" block loading={pending}>
          {t("setPassword.submit")}
        </Button>
      </form>
    </>
  );
}
