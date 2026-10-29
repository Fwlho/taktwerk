import type { ReactNode } from "react";

export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 tablet:mb-8">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-h1">{title}</h1>
        {intro && <p className="text-body text-text-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
