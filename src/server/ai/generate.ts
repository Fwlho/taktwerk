import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { AI_STREAM_ERROR } from "@/lib/ai";
import { AiError, aiConfigured, aiFake, aiModel, anthropic, toAiError } from "./client";
import { beginAiRequest, finishAiRequest, type AiKind, type Db } from "./usage";

export type AiRun = {
  db: Db;
  organizationId: string;
  kind: AiKind;
  system: string;
  user: string;
  /** Denktiefe: kurze Texte „low“, Planung „medium“ */
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
};

// Bei Ablehnung durch das Modell springt serverseitig automatisch ein Ersatzmodell ein.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

function params(run: AiRun) {
  return {
    model: aiModel(),
    max_tokens: run.maxTokens ?? 8000,
    betas: [FALLBACK_BETA],
    fallbacks: "default" as const,
    system: run.system,
    messages: [{ role: "user" as const, content: run.user }],
  };
}

async function begin(run: AiRun): Promise<string> {
  if (!aiConfigured()) throw new AiError("aiNotConfigured");
  return beginAiRequest(run.db, run.organizationId, run.kind);
}

const encoder = new TextEncoder();

/** Text wortweise streamen. Fehler nach Beginn werden als Marke am Ende angehängt. */
export async function streamText(run: AiRun, signal: AbortSignal, fakeText: () => string): Promise<ReadableStream<Uint8Array>> {
  const requestId = await begin(run);

  if (aiFake()) {
    const words = fakeText().split(/(?<= )/);
    return new ReadableStream({
      async start(controller) {
        for (const w of words) {
          if (signal.aborted) break;
          controller.enqueue(encoder.encode(w));
          await new Promise((r) => setTimeout(r, 15));
        }
        await finishAiRequest(run.db, requestId, "fake", null);
        controller.close();
      },
    });
  }

  const stream = anthropic().beta.messages.stream(
    { ...params(run), output_config: { effort: run.effort ?? "low" } },
    { signal },
  );
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        await finishAiRequest(run.db, requestId, final.model, final.usage);
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode(AI_STREAM_ERROR + "aiRefused"));
      } catch (e) {
        await finishAiRequest(run.db, requestId, aiModel(), null);
        if (!signal.aborted) controller.enqueue(encoder.encode(AI_STREAM_ERROR + toAiError(e).key));
      } finally {
        try {
          controller.close();
        } catch {
          // bereits geschlossen (Abbruch durch Stopp)
        }
      }
    },
    cancel() {
      stream.abort();
    },
  });
}

/** Text vollständig erzeugen (Prompt ausführen, Kanalanpassung beim Übertragen) */
export async function generateText(run: AiRun, fakeText: () => string): Promise<string> {
  const requestId = await begin(run);
  if (aiFake()) {
    await finishAiRequest(run.db, requestId, "fake", null);
    return fakeText();
  }
  try {
    const final = await anthropic()
      .beta.messages.stream({ ...params(run), output_config: { effort: run.effort ?? "low" } })
      .finalMessage();
    await finishAiRequest(run.db, requestId, final.model, final.usage);
    if (final.stop_reason === "refusal") throw new AiError("aiRefused");
    const text = final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    if (!text) throw new AiError("aiFailed");
    return text;
  } catch (e) {
    throw toAiError(e);
  }
}

/** Strukturierte Antwort (Ideen, Kampagnenplan) nach Zod-Schema */
export async function generateJson<S extends z.ZodType>(run: AiRun, schema: S, fakeValue: () => z.infer<S>): Promise<z.infer<S>> {
  const requestId = await begin(run);
  if (aiFake()) {
    await finishAiRequest(run.db, requestId, "fake", null);
    return fakeValue();
  }
  try {
    const response = await anthropic().beta.messages.parse({
      ...params(run),
      max_tokens: run.maxTokens ?? 16000,
      output_config: { effort: run.effort ?? "medium", format: betaZodOutputFormat(schema) },
    });
    await finishAiRequest(run.db, requestId, response.model, response.usage);
    if (response.stop_reason === "refusal") throw new AiError("aiRefused");
    if (response.parsed_output == null) throw new AiError("aiFailed");
    return response.parsed_output as z.infer<S>;
  } catch (e) {
    throw toAiError(e);
  }
}
