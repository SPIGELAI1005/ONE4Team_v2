import { describe, expect, it } from "vitest";
import { buildClubInviteLandingUrl, buildClubInviteRedeemUrl } from "@/lib/club-invite-links";

describe("club invite links", () => {
  const origin = "https://one-4-team-v2.vercel.app";
  const token = "abc123token";

  it("lands on public club page when slug is known", () => {
    expect(
      buildClubInviteLandingUrl({ inviteToken: token, clubSlug: "tsv-allach-09", siteOrigin: origin }),
    ).toBe(`${origin}/club/tsv-allach-09?invite=${token}`);
  });

  it("falls back to onboarding when slug is missing", () => {
    expect(buildClubInviteLandingUrl({ inviteToken: token, clubSlug: null, siteOrigin: origin })).toBe(
      `${origin}/onboarding?invite=${token}`,
    );
  });

  it("builds redeem URL for post-login acceptance", () => {
    expect(
      buildClubInviteRedeemUrl({ inviteToken: token, clubSlug: "tsv-allach-09", siteOrigin: origin }),
    ).toBe(`${origin}/onboarding?invite=${token}&club=tsv-allach-09`);
  });
});
