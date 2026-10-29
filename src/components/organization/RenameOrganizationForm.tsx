"use client";

import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useServerForm } from "@/components/forms/use-server-form";
import { organizationSchema } from "@/lib/validation";
import { renameOrganization } from "@/server/organizations/actions";

export function RenameOrganizationForm({ slug, name, readOnly }: { slug: string; name: string; readOnly?: boolean }) {
  const t = useTranslations("settings.company");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const toast = useToast();
  const { form, onSubmit, pending, result } = useServerForm(organizationSchema, { name }, async (v) => {
    const res = await renameOrganization(slug, v);
    if (res.ok) toast({ kind: "success", title: t("renamed") });
    return res;
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-[760px] flex-col gap-4 tablet:flex-row tablet:items-end">
      {result?.error && <Banner kind="error">{te(result.error)}</Banner>}
      <TextField
        label={t("name")}
        disabled={readOnly}
        className="flex-1"
        error={errors.name?.message && tv(errors.name.message)}
        {...form.register("name")}
      />
      {!readOnly && (
        <Button type="submit" loading={pending}>
          {t("save")}
        </Button>
      )}
    </form>
  );
}
