"use client";

import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelMono } from "@/components/domain/ChannelChip";
import { initials } from "@/components/ui/Avatar";
import type { ChannelType } from "@/lib/domain";

// Wie viel die Plattform vor „… mehr“ zeigt (vereinfachte Vorschau, kein Nachbau der Oberfläche)
const FOLD: Partial<Record<ChannelType, number>> = { instagram: 125, facebook: 480, linkedin: 210, tiktok: 100, youtube: 160 };

function renderText(text: string) {
  // Hashtags und Erwähnungen hervorheben
  return text.split(/(\s+)/).map((part, i) =>
    /^[#@][\p{L}\p{N}_]+/u.test(part) ? (
      <span key={i} className="font-semibold text-primary">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Neutrale, vereinfachte Post-Darstellung je Kanal. */
export function PostPreview({ channel, text, organizationName }: { channel: ChannelType; text: string; organizationName: string }) {
  const t = useTranslations("posts.preview");
  const fold = FOLD[channel];
  const truncated = fold && text.length > fold;
  const shown = truncated ? text.slice(0, fold).trimEnd() : text;

  if (channel === "offline") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-2 text-label">
          <ChannelMono type="offline" />
          {t("offline")}
        </div>
        <div className="aspect-[1/1.414] rounded-md border border-dashed border-border-strong bg-surface-sunken p-4">
          <p className="text-small whitespace-pre-wrap">{text || t("empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 p-3">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-soft text-caption font-bold text-primary">
          {initials(organizationName)}
        </span>
        <span className="text-label">{organizationName}</span>
        <ChannelMono type={channel} size="sm" className="ml-auto" />
      </div>
      <div className="flex aspect-square items-center justify-center bg-surface-sunken text-text-muted" aria-hidden>
        <ImageIcon className="size-10" />
      </div>
      <p className="p-3 text-small whitespace-pre-wrap break-words">
        {text ? renderText(shown) : <span className="text-text-muted">{t("empty")}</span>}
        {truncated && <span className="text-text-muted"> … {t("more")}</span>}
      </p>
    </div>
  );
}
