"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarHeart, MessageSquareMore, Megaphone, Sparkles, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AiSuggestion } from "@/components/ai/AiSuggestion";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import { FIRST_GOALS, type FirstGoal } from "@/lib/ai";
import { startWithGoal } from "@/server/ai/actions";

const ICONS: Record<FirstGoal, React.ReactNode> = {
  inquiries: <MessageSquareMore aria-hidden />,
  recruiting: <UserPlus aria-hidden />,
  awareness: <Megaphone aria-hidden />,
  event: <CalendarHeart aria-hidden />,
};

/** Onboarding Schritt 3: erstes Ziel → der Assistent legt eine Kampagne mit 4 Beitragsideen an. */
export function OnboardingGoal({ slug, configured }: { slug: string; configured: boolean }) {
  const t = useTranslations("onboarding.goal");
  const tg = useTranslations("campaigns.goals");
  const tai = useTranslations("ai.errors");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [goal, setGoal] = useState<FirstGoal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    if (!goal) return;
    setError(null);
    startTransition(async () => {
      const res = await startWithGoal(slug, goal);
      if (res.error || !res.data) {
        const key = res.error ?? "generic";
        return setError(key.startsWith("ai") ? tai(key as never) : te(key));
      }
      toast({ kind: res.data.source === "ai" ? "ai" : "success", title: t("done", { count: res.data.posts }) });
      router.push(`/o/${slug}`);
    });
  }

  if (pending) {
    return (
      <AiSuggestion title="" state="loading" className="max-w-[720px]">
        <p className="text-small text-text-muted">{configured ? t("planning") : t("planningTemplate")}</p>
      </AiSuggestion>
    );
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      {error && <Banner kind="error">{error}</Banner>}
      <fieldset className="grid gap-3 tablet:grid-cols-2">
        <legend className="sr-only">{t("legend")}</legend>
        {FIRST_GOALS.map((g) => (
          <label
            key={g}
            className={cx(
              "flex cursor-pointer items-start gap-3 rounded-lg p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
              goal === g ? "border-2 border-primary bg-primary-soft" : "border border-border bg-surface hover:border-border-strong",
            )}
          >
            <input type="radio" name="goal" className="sr-only" checked={goal === g} onChange={() => setGoal(g)} />
            <span className={cx("mt-0.5 flex", goal === g ? "text-primary" : "text-text-muted")}>{ICONS[g]}</span>
            <span className="flex flex-col gap-0.5">
              <span className="text-label">{tg(g)}</span>
              <span className="text-small text-text-muted">{t(`hints.${g}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="flex items-center gap-2 text-small text-text-muted">
        <Sparkles aria-hidden className="icon-sm text-ai" />
        {configured ? t("aiHint") : t("templateHint")}
      </p>
      <div className="flex flex-col-reverse gap-3 tablet:flex-row">
        <Button variant="ghost" size="lg" onClick={() => router.push(`/o/${slug}`)}>
          {t("skip")}
        </Button>
        <span className="hidden flex-1 tablet:block" />
        <Button variant="ai" size="lg" icon={<Sparkles aria-hidden />} disabled={!goal} onClick={start}>
          {t("start")}
        </Button>
      </div>
    </div>
  );
}
