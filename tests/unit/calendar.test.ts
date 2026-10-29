import { describe, expect, it } from "vitest";
import { addMonths, isoWeek, monthGrid, postDay, startOfWeek, viewRange, weekDays } from "@/lib/calendar";
import { berlinLocalToIso, isoToBerlinLocal } from "@/lib/format";

describe("Kalender", () => {
  it("Woche beginnt am Montag", () => {
    expect(startOfWeek("2026-10-29")).toBe("2026-10-26");
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26"); // Sonntag
    expect(weekDays("2026-10-29")).toHaveLength(7);
  });

  it("Monatsraster: 6 Wochen ab Montag", () => {
    const grid = monthGrid("2026-11-15");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-10-26");
    expect(grid).toContain("2026-11-30");
  });

  it("Monate wechseln ohne Überlauf (31. Jan → Feb)", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("Bereich je Ansicht", () => {
    expect(viewRange("list", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(viewRange("week", "2026-10-29")).toEqual({ from: "2026-10-26", to: "2026-11-01" });
  });

  it("Kalenderwoche", () => {
    expect(isoWeek("2026-01-01")).toBe(1);
    expect(isoWeek("2026-10-29")).toBe(44);
  });

  it("Ortszeit Berlin inkl. Sommer-/Winterzeit", () => {
    expect(berlinLocalToIso("2026-07-01", "09:00")).toBe("2026-07-01T07:00:00.000Z");
    expect(berlinLocalToIso("2026-12-01", "09:00")).toBe("2026-12-01T08:00:00.000Z");
    expect(isoToBerlinLocal("2026-12-01T08:00:00.000Z")).toEqual({ date: "2026-12-01", time: "09:00" });
    // Mitternacht verschiebt den Tag
    expect(postDay({ scheduled_at: "2026-07-01T22:30:00Z", planned_on: "2026-07-01" })).toEqual({ day: "2026-07-02", time: "00:30" });
  });
});
