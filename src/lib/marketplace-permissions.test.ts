import { describe, expect, it } from "vitest";
import {
  hasMarketplacePermission,
  marketplacePermissionsFor,
} from "@/lib/marketplace-permissions";

describe("marketplace-permissions", () => {
  it("grants full club-side permissions to club_admin without moderation", () => {
    const perms = marketplacePermissionsFor("club_admin", []);
    expect(perms).toContain("marketplace:view");
    expect(perms).toContain("marketplace:discover");
    expect(perms).toContain("marketplace:create_request");
    expect(perms).toContain("marketplace:review_offers");
    expect(perms).toContain("marketplace:accept_offer");
    expect(perms).not.toContain("marketplace:moderate");
    expect(perms).not.toContain("marketplace:manage_own_listing");
  });

  it("grants moderation to legacy club owner admin", () => {
    const perms = marketplacePermissionsFor("admin", []);
    expect(perms).toContain("marketplace:moderate");
  });

  it("grants provider permissions to external roles", () => {
    for (const role of ["sponsor", "supplier", "service_provider", "consultant"] as const) {
      const perms = marketplacePermissionsFor(role, []);
      expect(perms).toContain("marketplace:view");
      expect(perms).toContain("marketplace:manage_own_listing");
      expect(perms).toContain("marketplace:respond_to_request");
      expect(perms).not.toContain("marketplace:create_request");
      expect(perms).not.toContain("marketplace:moderate");
    }
  });

  it("denies internal sports roles by default", () => {
    for (const role of ["trainer", "team_staff", "player", "parent", "member"] as const) {
      expect(marketplacePermissionsFor(role, [])).toEqual([]);
      expect(hasMarketplacePermission(role, "marketplace:view")).toBe(false);
    }
  });

  it("denies unknown roles", () => {
    expect(marketplacePermissionsFor("superuser", [])).toEqual([]);
  });
});
