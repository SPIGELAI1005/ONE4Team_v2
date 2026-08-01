import { describe, expect, it } from "vitest";
import { buildClubUpdatesFeed, filterUnreadClubUpdates } from "@/lib/club-updates-feed";

describe("buildClubUpdatesFeed", () => {
  it("does not treat bare announcements as unread updates without notifications", () => {
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

    expect(items).toHaveLength(0);
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
    expect(filterUnreadClubUpdates(items)).toHaveLength(0);
  });

  it("keeps unread announcement updates until their notification is read", () => {
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
          is_read: false,
          created_at: "2026-06-27T10:00:01.000Z",
        },
        {
          id: "ntf-msg",
          title: "Club General",
          body: "Hello",
          notification_type: "message",
          reference_id: null,
          is_read: false,
          created_at: "2026-06-27T11:00:00.000Z",
        },
      ],
      { userTeamIds: [], isAdmin: true },
    );

    expect(filterUnreadClubUpdates(items)).toHaveLength(2);
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

  it("prefers an unread duplicate announcement notification for the badge", () => {
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
          id: "ntf-read",
          title: "Heat wave",
          body: "All training cancelled",
          notification_type: "announcement",
          reference_id: "ann-1",
          is_read: true,
          created_at: "2026-06-27T10:00:01.000Z",
        },
        {
          id: "ntf-unread",
          title: "Heat wave",
          body: "All training cancelled",
          notification_type: "announcement",
          reference_id: "ann-1",
          is_read: false,
          created_at: "2026-06-27T10:00:02.000Z",
        },
      ],
      { userTeamIds: [], isAdmin: true },
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.is_read).toBe(false);
    expect(items[0]?.notification_id).toBe("ntf-unread");
  });
});
