import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "ai" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-label " +
  "cursor-pointer transition-[background,border-color,filter] duration-(--duration-fast) ease-standard " +
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-sunken disabled:text-text-disabled disabled:filter-none";

const variants: Record<ButtonVariant, string> = {
  primary: "border-primary bg-primary text-on-primary hover:border-primary-hover hover:bg-primary-hover active:bg-primary-hover",
  secondary: "border-border-strong bg-surface text-text hover:bg-surface-hover active:bg-surface-sunken",
  ghost: "border-transparent bg-transparent text-primary hover:bg-primary-soft active:bg-primary-soft active:brightness-95",
  ai: "border-ai bg-ai text-on-ai hover:brightness-[.88] active:brightness-[.88]",
  danger: "border-danger bg-danger text-on-danger hover:brightness-[.88] active:brightness-[.88]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-(--size-control-sm) px-3 text-small font-semibold",
  md: "h-(--size-control) px-5",
  lg: "h-(--size-control-lg) px-6 rounded-lg text-body-lg font-semibold",
};

const iconOnly: Record<ButtonSize, string> = {
  sm: "w-(--size-control-sm) px-0",
  md: "w-(--size-control) px-0",
  lg: "w-(--size-control-lg) px-0",
};

const spinnerColor: Record<ButtonVariant, string> = {
  primary: "border-on-primary",
  ai: "border-on-ai",
  danger: "border-on-danger",
  secondary: "border-primary",
  ghost: "border-primary",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** Nur Icon – dann ist `aria-label` Pflicht. */
  iconOnly?: boolean;
  loading?: boolean;
  block?: boolean;
};

/** Variante + Größe als Klassen – auch für Links, die wie Buttons aussehen. */
export function buttonClasses({
  variant = "secondary",
  size = "md",
  block,
  className,
}: Pick<ButtonProps, "variant" | "size" | "block" | "className">) {
  return cx(base, variants[variant], sizes[size], block && "w-full", className);
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconOnly: onlyIcon,
  loading,
  block,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      className={cx(
        buttonClasses({ variant, size, block }),
        onlyIcon && iconOnly[size],
        loading && "pointer-events-none !text-transparent",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {loading && (
        <span
          aria-hidden
          className={cx(
            "absolute size-[18px] animate-[tw-spin_.8s_linear_infinite] rounded-full border-2 border-r-transparent",
            spinnerColor[variant],
          )}
        />
      )}
    </button>
  );
}
