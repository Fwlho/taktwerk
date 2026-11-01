"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { ChannelType } from "@/lib/domain";
import type { AiErrorKey } from "@/lib/ai";
import { suggestPostIdeas } from "@/server/ai/actions";
import type { Idea } from "@/server/ai/service";
import { createIdeaPosts } from "@/server/posts/actions";
import { AiChip, AiSuggestion } from "./AiSuggestion";

type ChannelOption = { id: string; type: ChannelType };
const COUNT = 5;

/**
 * KI-Ideen (AiSuggestion „ideas“): vorschlagen, einzeln per Chip oder alle als Beiträge im Status „Idee“ anlegen.
 * plannedOn verteilt Ideen z. B. auf die Tage einer Woche.
 */
export function IdeasSuggestion({
  slug,
  channels,
  configured,
  title,
  defaultChannelId,
  plannedOn,
  onCreated,
  className,
}: {
  slug: string;
  channels: ChannelOption[];
  configured: boolean;
  title?: string;
  defaultChannelId?: string;
  plannedOn?: (index: number) => string | null;
  onCreated?: () => void;
  className?: string;
}) {
  const t = useTranslations("ai.ideas");
  const tc = useTranslations("channels.types");
  const te = useTranslations("ai.errors");
  const toast = useToast();
  const router = useRouter();
  const [channelId, setChannelId] = useState(defaultChannelId ?? channels[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [created, setCreated] = useState<Set<number>>(new Set());
  const [error, setError] = useState<AiErrorKey | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const heading = title ?? t("title");

  function generate() {
    setError(null);
    startLoading(async () => {
      const res = await suggestPostIdeas(slug, { channelId: channelId || null, topic: topic || undefined, count: COUNT });
      if (res.error || !res.data) return setError((res.error as AiErrorKey) ?? "aiFailed");
      setIdeas(res.data.ideas);
      setCreated(new Set());
    });
  }

  function create(indexes: number[]) {
    if (!ideas || !channelId) return;
    const todo = indexes.filter((i) => !created.has(i));
    if (!todo.length) return;
    startSaving(async () => {
      const res = await createIdeaPosts(slug, {
        channelId,
        ideas: todo.map((i, n) => ({ ...ideas[i]!, plannedOn: plannedOn?.(created.size + n) ?? null })),
      });
      if (res.error) return toast({ kind: "error", title: te("aiFailed") });
      setCreated((s) => new Set([...s, ...todo]));
      toast({ kind: "ai", title: t("created", { count: todo.length }) });
      onCreated?.();
      router.refresh();
    });
  }

  if (channels.length === 0) {
    return (
      <AiSuggestion kind="ideas" title={heading} state="disabled" className={className}>
        <p className="text-small text-text-muted">{t("noChannel")}</p>
      </AiSuggestion>
    );
  }
  if (!configured) {
    return (
      <AiSuggestion kind="ideas" title={heading} state="disabled" className={className}>
        <p className="text-small text-text-muted">{te("aiNotConfigured")}</p>
      </AiSuggestion>
    );
  }

  const channelSelect =
    channels.length > 1 ? (
      <Select
        label={t("channel")}
        value={channelId}
        onChange={(e) => {
          setChannelId(e.target.value);
          setIdeas(null);
        }}
        options={channels.map((c) => ({ value: c.id, label: tc(c.type) }))}
      />
    ) : null;

  if (loading) return <AiSuggestion kind="ideas" title={heading} state="loading" className={className} />;
  if (error) {
    return (
      <AiSuggestion
        kind="ideas"
        title={heading}
        state="error"
        errorText={te(error)}
        onRetry={error === "aiLimit" ? undefined : generate}
        onDiscard={() => setError(null)}
        className={className}
      />
    );
  }

  if (!ideas) {
    return (
      <AiSuggestion kind="ideas" title={heading} state="empty" className={className}>
        <p className="text-small text-text-muted">{t("empty")}</p>
        {channelSelect}
        <TextField label={t("topic")} optional placeholder={t("topicPlaceholder")} value={topic} maxLength={500} onChange={(e) => setTopic(e.target.value)} />
        <Button size="sm" variant="ai" icon={<Sparkles className="icon-sm" />} onClick={generate} className="self-start">
          {t("suggest")}
        </Button>
      </AiSuggestion>
    );
  }

  const all = ideas.map((_, i) => i);
  const allDone = created.size === ideas.length;
  return (
    <AiSuggestion
      kind="ideas"
      title={heading}
      source={tc(channels.find((c) => c.id === channelId)?.type ?? "instagram")}
      state="ready"
      onApply={allDone ? undefined : () => create(all)}
      applyLabel={t("createAll")}
      onRegenerate={generate}
      onDiscard={() => setIdeas(null)}
      className={className}
    >
      <ul className="flex flex-col gap-2">
        {ideas.map((idea, i) => {
          const done = created.has(i);
          return (
            <li key={i} className="flex flex-col items-start gap-1">
              <AiChip icon={done ? <Check /> : <Plus />} selected={done} disabled={done || saving} onClick={() => create([i])}>
                <span className="truncate">{idea.title}</span>
              </AiChip>
              {idea.body && <span className="pl-3 text-small text-text-muted">{idea.body}</span>}
            </li>
          );
        })}
      </ul>
      <p className="text-caption font-normal text-text-muted">{t("hint")}</p>
    </AiSuggestion>
  );
}
