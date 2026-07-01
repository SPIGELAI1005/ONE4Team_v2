import { describe, expect, it } from "vitest";
import {
  canAcceptMarketplaceOffer,
  canCreateMarketplaceRequest,
  canManageClubMarketplace,
  canModerateMarketplaceListings,
  getClubMarketplaceTabs,
  getProviderPortalTabs,
  marketplacePageExperience,
} from "@/lib/marketplace-access";
import {
  CLUB_MARKETPLACE_TAB_ORDER,
  PROVIDER_PORTAL_TAB_ORDER,
} from "@/lib/marketplace-product-structure";
import {
  hasMarketplacePermission,
  marketplacePermissionsFor,
} from "@/lib/marketplace-permissions";
import {
  canAccessMarketplaceRoute,
  showsMarketplaceInSidebar,
} from "@/lib/marketplace-security";
import {
  canAccessModule,
  getModuleAccess,
  getSidebarMenuItems,
} from "@/lib/rbac-config";
import { effectivePermissions } from "@/lib/permissions";

const INTERNAL_DENIED_ROLES = ["trainer", "team_staff", "player", "parent", "parent_supporter", "member"] as const;
const PROVIDER_ROLES = ["sponsor", "supplier", "service_provider", "consultant"] as const;

describe("marketplace RBAC matrix — sidebar & route", () => {
  it.each([
    ["admin", true],
    ["club_admin", true],
    ...PROVIDER_ROLES.map((role) => [role, true] as const),
    ...INTERNAL_DENIED_ROLES.map((role) => [role, false] as const),
  ])("%s marketplace sidebar visibility = %s", (role, visible) => {
    expect(showsMarketplaceInSidebar(role, [])).toBe(visible);
    const menu = getSidebarMenuItems(role);
    if (visible) {
      expect(menu).toContain("marketplace");
    } else {
      expect(menu).not.toContain("marketplace");
    }
  });

  it.each([
    ["admin", true],
    ["club_admin", true],
    ...PROVIDER_ROLES.map((role) => [role, true] as const),
    ...INTERNAL_DENIED_ROLES.map((role) => [role, false] as const),
  ])("%s direct /marketplace route access = %s", (role, allowed) => {
    expect(canAccessMarketplaceRoute(role, [])).toBe(allowed);
    expect(canAccessModule(role, "marketplace")).toBe(allowed);
    if (!allowed) {
      expect(marketplacePageExperience(role, [])).toBe("denied");
    }
  });
});

describe("marketplace RBAC matrix — admin", () => {
  it("can access marketplace with full club tabs including moderation", () => {
    expect(marketplacePageExperience("admin", [])).toBe("club_marketplace");
    expect(canManageClubMarketplace("admin", [])).toBe(true);
    expect(canModerateMarketplaceListings("admin", [])).toBe(true);
    expect(getClubMarketplaceTabs("admin", [])).toEqual([...CLUB_MARKETPLACE_TAB_ORDER]);
    expect(hasMarketplacePermission("admin", "marketplace:review_offers")).toBe(true);
    expect(hasMarketplacePermission("admin", "marketplace:accept_offer")).toBe(true);
  });
});

describe("marketplace RBAC matrix — club admin", () => {
  it("can browse, create requests, and review offers without moderation", () => {
    expect(marketplacePageExperience("club_admin", [])).toBe("club_marketplace");
    expect(canManageClubMarketplace("club_admin", [])).toBe(true);
    expect(canModerateMarketplaceListings("club_admin", [])).toBe(false);
    expect(canCreateMarketplaceRequest("club_admin", [])).toBe(true);
    expect(canAcceptMarketplaceOffer("club_admin", [])).toBe(true);

    const tabs = getClubMarketplaceTabs("club_admin", []);
    expect(tabs).toContain("discover");
    expect(tabs).toContain("requests");
    expect(tabs).toContain("offers");
    expect(tabs).not.toContain("moderation");
  });
});

describe.each(PROVIDER_ROLES)("marketplace RBAC matrix — provider %s", (role) => {
  it("can access provider portal and manage own listing without club admin powers", () => {
    expect(marketplacePageExperience(role, [])).toBe("provider_portal");
    expect(getProviderPortalTabs(role, [])).toEqual([...PROVIDER_PORTAL_TAB_ORDER]);
    expect(hasMarketplacePermission(role, "marketplace:manage_own_listing")).toBe(true);
    expect(hasMarketplacePermission(role, "marketplace:respond_to_request")).toBe(true);
    expect(hasMarketplacePermission(role, "marketplace:create_request")).toBe(false);
    expect(hasMarketplacePermission(role, "marketplace:moderate")).toBe(false);
    expect(canManageClubMarketplace(role, [])).toBe(false);
  });

  it("cannot access internal club operations or member directory", () => {
    expect(getModuleAccess(role, "members")).toBe("none");
    expect(getModuleAccess(role, "matches")).toBe("none");
    expect(getModuleAccess(role, "trainings")).toBe("none");
    expect(getModuleAccess(role, "partners")).toBe("none");
    expect(getModuleAccess(role, "invites")).toBe("none");
    if (role === "supplier") {
      expect(getModuleAccess(role, "assets")).toBe("none");
      expect(getModuleAccess(role, "payments")).toBe("none");
      expect(getModuleAccess(role, "messages")).toBe("own");
      expect(getModuleAccess(role, "tasks")).toBe("assigned");
      expect(getModuleAccess(role, "reports")).toBe("limited");
      expect(getModuleAccess(role, "ai4t")).toBe("limited");
      expect(getModuleAccess(role, "supplier_page")).toBe("own");
    }
    const perms = effectivePermissions(role, []);
    expect(perms).not.toContain("members:read");
    expect(perms).not.toContain("matches:read");
    expect(perms).not.toContain("partners:read");
  });
});

describe.each(INTERNAL_DENIED_ROLES)("marketplace RBAC matrix — denied internal role %s", (role) => {
  it("has no marketplace permissions and denied experience", () => {
    expect(marketplacePermissionsFor(role, [])).toEqual([]);
    expect(marketplacePageExperience(role, [])).toBe("denied");
    expect(getClubMarketplaceTabs(role, [])).toEqual([]);
    expect(getProviderPortalTabs(role, [])).toEqual([]);
  });
});

describe("marketplace RBAC matrix — parent alias", () => {
  it("normalizes parent to parent_supporter and denies marketplace", () => {
    expect(showsMarketplaceInSidebar("parent", [])).toBe(false);
    expect(canAccessMarketplaceRoute("Parent / Supporter", [])).toBe(false);
  });
});
