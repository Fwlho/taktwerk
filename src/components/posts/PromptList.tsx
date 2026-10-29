"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, BookmarkPlus, Copy, Plus, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { addPrompt, deletePrompt, reorderPrompts, savePromptTemplate, updatePrompt } from "@/server/posts/actions";
import type { PostThread } from "@/server/posts/queries";

type Prompt = PostThread["prompts"][number];
const KINDS = ["text", "caption", "image", "video"] as const;

/** Beliebig viele KI-Prompts je Beitrag: kopieren, sortieren, als Vorlage speichern. Ausführen folgt mit Phase 3. */
export function PromptList({ slug, postId, initial, readOnly }: { slug: string; postId: string; initial: Prompt[]; readOnly: boolean }) {
  const t = useTranslations("posts.prompts");
  const te = useTranslations("errors");
  const toast = useToast();
  const [prompts, setPrompts] = useState(initial);
  const [, startTransition] = useTransition();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  function change(id: string, patch: Partial<Prompt>) {
    setPrompts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const next = { ...prompts.find((p) => p.id === id)!, ...patch };
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(async () => {
        const res = await updatePrompt(slug, id, { kind: next.kind, prompt: next.prompt });
        if (res.error) toast({ kind: "error", title: te(res.error) });
      }, 800),
    );
  }

  function add() {
    startTransition(async () => {
      const res = await addPrompt(slug, postId, { kind: "text", prompt: "", position: prompts.length });
      if (res.error || !res.data) return toast({ kind: "error", title: te(res.error ?? "generic") });
      setPrompts((ps) => [...ps, { id: res.data!.id, kind: "text", prompt: "", result: null, result_at: null, position: ps.length }]);
    });
  }

  function remove(id: string) {
    setPrompts((ps) => ps.filter((p) => p.id !== id));
    startTransition(async () => {
      const res = await deletePrompt(slug, id);
      if (res.error) toast({ kind: "error", title: te(res.error) });
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...prompts];
    const [item] = next.splice(index, 1);
    next.splice(index + dir, 0, item!);
    setPrompts(next);
    startTransition(async () => {
      const res = await reorderPrompts(slug, next.map((p) => p.id));
      if (res.error) toast({ kind: "error", title: te(res.error) });
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ kind: "success", title: t("copied") });
    } catch {
      toast({ kind: "error", title: t("copyFailed") });
    }
  }

  function saveTemplate(p: Prompt) {
    const name = p.prompt.trim().slice(0, 60);
    startTransition(async () => {
      const res = await savePromptTemplate(slug, { name, kind: p.kind, prompt: p.prompt });
      toast(res.error ? { kind: "error", title: te(res.error) } : { kind: "success", title: t("templateSaved") });
    });
  }

  return (
    <section aria-labelledby="prompts-h" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="prompts-h" className="flex items-center gap-2 text-h3">
          <Sparkles aria-hidden className="text-ai" />
          {t("title")}
        </h2>
        {!readOnly && (
          <Button size="sm" variant="ghost" icon={<Plus className="icon-sm" />} onClick={add}>
            {t("add")}
          </Button>
        )}
      </div>
      {prompts.length === 0 && <p className="text-small text-text-muted">{t("empty")}</p>}
      <ol className="flex flex-col gap-3">
        {prompts.map((p, i) => (
          <li key={p.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label>
                <span className="sr-only">{t("kind")}</span>
                <select
                  value={p.kind}
                  disabled={readOnly}
                  onChange={(e) => change(p.id, { kind: e.target.value as Prompt["kind"] })}
                  className="h-(--size-control-sm) rounded-md border border-border-strong bg-surface px-2 text-small font-semibold"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`kinds.${k}`)}
                    </option>
                  ))}
                </select>
              </label>
              <span className="ml-auto flex gap-0.5">
                <Button size="sm" variant="ghost" iconOnly aria-label={t("copy")} icon={<Copy className="icon-sm" />} onClick={() => copy(p.prompt)} disabled={!p.prompt} />
                {!readOnly && (
                  <>
                    <Button size="sm" variant="ghost" iconOnly aria-label={t("saveTemplate")} icon={<BookmarkPlus className="icon-sm" />} onClick={() => saveTemplate(p)} disabled={!p.prompt.trim()} />
                    <Button size="sm" variant="ghost" iconOnly aria-label={t("up")} icon={<ArrowUp className="icon-sm" />} onClick={() => move(i, -1)} disabled={i === 0} />
                    <Button size="sm" variant="ghost" iconOnly aria-label={t("down")} icon={<ArrowDown className="icon-sm" />} onClick={() => move(i, 1)} disabled={i === prompts.length - 1} />
                    <Button size="sm" variant="ghost" iconOnly aria-label={t("delete")} icon={<Trash2 className="icon-sm" />} onClick={() => remove(p.id)} />
                  </>
                )}
              </span>
            </div>
            <label>
              <span className="sr-only">{t("prompt")}</span>
              <textarea
                value={p.prompt}
                readOnly={readOnly}
                onChange={(e) => change(p.id, { prompt: e.target.value })}
                placeholder={t("placeholder")}
                className="field-sizing-content min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body hover:border-text focus-visible:border-focus"
              />
            </label>
            {p.result ? (
              <div className="flex flex-col gap-1 rounded-md bg-ai-soft p-3">
                <span className="text-caption text-ai">{t("result")}</span>
                <p className="text-body whitespace-pre-wrap">{p.result}</p>
              </div>
            ) : (
              <p className="text-caption text-text-muted">
                {p.kind === "image" || p.kind === "video" ? t("mediaHint") : t("runLater")}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
