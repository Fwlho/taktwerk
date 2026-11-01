"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowDownToLine, ArrowUp, BookmarkPlus, Copy, LibraryBig, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { addPrompt, deletePrompt, reorderPrompts, savePromptTemplate, updatePrompt } from "@/server/posts/actions";
import type { PostThread } from "@/server/posts/queries";
import { listPromptTemplates } from "@/server/week/actions";
import { runPrompt } from "@/server/ai/actions";

type Prompt = PostThread["prompts"][number];
const KINDS = ["text", "caption", "image", "video"] as const;

/**
 * Beliebig viele KI-Prompts je Beitrag: kopieren, sortieren, als Vorlage speichern.
 * Text- und Caption-Prompts lassen sich ausführen; Bild/Video werden nur kopiert (externe Werkzeuge).
 */
export function PromptList({
  slug,
  postId,
  initial,
  readOnly,
  canRun,
  onUseResult,
}: {
  slug: string;
  postId: string;
  initial: Prompt[];
  readOnly: boolean;
  canRun: boolean;
  onUseResult: (text: string) => void;
}) {
  const t = useTranslations("posts.prompts");
  const te = useTranslations("errors");
  const tai = useTranslations("ai.errors");
  const toast = useToast();
  const [prompts, setPrompts] = useState(initial);
  const [running, setRunning] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof listPromptTemplates>> | null>(null);
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

  function add(kind: Prompt["kind"] = "text", prompt = "") {
    startTransition(async () => {
      const res = await addPrompt(slug, postId, { kind, prompt, position: prompts.length });
      if (res.error || !res.data) return toast({ kind: "error", title: te(res.error ?? "generic") });
      setPrompts((ps) => [...ps, { id: res.data!.id, kind, prompt, result: null, result_at: null, position: ps.length }]);
    });
  }

  function openTemplates() {
    setPicking(true);
    void listPromptTemplates(slug).then(setTemplates);
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

  async function run(p: Prompt) {
    setRunning(p.id);
    try {
      // Offene Änderung am Prompt zuerst speichern
      if (timers.current.has(p.id)) {
        clearTimeout(timers.current.get(p.id));
        timers.current.delete(p.id);
        const saved = await updatePrompt(slug, p.id, { kind: p.kind, prompt: p.prompt });
        if (saved.error) return toast({ kind: "error", title: te(saved.error) });
      }
      const res = await runPrompt(slug, p.id);
      if (res.error || !res.data) {
        const key = res.error ?? "aiFailed";
        return toast({ kind: "error", title: key.startsWith("ai") ? tai(key as never) : te(key) });
      }
      setPrompts((ps) => ps.map((x) => (x.id === p.id ? { ...x, result: res.data!.result, result_at: res.data!.resultAt } : x)));
    } finally {
      setRunning(null);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="prompts-h" className="flex items-center gap-2 text-h3">
          <Sparkles aria-hidden className="text-ai" />
          {t("title")}
        </h2>
        {!readOnly && (
          <span className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<LibraryBig className="icon-sm" />} onClick={openTemplates}>
              {t("fromTemplate")}
            </Button>
            <Button size="sm" variant="ghost" icon={<Plus className="icon-sm" />} onClick={() => add()}>
              {t("add")}
            </Button>
          </span>
        )}
      </div>
      <Modal open={picking} onClose={() => setPicking(false)} icon={<LibraryBig />} title={t("templatesTitle")}>
        {templates === null ? (
          <span className="skeleton block h-12" />
        ) : templates.length === 0 ? (
          <p className="text-body text-text-muted">{t("noTemplates")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {templates.map((tpl) => (
              <li key={tpl.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicking(false);
                    add(tpl.kind, tpl.prompt);
                  }}
                  className="flex w-full flex-col gap-0.5 rounded-md border border-border p-3 text-left hover:border-border-strong hover:bg-surface-hover"
                >
                  <span className="text-label">{tpl.name}</span>
                  <span className="text-caption font-normal text-text-muted">{t(`kinds.${tpl.kind}`)}</span>
                  <span className="line-clamp-2 text-small text-text-muted">{tpl.prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
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
            {(p.kind === "text" || p.kind === "caption") && canRun && (
              <Button
                size="sm"
                variant="ai"
                icon={<Play className="icon-sm" />}
                loading={running === p.id}
                disabled={!p.prompt.trim() || (running !== null && running !== p.id)}
                onClick={() => void run(p)}
                className="self-start"
              >
                {p.result ? t("runAgain") : t("run")}
              </Button>
            )}
            {p.result ? (
              <div className="flex flex-col gap-2 rounded-md border border-ai bg-ai-soft p-3">
                <span className="flex items-center gap-1 text-caption text-ai">
                  <Sparkles aria-hidden className="icon-sm" />
                  {t("result")}
                </span>
                <p className="text-body whitespace-pre-wrap">{p.result}</p>
                <span className="flex flex-wrap gap-1">
                  <Button size="sm" icon={<Copy className="icon-sm" />} onClick={() => copy(p.result!)}>
                    {t("copyResult")}
                  </Button>
                  {!readOnly && (
                    <Button size="sm" icon={<ArrowDownToLine className="icon-sm" />} onClick={() => onUseResult(p.result!)}>
                      {t("useResult")}
                    </Button>
                  )}
                </span>
                <span className="text-caption font-normal text-text-muted">{t("checkHint")}</span>
              </div>
            ) : (
              <p className="text-caption text-text-muted">
                {p.kind === "image" || p.kind === "video" ? t("mediaHint") : canRun ? t("runHint") : t("runLater")}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
