import { describe, expect, it } from "vitest";
import { buildClubUpdatesFeed } from "@/lib/club-updates-feed";

describe("buildClubUpdatesFeed", () => {
  it("includes scoped announcements even when no notification rows exist", () => {
    const items = buildClubUpdatesFeed(
      [
        {
          id: "ann-1",
          title: "Heat wave",
          content: "All training cancelled until Friday. Stay hydrated.",
          excerpt: "Training cancelled until Friday",
          team_id: null,
          priority: "high",
          image_url: null,
          publish_to_public_website: true,
          created_at: "2026-06-27T10:00:00.000Z",
        },
      ],
      [],
      { userTeamIds: [], isAdmin: true },
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("announcement");
    expect(items[0]?.title).toBe("Heat wave");
    expect(items[0]?.body).toBe("Training cancelled until Friday");
  });

  it("dedupes announcement notifications when announcement rows are present", () => {
    const items = buildClubUpdatesFeed(
      [
        {
          id: "ann-1",
          title: "Heat wave",
          content: "All training cancelled",
          excerpt: null,
          team_id: null,
          priority: "normal",
          image_url: null,
          publish_to_public_website: false,
          created_at: "2026-06-27T10:00:00.000Z",
        },
      ],
      [
        {
          id: "ntf-1",
          title: "Heat wave",
          body: "All training cancelled",
          notification_type: "announcement",
          reference_id: "ann-1",
          is_read: true,
          created_at: "2026-06-27T10:00:01.000Z",
        },
      ],
      { userTeamIds: [], isAdmin: true },
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.is_read).toBe(true);
  });

  it("hides announcement notifications when the announcement row was deleted", () => {
    const items = buildClubUpdatesFeed(
      [],
      [
        {
          id: "ntf-orphan",
          title: "Deleted announcement",
          body: "Should not appear",
          notification_type: "announcement",
          reference_id: "ann-deleted",
          is_read: false,
          created_at: "2026-06-27T10:00:01.000Z",
        },
      ],
      { userTeamIds: [], isAdmin: true },
    );

    expect(items).toHaveLength(0);
  });
});
