"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * Formular mit Zod-Prüfung im Browser (Fehler erst beim Verlassen des Feldes)
 * und Übergabe an eine Server Action, die erneut prüft.
 */
export function useServerForm<TSchema extends z.ZodType<FieldValues, FieldValues>, TResult extends { error?: string }>(
  schema: TSchema,
  defaultValues: DefaultValues<z.input<TSchema>>,
  action: (values: z.output<TSchema>) => Promise<TResult>,
) {
  const form = useForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    resolver: zodResolver(schema) as unknown as Resolver<z.input<TSchema>, unknown, z.output<TSchema>>,
    mode: "onTouched",
    defaultValues,
  });
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TResult | null>(null);

  const onSubmit = form.handleSubmit((values) =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        setResult(null);
        const res = await action(values);
        setResult(res ?? null);
        resolve();
      });
    }),
  );

  return { form, onSubmit, pending, result, setResult };
}
