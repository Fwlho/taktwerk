"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ShellError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors.page");
  return (
    <div className="rounded-lg border border-border bg-surface">
      <EmptyState
        kind="error"
        title={t("title")}
        text={t("text")}
        actions={
          <Button variant="primary" onClick={reset}>
            {t("retry")}
          </Button>
        }
      />
    </div>
  );
}
