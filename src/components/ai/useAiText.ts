"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAiErrorKey, splitAiStream, type AiErrorKey, type TextMode } from "@/lib/ai";

export type AiTextRequest = { postId: string; mode: TextMode; draft: string; instruction?: string; sourcePostId?: string };
export type AiTextState = "idle" | "loading" | "ready" | "error";

/** Streamt einen KI-Text vom Server; Stopp bricht die Anfrage ab (und damit die Kosten). */
export function useAiText(slug: string, onFinished?: () => void) {
  const [state, setState] = useState<AiTextState>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<AiErrorKey | null>(null);
  const controller = useRef<AbortController | null>(null);
  const latest = useRef("");
  const lastRequest = useRef<AiTextRequest | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const fail = (key: AiErrorKey) => {
    setError(key);
    setState("error");
  };

  const run = useCallback(
    async (request: AiTextRequest) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      lastRequest.current = request;
      latest.current = "";
      setText("");
      setError(null);
      setState("loading");
      try {
        const res = await fetch(`/o/${slug}/ai/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: c.signal,
        });
        if (!res.ok || !res.body || !res.headers.get("Content-Type")?.startsWith("text/plain")) {
          const json = (await res.json().catch(() => null)) as { error?: unknown } | null;
          return fail(isAiErrorKey(json?.error) ? json.error : "aiFailed");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          const part = splitAiStream(raw);
          latest.current = part.text;
          setText(part.text);
        }
        const { text: final, error: streamError } = splitAiStream(raw);
        // Abgelehnte oder abgebrochene Teilantworten werden verworfen
        if (streamError) return fail(streamError);
        if (!final.trim()) return fail("aiFailed");
        setText(final.trim());
        setState("ready");
      } catch {
        if (c.signal.aborted) {
          if (controller.current === c) setState(latest.current.trim() ? "ready" : "idle");
        } else fail("aiBusy");
      } finally {
        if (controller.current === c) onFinished?.();
      }
    },
    [slug, onFinished],
  );

  const stop = useCallback(() => controller.current?.abort(), []);
  const retry = useCallback(() => lastRequest.current && run(lastRequest.current), [run]);
  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState("idle");
    setText("");
    setError(null);
  }, []);

  return { state, text, error, run, stop, retry, reset, lastRequest };
}
