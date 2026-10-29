"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { ChannelChip } from "@/components/domain/ChannelChip";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextArea, TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { CAMPAIGN_GOALS, CAMPAIGN_STATUSES, type ChannelType } from "@/lib/domain";
import { campaignSchema, type CampaignFormValues, type CampaignInput } from "@/lib/validation";
import { createCampaign, updateCampaign } from "@/server/campaigns/actions";

export type ChannelOption = { id: string; type: ChannelType; name: string };

type Props = {
  slug: string;
  open: boolean;
  onClose: () => void;
  channels: ChannelOption[];
  /** Bearbeiten: Kampagnen-ID + Startwerte */
  campaignId?: string;
  defaults?: CampaignFormValues;
};

const EMPTY: CampaignFormValues = {
  name: "",
  goal: "inquiries",
  goalDescription: "",
  goalTarget: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  budget: "",
  status: "draft",
  channelIds: [],
};

export function CampaignFormModal({ slug, open, onClose, channels, campaignId, defaults }: Props) {
  const t = useTranslations("campaigns.form");
  const tg = useTranslations("campaigns.goals");
  const ts = useTranslations("campaigns.status");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CampaignFormValues, unknown, CampaignInput>({
    resolver: zodResolver(campaignSchema),
    mode: "onTouched",
    defaultValues: defaults ?? EMPTY,
  });
  const { errors } = form.formState;
  const err = (m?: string) => (m ? tv(m) : undefined);

  function close() {
    if (pending) return;
    setError(null);
    form.reset(defaults ?? EMPTY);
    onClose();
  }

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      setError(null);
      const values = form.getValues();
      if (campaignId) {
        const res = await updateCampaign(slug, campaignId, values);
        if (res.error) return setError(res.error);
        toast({ kind: "success", title: t("saved") });
        onClose();
        router.refresh();
      } else {
        const res = await createCampaign(slug, values);
        if (res.error || !res.data) return setError(res.error ?? "generic");
        toast({ kind: "success", title: t("created") });
        onClose();
        form.reset(EMPTY);
        router.push(`/o/${slug}/campaigns/${res.data.id}`);
      }
    }),
  );

  return (
    <Modal
      open={open}
      onClose={close}
      busy={pending}
      size="lg"
      icon={<Flag />}
      title={campaignId ? t("editTitle") : t("createTitle")}
      subtitle={campaignId ? undefined : t("subtitle")}
      footer={
        <>
          <Button onClick={close} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button variant="primary" type="submit" form="campaign-form" loading={pending}>
            {campaignId ? t("save") : t("create")}
          </Button>
        </>
      }
    >
      <form id="campaign-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {error && <Banner kind="error">{te(error)}</Banner>}
        <TextField label={t("name")} placeholder={t("namePlaceholder")} data-autofocus error={err(errors.name?.message)} {...form.register("name")} />
        <div className="grid gap-4 tablet:grid-cols-[2fr_1fr]">
          <Select
            label={t("goal")}
            options={CAMPAIGN_GOALS.map((g) => ({ value: g, label: tg(g) }))}
            {...form.register("goal")}
          />
          <TextField
            label={t("goalTarget")}
            optional
            inputMode="numeric"
            placeholder="30"
            error={err(errors.goalTarget?.message)}
            {...form.register("goalTarget")}
          />
        </div>
        <TextArea
          label={t("goalDescription")}
          optional
          placeholder={t("goalDescriptionPlaceholder")}
          error={err(errors.goalDescription?.message)}
          {...form.register("goalDescription")}
        />
        <div className="grid gap-4 tablet:grid-cols-2">
          <TextField label={t("startDate")} type="date" error={err(errors.startDate?.message)} {...form.register("startDate")} />
          <TextField label={t("endDate")} optional type="date" error={err(errors.endDate?.message)} {...form.register("endDate")} />
        </div>
        <div className="grid gap-4 tablet:grid-cols-2">
          <TextField
            label={t("budget")}
            optional
            inputMode="decimal"
            placeholder="2.000"
            hint={t("budgetHint")}
            error={err(errors.budget?.message)}
            {...form.register("budget")}
          />
          <Select
            label={t("status")}
            options={CAMPAIGN_STATUSES.map((s) => ({ value: s, label: ts(s) }))}
            {...form.register("status")}
          />
        </div>
        <Controller
          control={form.control}
          name="channelIds"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-label">{t("channels")}</legend>
              {channels.length === 0 ? (
                <p className="text-small text-text-muted">{t("noChannels")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {channels.map((c) => {
                    const selected = field.value.includes(c.id);
                    return (
                      <label key={c.id} className="cursor-pointer rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected}
                          onChange={(e) =>
                            field.onChange(e.target.checked ? [...field.value, c.id] : field.value.filter((v) => v !== c.id))
                          }
                        />
                        <ChannelChip type={c.type} label={c.name} state={selected ? "selected" : "default"} />
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          )}
        />
      </form>
    </Modal>
  );
}
