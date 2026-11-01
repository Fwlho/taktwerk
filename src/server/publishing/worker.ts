import "server-only";
import { runDuePublishing } from "./service";

// Hintergrund-Takt im laufenden Server: jede Minute fällige Beiträge veröffentlichen.
// Lokal reicht das; online übernimmt später ein Zeitplan (pg_cron → /api/cron/publish).
const INTERVAL_MS = 60_000;
const state = globalThis as typeof globalThis & { __publishWorker?: boolean };

export function startPublishWorker() {
  if (state.__publishWorker) return;
  state.__publishWorker = true;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const n = await runDuePublishing();
      if (n) console.log(`[publish] ${n} Beitrag/Beiträge veröffentlicht`);
    } catch (e) {
      console.error("[publish] Takt fehlgeschlagen", e instanceof Error ? e.message : e);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 10_000);
  setInterval(tick, INTERVAL_MS).unref?.();
}
