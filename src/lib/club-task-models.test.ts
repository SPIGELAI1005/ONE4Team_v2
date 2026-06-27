import { describe, expect, it } from "vitest";
import { isClubTaskOverdue, isClubTaskOpen } from "@/lib/club-task-models";

describe("club-task-models", () => {
  it("detects open statuses", () => {
    expect(isClubTaskOpen("open")).toBe(true);
    expect(isClubTaskOpen("done")).toBe(false);
  });

  it("detects overdue tasks", () => {
    expect(
      isClubTaskOverdue(
        { due_at: "2020-01-01T00:00:00.000Z", status: "open" },
        new Date("2026-01-01").getTime(),
      ),
    ).toBe(true);
    expect(
      isClubTaskOverdue(
        { due_at: "2030-01-01T00:00:00.000Z", status: "open" },
        new Date("2026-01-01").getTime(),
      ),
    ).toBe(false);
  });
});
