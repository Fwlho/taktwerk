"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { SegmentTabs } from "@/components/ui/Choice";

type Theme = "system" | "light" | "dark";
const EVENT = "theme-change";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function apply(next: Theme) {
  try {
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
  } catch {
    // Speicher gesperrt (privates Fenster) – gilt dann nur bis zum Neuladen.
  }
  if (next === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
  window.dispatchEvent(new Event(EVENT));
}

export function ThemeSwitch() {
  const t = useTranslations("account.theme");
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  return (
    <SegmentTabs
      name="theme"
      label={t("label")}
      value={theme}
      onChange={(v) => apply(v as Theme)}
      options={[
        { value: "system", label: t("system") },
        { value: "light", label: t("light") },
        { value: "dark", label: t("dark") },
      ]}
    />
  );
}
