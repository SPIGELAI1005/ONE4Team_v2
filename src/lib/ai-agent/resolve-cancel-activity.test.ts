import { describe, expect, it } from "vitest";
import { resolveCancelActivityIdFromHints, type UpcomingTrainingRow } from "@/lib/ai-agent/resolve-cancel-activity";

const upcoming: UpcomingTrainingRow[] = [
  {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    title: "Training",
    starts_at: "2026-06-24T16:00:00.000Z",
    team_id: "team-1",
    team_name: "U12-1",
  },
];

describe("resolve-cancel-activity", () => {
  it("matches team name and today hint", () => {
    const match = resolveCancelActivityIdFromHints(
      { team_name: "U12-1", date_hint: "today" },
      upcoming,
      "Europe/Berlin",
    );
    expect(match?.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(match?.team_name).toBe("U12-1");
  });

  it("returns null when no session matches", () => {
    const match = resolveCancelActivityIdFromHints(
      { team_name: "U19", date_hint: "today" },
      upcoming,
      "Europe/Berlin",
    );
    expect(match).toBeNull();
  });
});
