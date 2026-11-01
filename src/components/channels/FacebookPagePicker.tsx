"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plug } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelMono } from "@/components/domain/ChannelChip";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import { connectFacebookPage } from "@/server/publishing/actions";

/** Facebook-Seite auswählen und verbinden */
export function FacebookPagePicker({ slug, pages }: { slug: string; pages: { id: string; name: string }[] }) {
  const t = useTranslations("channels.facebook");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState(pages.length === 1 ? pages[0]!.id : "");
  const [pending, startTransition] = useTransition();

  function connect() {
    startTransition(async () => {
      const res = await connectFacebookPage(slug, selected);
      if (res.error) return toast({ kind: "error", title: res.error === "connectExpired" ? t("expiredTitle") : te(res.error) });
      toast({ kind: "success", title: t("connected", { name: res.data!.name }) });
      router.push(`/o/${slug}/channels`);
    });
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label">{t("choose")}</legend>
        {pages.map((p) => (
          <label
            key={p.id}
            className={cx(
              "flex cursor-pointer items-center gap-3 rounded-md p-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
              selected === p.id ? "border-2 border-primary bg-primary-soft" : "border border-border hover:border-border-strong",
            )}
          >
            <input type="radio" name="page" className="sr-only" checked={selected === p.id} onChange={() => setSelected(p.id)} />
            <ChannelMono type="facebook" />
            <span className="flex-1 text-label">{p.name}</span>
            {selected === p.id && <Check aria-hidden className="text-primary" />}
          </label>
        ))}
      </fieldset>
      <p className="text-small text-text-muted">{t("hint")}</p>
      <Button variant="primary" icon={<Plug aria-hidden />} disabled={!selected} loading={pending} onClick={connect} className="self-start">
        {t("connect")}
      </Button>
    </div>
  );
}
