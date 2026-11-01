"use client";

import { useState, useTransition } from "react";
import { Plug, PlugZap, Plus, Trash2, Unplug } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelChip, ChannelMono } from "@/components/domain/ChannelChip";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import type { ChannelType } from "@/lib/domain";
import { CONNECTABLE_CHANNELS } from "@/lib/publishing";
import { addChannel, removeChannel } from "@/server/channels/actions";
import { disconnectChannel } from "@/server/publishing/actions";
import type { ChannelRow } from "@/server/channels/queries";

export function ChannelCard({
  slug,
  type,
  channel,
  canManage,
  connectAvailable,
}: {
  slug: string;
  type: ChannelType;
  channel: ChannelRow | null;
  canManage: boolean;
  /** Plattform-Zugang (Meta-App) ist eingerichtet */
  connectAvailable: boolean;
}) {
  const t = useTranslations("channels");
  const tc = useTranslations("channels.types");
  const te = useTranslations("errors");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const connectable = CONNECTABLE_CHANNELS.includes(type);
  const status = channel?.connection_status ?? "not_connected";
  const connected = status === "connected";
  const name = tc(type);

  function add() {
    startTransition(async () => {
      const res = await addChannel(slug, { type, name });
      if (res.error) toast({ kind: "error", title: te(res.error) });
      else toast({ kind: "success", title: t("added", { name }) });
    });
  }

  function disconnect() {
    startTransition(async () => {
      const res = await disconnectChannel(slug, channel!.id);
      setConfirmDisconnect(false);
      if (res.error) toast({ kind: "error", title: te(res.error) });
      else toast({ kind: "success", title: t("disconnected", { name }) });
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
              <ChannelChip
                type={type}
                label={t(`connection.${status}`)}
                state={connected ? "default" : status === "expired" || status === "error" ? "error" : "off"}
                compact
              />
            )}
          </div>
          {connected && channel.external_account_name && (
            <p className="text-small">
              {t("account")}: <span className="font-semibold">{channel.external_account_name}</span>
            </p>
          )}
          {type !== "offline" && !connected && (
            <p className="text-small text-text-muted">
              {!connectable ? t("connectLater") : status === "expired" ? t("expiredHint") : connectAvailable ? t("connectHint") : t("connectSetup")}
            </p>
          )}
          {canManage && (
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {type !== "offline" &&
                (connectable && connectAvailable ? (
                  // Volle Seitennavigation: führt zur Anmeldung bei der Plattform
                  <a
                    href={`/o/${slug}/channels/${type}/connect`}
                    className={buttonClasses({ size: "sm", variant: connected ? "secondary" : "primary" })}
                  >
                    {connected ? <PlugZap aria-hidden className="icon-sm" /> : <Plug aria-hidden className="icon-sm" />}
                    {connected ? t("reconnect") : status === "expired" ? t("reconnect") : t("connect")}
                  </a>
                ) : (
                  <Button size="sm" icon={<Plug className="icon-sm" />} disabled>
                    {t("connect")}
                  </Button>
                ))}
              {connected && (
                <Button size="sm" variant="ghost" icon={<Unplug className="icon-sm" />} onClick={() => setConfirmDisconnect(true)}>
                  {t("disconnect")}
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
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        variant="danger"
        size="sm"
        busy={pending}
        icon={<Unplug />}
        title={t("disconnectTitle", { name })}
        footer={
          <>
            <Button onClick={() => setConfirmDisconnect(false)} disabled={pending} data-autofocus>
              {t("keep")}
            </Button>
            <Button variant="danger" loading={pending} onClick={disconnect}>
              {t("disconnect")}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-muted">{t("disconnectText")}</p>
      </Modal>

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
