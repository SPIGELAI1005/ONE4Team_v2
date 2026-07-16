import { describe, expect, it } from "vitest";
import { announcementShareCard, isAnnouncementPubliclyVisible } from "@/lib/announcement-publish";

describe("isAnnouncementPubliclyVisible", () => {
  it("hides drafts and future scheduled posts", () => {
    expect(
      isAnnouncementPubliclyVisible({
        publish_to_public_website: true,
        is_draft: true,
      }),
    ).toBe(false);
    expect(
      isAnnouncementPubliclyVisible({
        publish_to_public_website: true,
        scheduled_publish_at: "2099-01-01T00:00:00Z",
        nowMs: Date.parse("2026-07-16T00:00:00Z"),
      }),
    ).toBe(false);
    expect(
      isAnnouncementPubliclyVisible({
        publish_to_public_website: true,
        scheduled_publish_at: "2026-01-01T00:00:00Z",
        nowMs: Date.parse("2026-07-16T00:00:00Z"),
      }),
    ).toBe(true);
  });
});

describe("announcementShareCard", () => {
  it("builds OG fields", () => {
    expect(
      announcementShareCard({
        title: "Match day",
        excerpt: "Come support the team",
        imageUrl: "https://example.com/a.jpg",
        url: "https://example.com/news/1",
      }),
    ).toMatchObject({
      title: "Match day",
      description: "Come support the team",
      imageUrl: "https://example.com/a.jpg",
    });
  });
});
