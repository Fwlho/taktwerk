"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelMono } from "@/components/domain/ChannelChip";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import { FIRST_GOALS, type AiErrorKey, type FirstGoal } from "@/lib/ai";
import { suggestCampaignPlan } from "@/server/ai/actions";
import type { CampaignPlan } from "@/server/ai/service";
import { applyCampaignPlan } from "@/server/campaigns/actions";
import { AiSuggestion } from "./AiSuggestion";

/** „Kampagne vorschlagen“: Ziel wählen → Vorschlag aus Branchenvorlage (+ KI) → als Kampagne mit 4 Ideen anlegen */
export function CampaignSuggestModal({ slug, open, onClose, configured }: { slug: string; open: boolean; onClose: () => void; configured: boolean }) {
  const t = useTranslations("ai.campaign");
  const tg = useTranslations("campaigns.goals");
  const tc = useTranslations("channels.types");
  const te = useTranslations("ai.errors");
  const toast = useToast();
  const router = useRouter();
  const [goal, setGoal] = useState<FirstGoal>("inquiries");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<{ plan: CampaignPlan; startDate: string } | null>(null);
  const [error, setError] = useState<AiErrorKey | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  function close() {
    if (saving) return;
    onClose();
    setResult(null);
    setError(null);
  }

  function generate() {
    setError(null);
    startLoading(async () => {
      const res = await suggestCampaignPlan(slug, { goal, topic: topic || undefined });
      if (res.error || !res.data) return setError((res.error as AiErrorKey) ?? "aiFailed");
      setResult(res.data);
    });
  }

  function apply() {
    if (!result) return;
    startSaving(async () => {
      const res = await applyCampaignPlan(slug, result.plan, result.startDate);
      if (res.error || !res.data) return toast({ kind: "error", title: te("aiFailed") });
      toast({ kind: "ai", title: t("created", { count: res.data.posts }) });
      onClose();
      setResult(null);
      router.push(`/o/${slug}/campaigns/${res.data.id}`);
    });
  }

  const plan = result?.plan;
  return (
    <Modal open={open} onClose={close} busy={saving} size="lg" icon={<Sparkles />} title={t("title")} subtitle={t("subtitle")}>
      {!plan ? (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-label">{t("goal")}</legend>
            <div className="grid gap-2 tablet:grid-cols-2">
              {FIRST_GOALS.map((g) => (
                <label
                  key={g}
                  className={cx(
                    "flex cursor-pointer items-center gap-2 rounded-md px-4 py-3 text-label has-focus-visible:outline-2 has-focus-visible:outline-focus",
                    goal === g ? "border-2 border-primary bg-primary-soft text-primary" : "border border-border-strong hover:bg-surface-hover",
                  )}
                >
                  <input type="radio" name="goal" className="sr-only" checked={goal === g} onChange={() => setGoal(g)} />
                  {tg(g)}
                </label>
              ))}
            </div>
          </fieldset>
          <TextArea label={t("topic")} optional hint={t("topicHint")} value={topic} maxLength={500} onChange={(e) => setTopic(e.target.value)} />
          {loading ? (
            <AiSuggestion kind="ideas" title={t("title")} state="loading" />
          ) : error ? (
            <AiSuggestion kind="ideas" title={t("title")} state="error" errorText={te(error)} onRetry={error === "aiLimit" ? undefined : generate} onDiscard={() => setError(null)} />
          ) : (
            <Button variant="ai" icon={<Sparkles aria-hidden />} onClick={generate} className="self-start">
              {configured ? t("suggest") : t("suggestTemplate")}
            </Button>
          )}
        </div>
      ) : (
        <AiSuggestion
          kind="ideas"
          title={plan.name}
          source={plan.source === "ai" ? t("fromProfile") : t("fromTemplate")}
          state={saving ? "loading" : "ready"}
          onApply={apply}
          applyLabel={t("apply")}
          onRegenerate={configured ? generate : undefined}
          onDiscard={() => setResult(null)}
        >
          {plan.goalDescription && <p className="text-body">{plan.goalDescription}</p>}
          <p className="flex flex-wrap items-center gap-2 text-small text-text-muted">
            {t("duration", { count: plan.durationWeeks })}
            {plan.channels.map((c) => (
              <span key={c} className="inline-flex">
                <ChannelMono type={c} size="sm" />
                <span className="sr-only">{tc(c)}</span>
              </span>
            ))}
          </p>
          <ol className="flex flex-col gap-2">
            {plan.ideas.map((idea, i) => (
              <li key={i} className="flex gap-3 rounded-md border border-border bg-surface p-3">
                <ChannelMono type={idea.channel} size="sm" />
                <span className="sr-only">{tc(idea.channel)}</span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label">{idea.title}</span>
                  <span className="text-caption font-normal text-text-muted">{t("week", { week: idea.week })}</span>
                  {idea.body && <span className="line-clamp-3 text-small text-text-muted whitespace-pre-line">{idea.body}</span>}
                </span>
              </li>
            ))}
          </ol>
        </AiSuggestion>
      )}
    </Modal>
  );
}
