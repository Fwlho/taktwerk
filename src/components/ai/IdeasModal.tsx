"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import type { ChannelType } from "@/lib/domain";
import { getAiStatus } from "@/server/ai/actions";
import { IdeasSuggestion } from "./IdeasSuggestion";

/** Ideen vorschlagen als Dialog (Kanban, Wochenplan). KI-Status wird erst beim Öffnen geladen. */
export function IdeasModal({
  slug,
  open,
  onClose,
  channels,
  defaultChannelId,
  plannedOn,
  subtitle,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
  channels: { id: string; type: ChannelType }[];
  defaultChannelId?: string;
  plannedOn?: (index: number) => string | null;
  subtitle?: string;
}) {
  const t = useTranslations("ai.ideas");
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open || configured !== null) return;
    let alive = true;
    void getAiStatus(slug).then((s) => alive && setConfigured(s.configured && s.allowed));
    return () => {
      alive = false;
    };
  }, [open, slug, configured]);

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<Sparkles />} title={t("modalTitle")} subtitle={subtitle ?? t("modalSubtitle")}>
      {configured === null ? (
        <span className="skeleton block h-40" />
      ) : (
        <IdeasSuggestion slug={slug} channels={channels} configured={configured} defaultChannelId={defaultChannelId} plannedOn={plannedOn} />
      )}
    </Modal>
  );
}
