"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useServerForm } from "@/components/forms/use-server-form";
import { forgotPasswordSchema } from "@/lib/validation";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const { form, onSubmit, pending, result } = useServerForm(forgotPasswordSchema, { email: "" }, requestPasswordReset);
  const { errors } = form.formState;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("forgot.title")}</h1>
        <p className="text-body text-text-muted">{t("forgot.intro")}</p>
      </div>
      {result?.ok ? (
        <div role="status" className="flex items-start gap-3">
          <MailCheck aria-hidden className="text-success" />
          <p className="text-body">{t("forgot.sent")}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {result?.error && <Banner kind="error">{t(`errors.${result.error}`)}</Banner>}
          <TextField
            label={t("email")}
            type="email"
            autoComplete="email"
            error={errors.email?.message && tv(errors.email.message)}
            {...form.register("email")}
          />
          <Button type="submit" variant="primary" block loading={pending}>
            {t("forgot.submit")}
          </Button>
        </form>
      )}
      <Link href="/login" className="text-center text-body font-semibold text-primary hover:underline">
        {t("backToLogin")}
      </Link>
    </>
  );
}
