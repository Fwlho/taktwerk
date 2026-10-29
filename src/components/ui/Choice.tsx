"use client";

import { Check } from "lucide-react";
import { cx } from "@/lib/cx";

type Option = { value: string; label: string };

/** Mehrfachauswahl als Chips (z. B. Zielgruppen). */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  name?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = value.includes(o.value);
          return (
            <label
              key={o.value}
              className={cx(
                "inline-flex h-(--size-control-sm) cursor-pointer items-center gap-1.5 rounded-full px-3 text-small font-semibold whitespace-nowrap",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                selected ? "border-2 border-primary bg-primary-soft text-primary" : "border border-border-strong text-text hover:bg-surface-hover",
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={o.value}
                checked={selected}
                onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
                className="sr-only"
              />
              {o.label}
              {selected && <Check aria-hidden className="icon-sm" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Einfachauswahl als Segment-Tabs (z. B. Ansprache). */
export function SegmentTabs({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (next: string) => void;
  name: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-label">{label}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-0.5 self-start rounded-md bg-surface-sunken p-[3px]">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label
              key={o.value}
              className={cx(
                "inline-flex h-[34px] cursor-pointer items-center rounded-[8px] px-4 text-label",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                active ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
