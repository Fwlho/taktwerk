"use client";

import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useServerForm } from "@/components/forms/use-server-form";
import { signUpSchema } from "@/lib/validation";
import { signUp } from "../actions";

export function SignupForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const { form, onSubmit, pending, result } = useServerForm(
    signUpSchema,
    { fullName: "", email: "", password: "" },
    (v) => signUp(v, next),
  );
  const { errors } = form.formState;

  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <MailCheck aria-hidden />
        </span>
        <h2 className="text-h2">{t("signup.checkEmailTitle")}</h2>
        <p className="text-body text-text-muted">{t("signup.checkEmailText", { email: form.getValues("email") })}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {result?.error && <Banner kind="error">{t(`errors.${result.error}`)}</Banner>}
      <TextField
        label={t("fullName")}
        autoComplete="name"
        error={errors.fullName?.message && tv(errors.fullName.message)}
        {...form.register("fullName")}
      />
      <TextField
        label={t("email")}
        type="email"
        autoComplete="email"
        error={errors.email?.message && tv(errors.email.message)}
        {...form.register("email")}
      />
      <TextField
        label={t("password")}
        type="password"
        autoComplete="new-password"
        hint={t("passwordHint")}
        error={errors.password?.message && tv(errors.password.message)}
        {...form.register("password")}
      />
      <p className="text-small text-text-muted">{t("signup.privacy")}</p>
      <Button type="submit" variant="primary" block loading={pending}>
        {t("signup.submit")}
      </Button>
    </form>
  );
}
