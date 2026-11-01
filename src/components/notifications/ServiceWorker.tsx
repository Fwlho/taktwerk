"use client";

import { useEffect } from "react";

/** Meldet den Service Worker an (für Push und „Zum Startbildschirm hinzufügen“). */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Ohne Service Worker funktioniert die App weiter, nur ohne Push
    });
  }, []);
  return null;
}
