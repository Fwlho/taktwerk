"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/server/notifications/actions";

type State = "loading" | "unsupported" | "needsInstall" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Push auf diesem Gerät ein- oder ausschalten. */
export function PushSettings({ slug }: { slug: string }) {
  const t = useTranslations("notifications.settings");
  const te = useTranslations("errors");
  const toast = useToast();
  const [state, setState] = useState<State>("loading");
  const [pending, startTransition] = useTransition();
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapid) {
        // iPhone/iPad: Push nur, wenn die App zum Home-Bildschirm hinzugefügt wurde
        return setState(isIos() && !isStandalone() ? "needsInstall" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    }
    void check();
  }, [vapid]);

  function enable() {
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid!) });
      const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (res.error) {
        await sub.unsubscribe();
        return toast({ kind: "error", title: te(res.error) });
      }
      setState("on");
      toast({ kind: "success", title: t("enabled") });
    });
  }

  function disable() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast({ kind: "info", title: t("disabled") });
    });
  }

  function test() {
    startTransition(async () => {
      const res = await sendTestPush(slug);
      toast(res.error ? { kind: "error", title: res.error === "noDevice" ? t("noDevice") : te(res.error) } : { kind: "success", title: t("testSent") });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-text-muted">{t("intro")}</p>
      {state === "loading" && <span className="skeleton block h-11 w-56" />}
      {state === "unsupported" && <Banner kind="info">{t("unsupported")}</Banner>}
      {state === "needsInstall" && <Banner kind="info">{t("needsInstall")}</Banner>}
      {state === "denied" && <Banner kind="warning">{t("denied")}</Banner>}
      {state === "off" && (
        <Button variant="primary" icon={<BellRing aria-hidden />} loading={pending} onClick={enable} className="self-start">
          {t("enable")}
        </Button>
      )}
      {state === "on" && (
        <div className="flex flex-wrap gap-2">
          <Button icon={<Send aria-hidden />} loading={pending} onClick={test}>
            {t("test")}
          </Button>
          <Button variant="ghost" icon={<BellOff aria-hidden />} disabled={pending} onClick={disable}>
            {t("disable")}
          </Button>
        </div>
      )}
    </div>
  );
}
