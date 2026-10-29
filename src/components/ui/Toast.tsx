"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, Sparkles, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cx } from "@/lib/cx";

export type ToastKind = "success" | "info" | "warning" | "error" | "ai";

export type ToastInput = {
  kind: ToastKind;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void };
  /** ms; Fehler bleiben standardmäßig stehen */
  duration?: number | "persistent";
};

type ToastItem = ToastInput & { id: number };

const DEFAULT_DURATION = 6000;
const MAX_TOASTS = 3;

const icons: Record<ToastKind, ReactNode> = {
  success: <CircleCheck />,
  info: <Info />,
  warning: <TriangleAlert />,
  error: <CircleAlert />,
  ai: <Sparkles />,
};

const iconColor: Record<ToastKind, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  error: "text-danger",
  ai: "text-ai",
};

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast braucht <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    setItems((prev) => [{ ...t, id }, ...prev].slice(0, MAX_TOASTS));
  }, []);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((i) => i.id !== id)), []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        className={cx(
          "pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+var(--space-4))] z-(--z-toast) flex flex-col gap-2",
          "tablet:inset-x-auto tablet:top-auto tablet:right-6 tablet:bottom-6",
        )}
      >
        {items.map((item) => (
          <ToastView key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const t = useTranslations("common");
  const duration = item.duration ?? (item.kind === "error" ? "persistent" : DEFAULT_DURATION);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(typeof duration === "number" ? duration : 0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (duration === "persistent" || paused) return;
    startedAt.current = Date.now();
    const timer = setTimeout(onDismiss, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [duration, paused, onDismiss]);

  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cx(
        "pointer-events-auto flex w-full items-start gap-3 rounded-md border bg-surface py-3 pr-3 pl-4 shadow-md tablet:w-[380px]",
        "animate-[tw-toast-in_var(--duration-slow)_var(--ease-standard)]",
        item.kind === "error" ? "border-danger" : "border-border",
      )}
    >
      <span className={cx("mt-px flex", iconColor[item.kind])} aria-hidden>
        {icons[item.kind]}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-label font-bold">{item.title}</p>
        {item.text && <p className="text-small text-text-muted">{item.text}</p>}
        {typeof duration === "number" && (
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-border" aria-hidden>
            <div
              className="h-full origin-left bg-text-muted"
              style={{
                animation: `tw-toast-timer ${duration}ms linear forwards`,
                animationPlayState: paused ? "paused" : "running",
              }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className="h-(--size-control-sm) rounded-md px-2.5 text-small font-semibold text-primary hover:bg-primary-soft"
          >
            {item.action.label}
          </button>
        )}
        <button
          type="button"
          aria-label={t("close")}
          onClick={onDismiss}
          className="flex size-(--size-control-sm) items-center justify-center rounded-md text-text-muted hover:bg-surface-hover"
        >
          <X className="icon-sm" />
        </button>
      </div>
    </div>
  );
}
