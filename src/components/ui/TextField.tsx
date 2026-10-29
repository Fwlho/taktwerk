"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cx } from "@/lib/cx";

export const inputClasses =
  "w-full rounded-md border border-border-strong bg-surface px-3 text-text text-body " +
  "placeholder:text-text-muted transition-colors duration-(--duration-fast) ease-standard " +
  "hover:border-text focus-visible:border-focus " +
  "disabled:border-border disabled:bg-surface-sunken disabled:text-text-disabled " +
  "aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger aria-[invalid=true]:px-[11px]";

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

/** Label, Hilfetext und Fehlermeldung um ein Eingabeelement. */
export function FieldShell({ id, label, hint, error, optional, children, className }: FieldShellProps) {
  const t = useTranslations("common");
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label text-text">
        {label}
        {optional && <span className="font-normal text-text-muted"> ({t("optional")})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-small font-semibold text-danger">
          <CircleAlert aria-hidden className="icon-sm" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-small text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type CommonProps = {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  className?: string;
};

export type TextFieldProps = CommonProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, loading, leadingIcon, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className="relative flex items-center">
        {leadingIcon && (
          <span aria-hidden className="pointer-events-none absolute left-3 flex text-text-muted">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          aria-busy={loading || undefined}
          className={cx(inputClasses, "h-(--size-control)", leadingIcon ? "pl-10" : undefined, loading && "pr-10")}
          {...rest}
        />
        {loading && (
          <span aria-hidden className="absolute right-3 flex text-text-muted">
            <LoaderCircle className="animate-[tw-spin_.8s_linear_infinite]" />
          </span>
        )}
      </div>
    </FieldShell>
  );
});

export type TextAreaProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { maxLength?: number; showCount?: boolean };

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, optional, className, id: idProp, maxLength, showCount, value, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const length = typeof value === "string" ? value.length : 0;
  const ratio = maxLength ? length / maxLength : 0;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea
        ref={ref}
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cx(inputClasses, "field-sizing-content min-h-28 max-h-80 py-3")}
        {...rest}
      />
      {showCount && maxLength && (
        <span
          className={cx(
            "self-end text-caption tabular-nums",
            ratio > 1 ? "text-danger" : ratio >= 0.9 ? "text-warning" : "text-text-muted",
          )}
        >
          {length.toLocaleString("de-DE")} / {maxLength.toLocaleString("de-DE")}
        </span>
      )}
    </FieldShell>
  );
});
