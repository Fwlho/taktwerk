"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useServerForm } from "@/components/forms/use-server-form";
import { signInSchema } from "@/lib/validation";
import { signIn } from "../actions";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const { form, onSubmit, pending, result } = useServerForm(signInSchema, { email: "", password: "" }, (v) => signIn(v, next));
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {linkError && <Banner kind="error">{t("errors.link")}</Banner>}
      {result?.error && <Banner kind="error">{t(`errors.${result.error}`)}</Banner>}
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
        autoComplete="current-password"
        error={errors.password?.message && tv(errors.password.message)}
        {...form.register("password")}
      />
      <Link href="/forgot-password" className="self-end text-small font-semibold text-primary hover:underline">
        {t("forgotPassword")}
      </Link>
      <Button type="submit" variant="primary" block loading={pending}>
        {t("login.submit")}
      </Button>
    </form>
  );
}
