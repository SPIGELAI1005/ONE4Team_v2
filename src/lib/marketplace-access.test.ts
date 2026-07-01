import { describe, expect, it } from "vitest";
import {
  canManageClubMarketplace,
  getClubMarketplaceTabs,
  getProviderPortalTabs,
  isProviderPortalRole,
  marketplacePageExperience,
} from "@/lib/marketplace-access";
import {
  CLUB_MARKETPLACE_TAB_ORDER,
  PROVIDER_PORTAL_TAB_ORDER,
  normalizeClubMarketplaceView,
  normalizeProviderPortalView,
} from "@/lib/marketplace-product-structure";

describe("marketplace-product-structure", () => {
  it("defines club admin tab order", () => {
    expect(CLUB_MARKETPLACE_TAB_ORDER).toEqual([
      "overview",
      "discover",
      "requests",
      "offers",
      "providers",
      "reviews",
      "moderation",
    ]);
  });

  it("defines unified provider portal tabs", () => {
    expect(PROVIDER_PORTAL_TAB_ORDER).toEqual([
      "overview",
      "listing",
      "services",
      "requests",
      "offers",
      "reviews",
      "settings",
    ]);
  });

  it("normalizes legacy view aliases", () => {
    expect(normalizeClubMarketplaceView("payments")).toBe("overview");
    expect(normalizeProviderPortalView("profile")).toBe("listing");
    expect(normalizeProviderPortalView("packages")).toBe("services");
  });
});

describe("marketplace-access", () => {
  it("routes club admins to club marketplace experience", () => {
    expect(marketplacePageExperience("admin", [])).toBe("club_marketplace");
    expect(canManageClubMarketplace("admin", [])).toBe(true);
    expect(getClubMarketplaceTabs("club_admin")).toEqual([
      "overview",
      "discover",
      "requests",
      "offers",
      "providers",
      "reviews",
    ]);
    expect(getClubMarketplaceTabs("admin")).toContain("moderation");
  });

  it("routes external roles to unified provider portal tabs", () => {
    expect(marketplacePageExperience("sponsor", [])).toBe("provider_portal");
    expect(isProviderPortalRole("supplier")).toBe(true);
    expect(getProviderPortalTabs("consultant", [])).toEqual([...PROVIDER_PORTAL_TAB_ORDER]);
    expect(getProviderPortalTabs("service_provider", [])).toContain("requests");
  });

  it("denies player marketplace management by default", () => {
    expect(marketplacePageExperience("player", [])).toBe("denied");
    expect(getClubMarketplaceTabs("player")).toEqual([]);
  });
});