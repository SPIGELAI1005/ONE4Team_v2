import { describe, expect, it } from "vitest";
import {
  canAccessModule,
  canWriteModule,
  getDataScopeForModule,
  getModuleAccess,
  getSidebarMenuItems,
  isExternalRole,
  isInternalClubRole,
  isSportsRole,
  normalizeDashboardRole,
  resolveDashboardRole,
} from "@/lib/rbac-config";
import { legacyPermissionsFromRbac, effectivePermissions } from "@/lib/permissions";

describe("normalizeDashboardRole", () => {
  it("maps legacy DB and UI aliases to normalized roles", () => {
    expect(normalizeDashboardRole("admin")).toBe("club_admin");
    expect(normalizeDashboardRole("staff")).toBe("team_staff");
    expect(normalizeDashboardRole("parent")).toBe("parent_supporter");
    expect(normalizeDashboardRole("Parent / Supporter")).toBe("parent_supporter");
    expect(normalizeDashboardRole("service")).toBe("service_provider");
    expect(normalizeDashboardRole("service_provider")).toBe("service_provider");
    expect(normalizeDashboardRole("club_admin")).toBe("club_admin");
  });

  it("returns null for unknown roles (safe fallback, not admin)", () => {
    expect(normalizeDashboardRole("superuser")).toBeNull();
    expect(normalizeDashboardRole("")).toBeNull();
    expect(getModuleAccess("superuser", "matches")).toBe("none");
    expect(getModuleAccess("superuser", "dashboard")).toBe("own");
  });
});

describe("role classification helpers", () => {
  it("identifies external vs internal vs sports roles", () => {
    expect(isExternalRole("sponsor")).toBe(true);
    expect(isExternalRole("trainer")).toBe(false);
    expect(isInternalClubRole("player")).toBe(true);
    expect(isInternalClubRole("supplier")).toBe(false);
    expect(isSportsRole("team_staff")).toBe(true);
    expect(isSportsRole("member")).toBe(false);
    expect(isSportsRole("sponsor")).toBe(false);
  });
});

describe("module access baseline", () => {
  it("grants club_admin full members access", () => {
    expect(getModuleAccess("club_admin", "members")).toBe("full");
    expect(canWriteModule("club_admin", "members")).toBe(true);
  });

  it("denies sponsor internal sports modules in dashboard", () => {
    expect(getModuleAccess("sponsor", "matches")).toBe("none");
    expect(getModuleAccess("sponsor", "trainings")).toBe("none");
    expect(getModuleAccess("sponsor", "members")).toBe("none");
    expect(canAccessModule("sponsor", "marketplace")).toBe(true);
    expect(canAccessModule("sponsor", "partners")).toBe(false);
    expect(canAccessModule("sponsor", "tasks")).toBe(true);
  });

  it("allows trainer team scope without payments, partners, or club page", () => {
    expect(getModuleAccess("trainer", "trainings")).toBe("team");
    expect(getModuleAccess("trainer", "payments")).toBe("none");
    expect(getModuleAccess("trainer", "partners")).toBe("none");
    expect(getModuleAccess("trainer", "club_page")).toBe("none");
  });

  it("scopes parent supporter to family-oriented access", () => {
    expect(getModuleAccess("parent_supporter", "payments")).toBe("own");
    expect(getDataScopeForModule("parent_supporter", "payments")).toBe("family");
    expect(getModuleAccess("parent_supporter", "matches")).toBe("team");
  });

  it("restricts generic member from sports ops unless linked", () => {
    expect(getModuleAccess("member", "trainings")).toBe("none");
    expect(getModuleAccess("member", "matches")).toBe("none");
    expect(getModuleAccess("member", "events")).toBe("read");
    expect(getModuleAccess("member", "members")).toBe("none");
    expect(getModuleAccess("member", "payments")).toBe("none");
    expect(getModuleAccess("member", "messages")).toBe("read");
    expect(getModuleAccess("member", "tasks")).toBe("own");
  });

  it("member sidebar is club-wide only (no trainings, matches, payments, members)", () => {
    const menu = getSidebarMenuItems("member");
    expect(menu).toContain("events");
    expect(menu).toContain("messages");
    expect(menu).not.toContain("trainings");
    expect(menu).not.toContain("matches");
    expect(menu).not.toContain("payments");
    expect(menu).not.toContain("members");
  });
});

describe("getSidebarMenuItems", () => {
  it("omits none-access modules and preserves menu order", () => {
    const sponsorMenu = getSidebarMenuItems("sponsor");
    expect(sponsorMenu).not.toContain("matches");
    expect(sponsorMenu).not.toContain("trainings");
    expect(sponsorMenu).not.toContain("events");
    expect(sponsorMenu[0]).toBe("dashboard");
    expect(sponsorMenu).toContain("marketplace");
    expect(sponsorMenu).not.toContain("partners");
    expect(sponsorMenu).not.toContain("assets");
    expect(sponsorMenu).not.toContain("payments");
    expect(sponsorMenu).toContain("messages");
    expect(sponsorMenu).toContain("supplier_page");
    expect(sponsorMenu).not.toContain("club_shop");
  });

  it("supplier menu is marketplace-focused with partner modules", () => {
    const menu = getSidebarMenuItems("supplier");
    expect(menu).toContain("dashboard");
    expect(menu).toContain("marketplace");
    expect(menu).toContain("messages");
    expect(menu).toContain("tasks");
    expect(menu).toContain("reports");
    expect(menu).toContain("ai4t");
    expect(menu).toContain("supplier_page");
    expect(menu).not.toContain("assets");
    expect(menu).not.toContain("payments");
    expect(canAccessModule("supplier", "assets")).toBe(false);
    expect(canAccessModule("supplier", "payments")).toBe(false);
    expect(canAccessModule("supplier", "messages")).toBe(true);
    expect(canAccessModule("supplier", "tasks")).toBe(true);
    expect(canAccessModule("supplier", "reports")).toBe(true);
    expect(canAccessModule("supplier", "ai4t")).toBe(true);
    expect(canAccessModule("supplier", "supplier_page")).toBe(true);
    expect(canAccessModule("supplier", "trainings")).toBe(false);
  });

  it("shows broad menu for club_admin without partner page", () => {
    const menu = getSidebarMenuItems("club_admin");
    expect(menu).toContain("members");
    expect(menu).toContain("payments");
    expect(menu).toContain("assets");
    expect(menu).toContain("marketplace");
    expect(menu).toContain("partners");
    expect(menu).not.toContain("supplier_page");
    const marketplaceIdx = menu.indexOf("marketplace");
    const partnersIdx = menu.indexOf("partners");
    expect(marketplaceIdx).toBeGreaterThan(-1);
    expect(partnersIdx).toBeGreaterThan(marketplaceIdx);
    expect(menu).toHaveLength(17);
  });

  it("trainer menu excludes payments, partners, marketplace, and club page", () => {
    const menu = getSidebarMenuItems("trainer");
    expect(menu).toContain("members");
    expect(menu).toContain("trainings");
    expect(menu).not.toContain("payments");
    expect(menu).not.toContain("partners");
    expect(menu).not.toContain("marketplace");
    expect(menu).not.toContain("club_page");
  });

  it("unknown role gets minimal safe menu", () => {
    const menu = getSidebarMenuItems("not-a-real-role");
    expect(menu).toEqual(["dashboard", "messages", "settings", "support"]);
  });
});

describe("resolveDashboardRole", () => {
  it("elevates legacy admin to club_admin", () => {
    expect(resolveDashboardRole("admin", [])).toBe("club_admin");
  });

  it("merges assignments using highest privilege", () => {
    expect(
      resolveDashboardRole("member", [
        {
          id: "1",
          club_id: "c",
          membership_id: "m",
          role_kind: "sponsor",
          scope: "club",
          scope_team_id: null,
          created_at: "",
        },
      ]),
    ).toBe("sponsor");
  });
});

describe("legacyPermissionsFromRbac bridge", () => {
  it("grants marketplace:view to sponsor without internal sports perms", () => {
    const perms = effectivePermissions("sponsor", []);
    expect(perms).toContain("marketplace:view");
    expect(perms).toContain("marketplace:manage_own_listing");
    expect(perms).toContain("tasks:read");
    expect(perms).not.toContain("partners:read");
    expect(perms).not.toContain("matches:read");
    expect(perms).not.toContain("events:read");
    expect(perms).not.toContain("schedule:read");
  });

  it("grants trainer schedule and matches write", () => {
    const perms = legacyPermissionsFromRbac("trainer");
    expect(perms).toContain("schedule:read");
    expect(perms).toContain("schedule:write");
    expect(perms).toContain("matches:read");
    expect(perms).toContain("matches:write");
    expect(perms).not.toContain("payments:read");
  });
});
