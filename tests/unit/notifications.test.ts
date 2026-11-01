import { describe, expect, it } from "vitest";
import { notificationLink } from "@/lib/notifications";

describe("Benachrichtigungs-Links", () => {
  it("Freigabe-Anfrage öffnet direkt die Freigabe-Ansicht", () => {
    expect(notificationLink("malerei", "approval_requested", "p1")).toBe("/o/malerei/approvals/review?start=p1");
  });
  it("andere Arten öffnen den Beitrag", () => {
    expect(notificationLink("malerei", "comment_added", "p1")).toBe("/o/malerei/posts/p1");
    expect(notificationLink("malerei", "post_assigned")).toBe("/o/malerei");
  });
  it("ohne Unternehmen zur Auswahl", () => {
    expect(notificationLink("", "comment_added", "p1")).toBe("/start");
  });
});
