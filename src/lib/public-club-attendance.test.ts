import { describe, expect, it } from "vitest";
import { resolvePublicClubRsvpActivityId } from "@/lib/public-club-attendance";

describe("resolvePublicClubRsvpActivityId", () => {
  const activities = [
    { id: "act-1", type: "training" as const, starts_at: "2026-06-10T18:00:00.000Z", team_id: "team-a", title: "Training" },
    { id: "act-2", type: "match" as const, starts_at: "2026-06-12T15:00:00.000Z", team_id: "team-a", title: "FC Test vs Rivals" },
  ];

  it("uses activity id directly when training source is activity", () => {
    expect(
      resolvePublicClubRsvpActivityId(
        {
          kind: "training",
          id: "act-1",
          source: "activity",
          startsAt: "2026-06-10T18:00:00.000Z",
          teamId: "team-a",
          title: "Training",
        },
        activities,
      ),
    ).toBe("act-1");
  });

  it("resolves legacy training_session rows by time and team", () => {
    expect(
      resolvePublicClubRsvpActivityId(
        {
          kind: "training",
          id: "legacy-9",
          source: "training_session",
          startsAt: "2026-06-10T18:00:00.000Z",
          teamId: "team-a",
          title: "Training",
        },
        activities,
      ),
    ).toBe("act-1");
  });
});
