"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { newPostSchema, type NewPostFormValues } from "@/lib/validation";
import { createPost } from "@/server/posts/actions";
import type { ChannelOption } from "@/components/campaigns/CampaignFormModal";

export type CampaignOption = { id: string; name: string };

/** Schnell anlegen: Kanal, Titel, optional Kampagne und Tag – danach Editor. */
export function NewPostModal({
  slug,
  open,
  onClose,
  channels,
  campaigns,
  defaults,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
  channels: ChannelOption[];
  campaigns: CampaignOption[];
  defaults?: Partial<NewPostFormValues>;
}) {
  const t = useTranslations("posts.new");
  const tc = useTranslations("channels.types");
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initial: NewPostFormValues = {
    channelId: channels[0]?.id ?? "",
    title: "",
    campaignId: "",
    plannedOn: "",
    status: "draft",
    ...defaults,
  };
  const form = useForm<NewPostFormValues>({ resolver: zodResolver(newPostSchema) as never, mode: "onTouched", values: open ? initial : undefined });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      setError(null);
      const res = await createPost(slug, form.getValues());
      if (res.error || !res.data) return setError(res.error ?? "generic");
      onClose();
      router.push(`/o/${slug}/posts/${res.data.id}`);
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={pending}
      icon={<PenLine />}
      title={t("title")}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button variant="primary" type="submit" form="new-post-form" loading={pending} disabled={channels.length === 0}>
            {t("submit")}
          </Button>
        </>
      }
    >
      {channels.length === 0 ? (
        <Banner kind="info">{t("noChannels")}</Banner>
      ) : (
        <form id="new-post-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && <Banner kind="error">{te(error)}</Banner>}
          <TextField
            label={t("postTitle")}
            placeholder={t("titlePlaceholder")}
            data-autofocus
            error={errors.title?.message && tv(errors.title.message)}
            {...form.register("title")}
          />
          <Select label={t("channel")} options={channels.map((c) => ({ value: c.id, label: tc(c.type) }))} {...form.register("channelId")} />
          <div className="grid gap-4 tablet:grid-cols-2">
            <Select
              label={t("campaign")}
              optional
              placeholder={t("noCampaign")}
              options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
              {...form.register("campaignId")}
            />
            <TextField label={t("day")} optional type="date" {...form.register("plannedOn")} />
          </div>
          <Select
            label={t("stage")}
            options={[
              { value: "idea", label: t("stageIdea") },
              { value: "draft", label: t("stageDraft") },
            ]}
            {...form.register("status")}
          />
        </form>
      )}
    </Modal>
  );
}
