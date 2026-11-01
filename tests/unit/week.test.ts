import { describe, expect, it } from "vitest";
import { dayState, progress } from "@/lib/week";

describe("Wochenplan", () => {
  it("Fortschritt zählt Freigegebenes und Weiteres", () => {
    expect(progress(["idea", "approved", "scheduled", "in_review"])).toEqual({ done: 2, total: 4, ratio: 0.5 });
    expect(progress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it("Statuspunkt pro Tag: das Dringendste gewinnt", () => {
    expect(dayState([])).toBe("empty");
    expect(dayState(["approved", "changes_requested", "in_review"])).toBe("changes");
    expect(dayState(["approved", "in_review", "draft"])).toBe("review");
    expect(dayState(["approved", "idea"])).toBe("open");
    expect(dayState(["approved", "scheduled", "published"])).toBe("done");
  });
});
