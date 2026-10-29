"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ChoiceChips, SegmentTabs } from "@/components/ui/Choice";
import { Select } from "@/components/ui/Select";
import { TextArea, TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import {
  AUDIENCES,
  INDUSTRIES,
  RADII,
  VOICES,
  organizationProfileSchema,
  type OrganizationProfileFormValues,
  type OrganizationProfileInput,
} from "@/lib/validation";
import { saveOrganizationProfile, skipOnboarding } from "@/server/organizations/actions";

type Props = {
  slug: string;
  mode: "onboarding" | "settings";
  defaults: OrganizationProfileFormValues;
  readOnly?: boolean;
};

/** Unternehmensprofil (Onboarding Schritt 1 und Einstellungen). */
export function ProfileForm({ slug, mode, defaults, readOnly }: Props) {
  const t = useTranslations("profile");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OrganizationProfileFormValues, unknown, OrganizationProfileInput>({
    resolver: zodResolver(organizationProfileSchema),
    mode: "onTouched",
    defaultValues: defaults,
    disabled: readOnly,
  });
  const { errors } = form.formState;
  const err = (m?: string) => (m ? tv(m) : undefined);

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      setError(null);
      // Rohwerte schicken – der Server prüft selbst noch einmal
      const res = await saveOrganizationProfile(slug, form.getValues(), { completeOnboarding: mode === "onboarding" });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (mode === "onboarding") {
        toast({ kind: "success", title: t("savedOnboarding") });
        router.push(`/o/${slug}`);
      } else {
        toast({ kind: "success", title: t("saved") });
        form.reset(form.getValues());
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-[760px] flex-col gap-8">
      {error && <Banner kind="error">{te(error)}</Banner>}
      <div className="grid gap-6 tablet:grid-cols-2">
        <Select
          label={t("industry")}
          placeholder={t("choose")}
          options={INDUSTRIES.map((v) => ({ value: v, label: t(`industries.${v}`) }))}
          error={err(errors.industry?.message)}
          {...form.register("industry")}
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <TextField
            label={t("location")}
            optional
            leadingIcon={<MapPin className="icon-sm" />}
            placeholder={t("locationPlaceholder")}
            autoComplete="address-level2"
            error={err(errors.location?.message)}
            {...form.register("location")}
          />
          <Select
            label={t("radius")}
            optional
            placeholder="–"
            options={RADII.map((r) => ({ value: String(r), label: t("radiusValue", { km: r }) }))}
            {...form.register("radiusKm")}
          />
        </div>
        <TextField
          label={t("website")}
          optional
          type="url"
          inputMode="url"
          placeholder={t("websitePlaceholder")}
          error={err(errors.website?.message)}
          className="tablet:col-span-2"
          {...form.register("website")}
        />
        <div className="tablet:col-span-2">
          <Controller
            control={form.control}
            name="targetAudiences"
            render={({ field }) => (
              <ChoiceChips
                label={t("audiences")}
                options={AUDIENCES.map((v) => ({ value: v, label: t(`audienceOptions.${v}`) }))}
                value={field.value as string[]}
                onChange={(v) => field.onChange(v)}
              />
            )}
          />
        </div>
        <div className="tablet:col-span-2">
          <Controller
            control={form.control}
            name="voice"
            render={({ field }) => (
              <SegmentTabs
                name="voice"
                label={t("voice")}
                options={VOICES.map((v) => ({ value: v, label: t(`voices.${v}`) }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <TextArea
          label={t("services")}
          optional
          hint={t("servicesHint")}
          placeholder={t("servicesPlaceholder")}
          error={err(errors.services?.message)}
          className="tablet:col-span-2"
          {...form.register("services")}
        />
      </div>

      {!readOnly && (
        <div className="flex flex-col-reverse gap-3 tablet:flex-row">
          {mode === "onboarding" && (
            <Button
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={() => startTransition(() => skipOnboarding(slug))}
            >
              {t("later")}
            </Button>
          )}
          <span className="hidden flex-1 tablet:block" />
          <Button type="submit" variant="primary" size="lg" loading={pending}>
            {mode === "onboarding" ? (
              <>
                {t("finish")}
                <ArrowRight aria-hidden />
              </>
            ) : (
              t("save")
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
