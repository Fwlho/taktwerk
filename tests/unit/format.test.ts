import { describe, expect, it } from "vitest";
import { centsToEuroInput, daysUntil, formatEuro, formatNumber, parseEuroToCents } from "@/lib/format";
import { campaignSchema } from "@/lib/validation";

describe("Zahlen und Beträge (deutsch)", () => {
  it("formatiert wie im Design", () => {
    expect(formatNumber(12480)).toBe("12.480");
    expect(formatNumber(-5)).toBe("−5");
    expect(formatEuro(124000).replace(/\s/g, " ")).toBe("1.240 €");
    expect(formatEuro(124050).replace(/\s/g, " ")).toBe("1.240,50 €");
  });

  it("liest Eingaben in Euro", () => {
    expect(parseEuroToCents("2.000")).toBe(200000);
    expect(parseEuroToCents("1.240,50 €")).toBe(124050);
    expect(parseEuroToCents("")).toBe(0);
    expect(parseEuroToCents("abc")).toBeNull();
    expect(parseEuroToCents("1,234")).toBeNull();
    expect(centsToEuroInput(124050)).toBe("1240,50");
    expect(centsToEuroInput(0)).toBe("");
  });

  it("zählt Resttage in Berliner Zeit", () => {
    expect(daysUntil("2026-11-02", new Date("2026-10-30T23:30:00Z"))).toBe(2);
  });
});

describe("Kampagnenformular", () => {
  const base = {
    name: "Frühjahr",
    goal: "inquiries" as const,
    goalDescription: "",
    goalTarget: "30",
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    budget: "2.000",
    status: "running" as const,
    channelIds: [],
  };

  it("wandelt Budget in Cent und Zielwert in Zahl", () => {
    const r = campaignSchema.safeParse(base);
    expect(r.success && r.data.budget).toBe(200000);
    expect(r.success && r.data.goalTarget).toBe(30);
  });

  it("Ende vor Start ist ein Fehler am Feld „Ende“", () => {
    const r = campaignSchema.safeParse({ ...base, endDate: "2026-02-01" });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0]?.path).toEqual(["endDate"]);
  });
});
