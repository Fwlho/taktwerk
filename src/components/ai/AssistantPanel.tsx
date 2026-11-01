"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightLeft, Hash, MessageCircleQuestion, Minimize2, Maximize2, Smile, Sparkles, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import type { TextMode } from "@/lib/ai";
import type { ChannelType } from "@/lib/domain";
import type { AiStatus } from "@/server/ai/actions";
import { AiChip, AiSuggestion, type AiTone } from "./AiSuggestion";
import { useAiText } from "./useAiText";

const HASHTAG_CHANNELS: ChannelType[] = ["instagram", "tiktok", "linkedin"];
const UNDO_MS = 8000;

export type AdaptSource = { id: string; type: ChannelType };

/**
 * Assistent-Panel im Beitragseditor: Schnellbefehle, Text schreiben, Kanal-Anpassung.
 * onApply gibt den bisherigen Text zurück, damit „Rückgängig“ ihn wiederherstellen kann.
 */
export function AssistantPanel({
  slug,
  postId,
  channel,
  body,
  readOnly,
  status,
  sources,
  onApply,
  onUndo,
}: {
  slug: string;
  postId: string;
  channel: ChannelType;
  body: string;
  readOnly: boolean;
  status: AiStatus;
  sources: AdaptSource[];
  onApply: (text: string) => string;
  onUndo: (previous: string) => void;
}) {
  const t = useTranslations("ai.assistant");
  const tc = useTranslations("channels.types");
  const te = useTranslations("ai.errors");
  const [used, setUsed] = useState(status.used);
  const [instruction, setInstruction] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [label, setLabel] = useState<{ title: string; source: string }>({ title: "", source: "" });
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinished = useCallback(() => setUsed((u) => u + 1), []);
  const ai = useAiText(slug, onFinished);

  useEffect(() => () => void (undoTimer.current && clearTimeout(undoTimer.current)), []);

  const remaining = Math.max(0, status.limit - used);
  const enabled = status.configured && status.allowed && !readOnly && remaining > 0;
  const hasText = body.trim().length > 0;

  function start(mode: TextMode, opts: { draft?: string; sourcePostId?: string; sourceType?: ChannelType } = {}) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setApplied(null);
    const draft = opts.draft ?? body;
    setLabel({
      title: mode === "adapt" ? t("adaptTitle", { channel: tc(channel) }) : t("suggestionFor", { channel: tc(channel) }),
      source:
        mode === "adapt" && opts.sourceType
          ? t("fromChannel", { channel: tc(opts.sourceType) })
          : opts.draft !== undefined
            ? t("fromSuggestion")
            : draft.trim()
              ? t("fromDraft")
              : t("fromTopic"),
    });
    void ai.run({ postId, mode, draft, instruction: mode === "write" || mode === "improve" ? instruction : undefined, sourcePostId: opts.sourcePostId });
  }

  function regenerate(tone?: AiTone) {
    if (!tone) return void ai.retry();
    start(tone, { draft: ai.text });
  }

  function apply() {
    const previous = onApply(ai.text);
    setApplied(previous);
    ai.reset();
    undoTimer.current = setTimeout(() => setApplied(null), UNDO_MS);
  }

  if (!status.configured) return <Banner kind="info">{t("notConfigured")}</Banner>;
  if (!status.allowed || readOnly) return <p className="text-body text-text-muted">{t("readOnly")}</p>;

  const quick: { mode: TextMode; icon: React.ReactNode }[] = [
    { mode: "improve", icon: <WandSparkles /> },
    { mode: "shorter", icon: <Minimize2 /> },
    { mode: "longer", icon: <Maximize2 /> },
    { mode: "casual", icon: <Smile /> },
    { mode: "question", icon: <MessageCircleQuestion /> },
    ...(HASHTAG_CHANNELS.includes(channel) ? [{ mode: "hashtags" as const, icon: <Hash /> }] : []),
  ];
  const busy = ai.state === "loading";

  return (
    <div className="flex flex-col gap-4">
      {hasText && (
        <div className="flex flex-col gap-2">
          <span className="text-label">{t("quick")}</span>
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <AiChip key={q.mode} icon={q.icon} onClick={() => start(q.mode)} disabled={!enabled || busy}>
                {t(`modes.${q.mode}`)}
              </AiChip>
            ))}
          </div>
        </div>
      )}

      {sources.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-label">{t("adapt")}</span>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <AiChip key={s.id} icon={<ArrowRightLeft />} onClick={() => start("adapt", { sourcePostId: s.id, sourceType: s.type })} disabled={!enabled || busy}>
                {t("adaptFrom", { channel: tc(s.type) })}
              </AiChip>
            ))}
          </div>
        </div>
      )}

      {applied !== null ? (
        <AiSuggestion
          title=""
          state="applied"
          onUndo={() => {
            if (undoTimer.current) clearTimeout(undoTimer.current);
            onUndo(applied);
            setApplied(null);
          }}
        />
      ) : ai.state === "idle" ? (
        <AiSuggestion title={t("title")} state={enabled ? "empty" : "disabled"}>
          <p className="text-small text-text-muted">{hasText ? t("emptyWithText") : t("empty")}</p>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(hasText ? "improve" : "write");
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="sr-only">{t("instruction")}</span>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                maxLength={2000}
                rows={2}
                disabled={!enabled}
                placeholder={t("instructionPlaceholder")}
                className="field-sizing-content min-h-16 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body hover:border-text focus-visible:border-focus"
              />
            </label>
            <Button type="submit" size="sm" variant="ai" icon={<Sparkles className="icon-sm" />} disabled={!enabled} className="self-start">
              {hasText ? t("rewrite") : t("write")}
            </Button>
          </form>
        </AiSuggestion>
      ) : (
        <AiSuggestion
          kind={ai.lastRequest.current?.mode === "adapt" ? "adapt" : "text"}
          title={label.title}
          source={label.source}
          state={ai.state === "loading" ? "loading" : ai.state === "error" ? "error" : "ready"}
          content={ai.text}
          errorText={ai.error ? te(ai.error) : undefined}
          onStop={ai.stop}
          onApply={apply}
          onRegenerate={enabled ? regenerate : undefined}
          onRetry={ai.error === "aiLimit" || ai.error === "aiNotConfigured" ? undefined : ai.retry}
          onDiscard={ai.reset}
        />
      )}

      <p className="text-caption font-normal text-text-muted">
        {remaining > 0 ? t("remaining", { count: remaining, limit: status.limit }) : t("limitReached")}
      </p>
    </div>
  );
}
