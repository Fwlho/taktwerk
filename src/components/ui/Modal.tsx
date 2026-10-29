"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cx } from "@/lib/cx";
import { Button } from "./Button";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "default" | "danger";
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
  /** Fuß: z. B. Abbrechen + Hauptaktion */
  footer?: ReactNode;
  /** Während Laden nicht schließbar */
  busy?: boolean;
};

const widths = { sm: "sm:w-[420px]", md: "sm:w-[480px]", lg: "sm:w-[640px]" };

/**
 * Dialog auf Basis von <dialog>: Fokus bleibt im Dialog, Esc schließt,
 * Fokus kehrt zum Auslöser zurück. Unter bp-tablet als Bottom-Sheet.
 */
export function Modal({ open, onClose, title, subtitle, icon, variant = "default", size = "md", children, footer, busy }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("common");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Fokus aufs erste Feld (bzw. auf „Behalten“ bei Bestätigungen), nicht auf das X
      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ??
        dialog.querySelector<HTMLElement>("input:not([type=hidden]):not(.sr-only), select, textarea");
      target?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const danger = variant === "danger";

  return (
    <dialog
      ref={ref}
      role={danger ? "alertdialog" : "dialog"}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy && !danger) onClose();
      }}
      className={cx(
        "m-0 mt-auto w-full max-w-full overflow-visible bg-transparent p-0 text-text",
        "tablet:m-auto tablet:max-w-[calc(100%-2*var(--space-6))]",
        widths[size],
        "backdrop:bg-scrim backdrop:animate-[tw-fade-in_var(--duration-slow)_var(--ease-standard)]",
      )}
    >
      {open && (
        <div
          className={cx(
            "flex flex-col bg-surface shadow-lg",
            "animate-[tw-sheet-in_var(--duration-slow)_var(--ease-standard)] rounded-t-xl pb-[env(safe-area-inset-bottom)]",
            "tablet:animate-[tw-modal-in_var(--duration-slow)_var(--ease-standard)] tablet:rounded-xl tablet:pb-0",
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong tablet:hidden" />
          <div className="flex items-start gap-3 px-6 pt-6">
            {icon && (
              <span
                className={cx(
                  "inline-flex size-10 flex-none items-center justify-center rounded-full",
                  danger ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary",
                )}
              >
                {icon}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id="modal-title" className="text-h2">
                {title}
              </h2>
              {subtitle && <p className="text-small text-text-muted">{subtitle}</p>}
            </div>
            {!danger && (
              <Button
                variant="ghost"
                iconOnly
                aria-label={t("close")}
                icon={<X />}
                onClick={onClose}
                disabled={busy}
                className="-mr-2.5 -mt-1.5 ml-auto text-text-muted"
              />
            )}
          </div>
          {children && <div className="flex flex-col gap-4 px-6 py-4">{children}</div>}
          {footer && <div className="flex flex-col-reverse gap-2 px-6 pb-6 pt-4 tablet:flex-row tablet:justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
