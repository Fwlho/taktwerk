"use client";

import type { ReactNode } from "react";
import { Check, CircleAlert, CircleCheck, Maximize2, Minimize2, RefreshCw, Smile, Sparkles, Square, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";

export type AiSuggestionState = "empty" | "loading" | "ready" | "error" | "applied" | "disabled";
export type AiTone = "shorter" | "longer" | "casual";

/**
 * KI-Vorschlag (Design: AiSuggestion). Immer apricot, damit KI-Inhalte erkennbar bleiben.
 * Ersetzt nie selbst Text – erst „Übernehmen“ ruft onApply.
 */
export function AiSuggestion({
  kind = "text",
  title,
  source,
  state,
  content,
  errorText,
  children,
  onApply,
  applyLabel,
  onRegenerate,
  onRetry,
  onDiscard,
  onStop,
  onUndo,
  className,
}: {
  kind?: "text" | "ideas" | "adapt";
  title: string;
  source?: string;
  state: AiSuggestionState;
  content?: string;
  errorText?: string;
  children?: ReactNode;
  onApply?: () => void;
  applyLabel?: string;
  onRegenerate?: (tone?: AiTone) => void;
  onRetry?: () => void;
  onDiscard?: () => void;
  onStop?: () => void;
  onUndo?: () => void;
  className?: string;
}) {
  const t = useTranslations("ai.suggestion");
  const head =
    state === "loading" ? t("writing") : state === "error" ? t("errorTitle") : state === "applied" ? t("applied") : title;
  const HeadIcon = state === "error" ? CircleAlert : state === "applied" ? CircleCheck : Sparkles;

  return (
    <section
      aria-busy={state === "loading"}
      aria-live="polite"
      className={cx(
        "flex flex-col gap-3 rounded-lg border p-4",
        state === "error" ? "border-danger bg-surface" : state === "applied" ? "border-dashed border-border-strong bg-surface" : "border-ai bg-ai-soft",
        state === "disabled" && "opacity-60",
        className,
      )}
    >
      <div className={cx("flex items-center gap-2 text-small font-bold", state === "error" ? "text-danger" : state === "applied" ? "text-success" : "text-ai")}>
        <HeadIcon aria-hidden className="icon-sm" />
        <span>{head}</span>
        {source && state !== "error" && state !== "applied" && <span className="ml-auto text-caption font-normal text-text-muted">{source}</span>}
      </div>

      {state === "loading" &&
        (content ? (
          <p className="text-body whitespace-pre-line">{content}</p>
        ) : (
          <div className="flex flex-col gap-2" aria-hidden>
            <span className="skeleton block h-3.5 bg-[color-mix(in_srgb,var(--color-ai)_14%,var(--color-ai-soft))]" />
            <span className="skeleton block h-3.5 w-[90%] bg-[color-mix(in_srgb,var(--color-ai)_14%,var(--color-ai-soft))]" />
            <span className="skeleton block h-3.5 w-[60%] bg-[color-mix(in_srgb,var(--color-ai)_14%,var(--color-ai-soft))]" />
          </div>
        ))}
      {state === "ready" && kind !== "ideas" && content && <p className="text-body whitespace-pre-line">{content}</p>}
      {state === "error" && <p className="text-small text-text-muted">{errorText ?? t("errorText")}</p>}
      {children}

      <div className="flex flex-wrap gap-2 [&_button:not([data-ai])]:bg-surface">
        {state === "loading" && onStop && (
          <Button size="sm" icon={<Square className="icon-sm" />} onClick={onStop}>
            {t("stop")}
          </Button>
        )}
        {state === "ready" && (
          <>
            {onApply && (
              <Button size="sm" variant="ai" data-ai icon={<Check className="icon-sm" />} onClick={onApply}>
                {applyLabel ?? t("apply")}
              </Button>
            )}
            {onRegenerate && (
              <>
                <Button size="sm" icon={<RefreshCw className="icon-sm" />} onClick={() => onRegenerate()}>
                  {t("regenerate")}
                </Button>
                {kind !== "ideas" && (
                  <>
                    <Button size="sm" icon={<Minimize2 className="icon-sm" />} onClick={() => onRegenerate("shorter")}>
                      {t("shorter")}
                    </Button>
                    <Button size="sm" icon={<Maximize2 className="icon-sm" />} onClick={() => onRegenerate("longer")}>
                      {t("longer")}
                    </Button>
                    <Button size="sm" icon={<Smile className="icon-sm" />} onClick={() => onRegenerate("casual")}>
                      {t("casual")}
                    </Button>
                  </>
                )}
              </>
            )}
            {onDiscard && (
              <Button size="sm" variant="ghost" data-ai onClick={onDiscard}>
                {t("discard")}
              </Button>
            )}
          </>
        )}
        {state === "error" && (
          <>
            {onRetry && (
              <Button size="sm" icon={<RefreshCw className="icon-sm" />} onClick={onRetry}>
                {t("retry")}
              </Button>
            )}
            {onDiscard && (
              <Button size="sm" variant="ghost" data-ai onClick={onDiscard}>
                {t("close")}
              </Button>
            )}
          </>
        )}
        {state === "applied" && onUndo && (
          <Button size="sm" variant="ghost" data-ai icon={<Undo2 className="icon-sm" />} onClick={onUndo}>
            {t("undo")}
          </Button>
        )}
      </div>
      {(state === "ready" || state === "loading") && <span className="text-caption font-normal text-text-muted">{t("note")}</span>}
    </section>
  );
}

/** Ideen-/Schnellbefehl-Chip (tw-ai-prompt) */
export function AiChip({
  children,
  icon,
  selected,
  onClick,
  disabled,
  ...rest
}: {
  children: ReactNode;
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-ai px-3 text-small font-semibold text-ai",
        "transition-colors duration-(--duration-fast) hover:bg-ai-soft disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "bg-ai-soft" : "bg-surface",
      )}
    >
      {icon && <span className="flex [&>svg]:size-4" aria-hidden>{icon}</span>}
      {children}
    </button>
  );
}
