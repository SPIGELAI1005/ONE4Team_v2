import { describe, expect, it } from "vitest";
import { canDeleteMessage, canEditMessage, canManageAnnouncements, MESSAGE_EDIT_WINDOW_MS } from "@/lib/club-message-moderation";

describe("club-message-moderation", () => {
  const userId = "user-1";
  const message = { sender_id: userId, created_at: new Date("2026-06-27T12:00:00.000Z").toISOString() };

  it("allows delete for the sender", () => {
    expect(canDeleteMessage(message, userId)).toBe(true);
    expect(canDeleteMessage(message, "other")).toBe(false);
  });

  it("allows edit within 15 minutes", () => {
    const now = new Date("2026-06-27T12:10:00.000Z").getTime();
    expect(canEditMessage(message, userId, now)).toBe(true);
  });

  it("blocks edit after 15 minutes", () => {
    const now = new Date("2026-06-27T12:00:00.000Z").getTime() + MESSAGE_EDIT_WINDOW_MS + 1;
    expect(canEditMessage(message, userId, now)).toBe(false);
  });

  it("allows announcement management only for club admins", () => {
    expect(canManageAnnouncements(true)).toBe(true);
    expect(canManageAnnouncements(false)).toBe(false);
  });
});
