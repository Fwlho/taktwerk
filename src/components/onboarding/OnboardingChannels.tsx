"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelMono } from "@/components/domain/ChannelChip";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { CHANNEL_TYPES, type ChannelType } from "@/lib/domain";
import { addChannel } from "@/server/channels/actions";

/** Onboarding Schritt 2: Kanäle wählen. Verbinden mit den Plattformen folgt später (Phase 5). */
export function OnboardingChannels({ slug, existing }: { slug: string; existing: ChannelType[] }) {
  const t = useTranslations("onboarding.channels");
  const tc = useTranslations("channels.types");
  const te = useTranslations("errors");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<ChannelType>>(new Set(existing.length ? existing : ["instagram", "facebook"]));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const next = `/o/${slug}/onboarding?step=goal`;

  function toggle(type: ChannelType) {
    if (existing.includes(type)) return;
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(type)) n.delete(type);
      else n.add(type);
      return n;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      for (const type of CHANNEL_TYPES.filter((c) => selected.has(c) && !existing.includes(c))) {
        const res = await addChannel(slug, { type, name: tc(type) });
        if (res.error && res.error !== "duplicate") return setError(res.error);
      }
      router.push(next);
    });
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      {error && <Banner kind="error">{te(error)}</Banner>}
      <ul className="grid gap-3 tablet:grid-cols-2">
        {CHANNEL_TYPES.map((type) => {
          const on = selected.has(type);
          const fixed = existing.includes(type);
          return (
            <li key={type}>
              <label
                className={cx(
                  "flex cursor-pointer items-center gap-3 rounded-lg p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                  on ? "border-2 border-primary bg-primary-soft" : "border border-border bg-surface hover:border-border-strong",
                  fixed && "cursor-default",
                )}
              >
                <input type="checkbox" className="sr-only" checked={on} disabled={fixed} onChange={() => toggle(type)} />
                <ChannelMono type={type} size="lg" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label">{tc(type)}</span>
                  <span className="text-small text-text-muted">{fixed ? t("added") : type === "offline" ? t("offlineHint") : t("notConnected")}</span>
                </span>
                {on && <Check aria-hidden className="text-primary" />}
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-small text-text-muted">{t("hint")}</p>
      <div className="flex flex-col-reverse gap-3 tablet:flex-row">
        <Button variant="ghost" size="lg" disabled={pending} onClick={() => router.push(next)}>
          {t("skip")}
        </Button>
        <span className="hidden flex-1 tablet:block" />
        <Button variant="primary" size="lg" loading={pending} onClick={save}>
          {t("next")}
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
