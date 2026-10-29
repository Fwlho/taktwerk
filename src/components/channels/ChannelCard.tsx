"use client";

import { useState, useTransition } from "react";
import { Plug, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelChip, ChannelMono } from "@/components/domain/ChannelChip";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import type { ChannelType } from "@/lib/domain";
import { addChannel, removeChannel } from "@/server/channels/actions";
import type { ChannelRow } from "@/server/channels/queries";

export function ChannelCard({
  slug,
  type,
  channel,
  canManage,
}: {
  slug: string;
  type: ChannelType;
  channel: ChannelRow | null;
  canManage: boolean;
}) {
  const t = useTranslations("channels");
  const tc = useTranslations("channels.types");
  const te = useTranslations("errors");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const name = tc(type);

  function add() {
    startTransition(async () => {
      const res = await addChannel(slug, { type, name });
      if (res.error) toast({ kind: "error", title: te(res.error) });
      else toast({ kind: "success", title: t("added", { name }) });
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await removeChannel(slug, channel!.id);
      setConfirm(false);
      if (res.error) toast({ kind: "error", title: te(res.error) });
      else toast({ kind: "success", title: t("removed", { name }) });
    });
  }

  return (
    <article
      className={cx(
        "flex h-full flex-col gap-3 rounded-lg p-5",
        channel ? "border border-border bg-surface" : "border border-dashed border-border-strong",
      )}
    >
      <div className="flex items-center gap-3">
        <ChannelMono type={type} size="lg" off={!channel} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-h3">{name}</h2>
          <p className="text-small text-text-muted">{t(`descriptions.${type}`)}</p>
        </div>
      </div>
      {channel ? (
        <>
          <div>
            {type === "offline" ? (
              <ChannelChip type={type} label={t("offlineReady")} compact />
            ) : (
              <ChannelChip type={type} label={t(`connection.${channel.connection_status}`)} state="off" compact />
            )}
          </div>
          {type !== "offline" && <p className="text-small text-text-muted">{t("connectLater")}</p>}
          {canManage && (
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {type !== "offline" && (
                <Button size="sm" icon={<Plug className="icon-sm" />} disabled>
                  {t("connect")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="icon-sm" />}
                onClick={() => setConfirm(true)}
                className="text-text-muted"
              >
                {t("remove")}
              </Button>
            </div>
          )}
        </>
      ) : canManage ? (
        <Button variant="ghost" icon={<Plus aria-hidden />} loading={pending} onClick={add} className="mt-auto self-start" aria-label={t("addNamed", { name })}>
          {t("add")}
        </Button>
      ) : (
        <p className="mt-auto text-small text-text-muted">{t("notAdded")}</p>
      )}

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        variant="danger"
        size="sm"
        busy={pending}
        icon={<Trash2 />}
        title={t("removeTitle", { name })}
        footer={
          <>
            <Button onClick={() => setConfirm(false)} disabled={pending} data-autofocus>
              {t("keep")}
            </Button>
            <Button variant="danger" loading={pending} onClick={remove}>
              {t("remove")}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-muted">{t("removeText")}</p>
      </Modal>
    </article>
  );
}
