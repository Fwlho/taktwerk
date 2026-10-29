// Kalenderrechnung auf reinen Datumswerten (YYYY-MM-DD), Woche beginnt am Montag.
import { isoToBerlinLocal, parseDateOnly } from "./format";

export type CalendarView = "month" | "week" | "list";
export const CALENDAR_VIEWS: readonly CalendarView[] = ["month", "week", "list"];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const d = parseDateOnly(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

export function addMonths(date: string, months: number): string {
  const d = parseDateOnly(date);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  return iso(d);
}

/** ISO-Wochentag 1 (Mo) … 7 (So) */
export function weekday(date: string): number {
  const day = parseDateOnly(date).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfWeek(date: string): string {
  return addDays(date, 1 - weekday(date));
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** 6 Wochen ab dem Montag vor dem Monatsersten */
export function monthGrid(date: string): string[] {
  const first = startOfWeek(startOfMonth(date));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekDays(date: string): string[] {
  const first = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Datumsbereich, den eine Ansicht lädt */
export function viewRange(view: CalendarView, date: string): { from: string; to: string } {
  if (view === "week") {
    const days = weekDays(date);
    return { from: days[0]!, to: days[6]! };
  }
  if (view === "list") return { from: startOfMonth(date), to: addDays(addMonths(date, 1), -1) };
  const grid = monthGrid(date);
  return { from: grid[0]!, to: grid[41]! };
}

export function shift(view: CalendarView, date: string, dir: -1 | 1): string {
  return view === "week" ? addDays(date, 7 * dir) : addMonths(date, dir);
}

/** Kalendertag und Uhrzeit (Berlin) eines Beitrags */
export function postDay(p: { scheduled_at: string | null; planned_on: string | null }): { day: string | null; time: string | null } {
  if (p.scheduled_at) {
    const local = isoToBerlinLocal(p.scheduled_at);
    return { day: local.date, time: local.time };
  }
  return { day: p.planned_on, time: null };
}

/** ISO-Kalenderwoche */
export function isoWeek(date: string): number {
  const d = parseDateOnly(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
