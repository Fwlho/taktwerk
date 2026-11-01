"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { applyWeekTemplate, deleteWeekTemplate, listWeekTemplates, saveWeekAsTemplate } from "@/server/week/actions";

type Template = Awaited<ReturnType<typeof listWeekTemplates>>[number];

/** Wochenvorlagen: feste Wochenstruktur speichern und auf eine Woche anwenden */
export function WeekTemplatesModal({
  slug,
  open,
  onClose,
  weekStart,
  weekHasPosts,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
  weekStart: string;
  weekHasPosts: boolean;
}) {
  const t = useTranslations("week.templatesModal");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void listWeekTemplates(slug).then((list) => alive && setTemplates(list));
    return () => {
      alive = false;
    };
  }, [open, slug]);

  function apply(id: string) {
    startTransition(async () => {
      const res = await applyWeekTemplate(slug, id, weekStart);
      if (res.error) return toast({ kind: "error", title: te(res.error) });
      toast({ kind: "success", title: t("applied", { count: res.data!.count }) });
      onClose();
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      const res = await saveWeekAsTemplate(slug, weekStart, name, isDefault);
      if (res.error) return toast({ kind: "error", title: res.error === "weekEmpty" ? t("weekEmpty") : te(res.error) });
      toast({ kind: "success", title: t("saved") });
      setName("");
      setTemplates(await listWeekTemplates(slug));
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteWeekTemplate(slug, id);
      if (res.error) return toast({ kind: "error", title: te(res.error) });
      setTemplates((list) => list?.filter((x) => x.id !== id) ?? null);
    });
  }

  return (
    <Modal open={open} onClose={onClose} busy={pending} size="lg" icon={<LayoutTemplate />} title={t("title")} subtitle={t("subtitle")}>
      <section className="flex flex-col gap-3">
        <h3 className="text-h3">{t("applyTitle")}</h3>
        {templates === null ? (
          <span className="skeleton block h-12" />
        ) : templates.length === 0 ? (
          <p className="text-body text-text-muted">{t("none")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {templates.map((tpl) => (
              <li key={tpl.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                {tpl.is_default && <Star aria-label={t("default")} className="icon-sm text-accent" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label">{tpl.name}</span>
                  <span className="text-small text-text-muted">{t("slots", { count: tpl.slots })}</span>
                </span>
                <Button size="sm" variant="primary" onClick={() => apply(tpl.id)} disabled={pending}>
                  {t("apply")}
                </Button>
                <Button size="sm" variant="ghost" iconOnly aria-label={t("delete", { name: tpl.name })} icon={<Trash2 className="icon-sm" />} onClick={() => remove(tpl.id)} disabled={pending} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-small text-text-muted">{t("applyHint")}</p>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="text-h3">{t("saveTitle")}</h3>
        {weekHasPosts ? (
          <>
            <TextField label={t("name")} placeholder={t("namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            <label className="flex items-center gap-2 text-body">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
              {t("makeDefault")}
            </label>
            <Button onClick={save} disabled={!name.trim()} loading={pending} className="self-start">
              {t("save")}
            </Button>
          </>
        ) : (
          <p className="text-body text-text-muted">{t("weekEmpty")}</p>
        )}
      </section>
    </Modal>
  );
}
