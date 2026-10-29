// Deutsche Formatierung laut Design: 12.480 · 1.240 € · +18 % · Di, 14. Apr · 9:00 · Minus als „−“

const TZ = "Europe/Berlin";

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("de-DE").format(n).replace("-", "−");
}

export function formatEuro(cents: number, opts: { decimals?: boolean } = {}): string {
  const euros = cents / 100;
  const decimals = opts.decimals ?? !Number.isInteger(euros);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })
    .format(euros)
    .replace("-", "−");
}

/** „1.240,50“ / „1240“ / „1.240 €“ → Cent; null bei ungültiger Eingabe */
export function parseEuroToCents(input: string): number | null {
  const cleaned = input.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function centsToEuroInput(cents: number): string {
  if (!cents) return "";
  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace(".", ",");
}

/** Datum (YYYY-MM-DD) ohne Zeitzonen-Verschiebung */
export function parseDateOnly(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, day!, 12));
}

export function formatDayMonth(d: string | Date): string {
  const date = typeof d === "string" ? parseDateOnly(d) : d;
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", timeZone: TZ }).format(date).replace(".", ".");
}

export function formatDateRange(start: string, end: string | null): { kind: "range" | "from"; text: string } {
  if (!end) return { kind: "from", text: formatDayMonth(start) };
  return { kind: "range", text: `${formatDayMonth(start)} – ${formatDayMonth(end)}` };
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(d);
  const time = new Intl.DateTimeFormat("de-DE", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(d);
  return `${day} · ${time}`;
}

/** Tage bis zum Datum (heute = 0), Berlin-Zeit */
export function daysUntil(dateOnly: string, now = new Date()): number {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  return Math.round((parseDateOnly(dateOnly).getTime() - parseDateOnly(today).getTime()) / 86_400_000);
}
