"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useServerForm } from "@/components/forms/use-server-form";
import { organizationSchema } from "@/lib/validation";
import { createOrganization } from "@/server/organizations/actions";

export function NewOrganizationForm() {
  const t = useTranslations("organizations.new");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const { form, onSubmit, pending, result } = useServerForm(organizationSchema, { name: "" }, createOrganization);
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {result?.error && <Banner kind="error">{te(result.error)}</Banner>}
      <TextField
        label={t("name")}
        placeholder={t("namePlaceholder")}
        autoComplete="organization"
        error={errors.name?.message && tv(errors.name.message)}
        {...form.register("name")}
      />
      <Button type="submit" variant="primary" block loading={pending} icon={<ArrowRight aria-hidden />} className="flex-row-reverse">
        {t("submit")}
      </Button>
    </form>
  );
}
