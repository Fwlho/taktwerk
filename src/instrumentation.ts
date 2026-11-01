// Beim Serverstart: Hintergrund-Takt für geplante Veröffentlichungen (nur Node, nicht beim Bauen).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.PUBLISH_WORKER === "0" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { startPublishWorker } = await import("@/server/publishing/worker");
  startPublishWorker();
}
