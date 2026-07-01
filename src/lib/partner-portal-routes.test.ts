import { describe, expect, it } from "vitest";
import {
  defaultPartnerPortalPath,
  isPartnerPortalPath,
  normalizePartnerPortalPath,
  PARTNER_PORTAL_ROUTES,
  portalPathImpliedPersonaSlug,
  resolveModuleRoute,
} from "@/lib/partner-portal-routes";
import { resolvePortalSide } from "@/hooks/use-module-gate-role";

describe("partner-portal-routes", () => {
  it("maps external supplier modules to partner URLs", () => {
    expect(resolveModuleRoute("marketplace", "supplier", "supplier")).toBe(
      PARTNER_PORTAL_ROUTES.marketplace,
    );
    expect(resolveModuleRoute("messages", "supplier", "supplier")).toBe(
      PARTNER_PORTAL_ROUTES.messages,
    );
    expect(resolveModuleRoute("ai4t", "supplier", "supplier")).toBe(PARTNER_PORTAL_ROUTES.ai4t);
  });

  it("keeps club modules on internal routes for club roles", () => {
    expect(resolveModuleRoute("marketplace", "club_admin", "club_admin")).toBe("/marketplace");
    expect(resolveModuleRoute("messages", "trainer", "trainer")).toBe("/communication");
  });

  it("detects partner portal paths", () => {
    expect(isPartnerPortalPath("/partner-marketplace")).toBe(true);
    expect(isPartnerPortalPath("/partnermarketplace")).toBe(true);
    expect(isPartnerPortalPath("/supplier-page")).toBe(true);
    expect(isPartnerPortalPath("/marketplace")).toBe(false);
  });

  it("implies persona from dedicated public-page admin URLs", () => {
    expect(portalPathImpliedPersonaSlug("/supplier-page")).toBe("supplier");
    expect(portalPathImpliedPersonaSlug("/club-page-admin")).toBe("club_admin");
    expect(portalPathImpliedPersonaSlug("/members")).toBeNull();
  });

  it("resolves supplier-page as partner portal when gate role is unknown", () => {
    expect(
      resolvePortalSide({
        gateRole: null,
        pathname: "/supplier-page",
        permissionsLoading: false,
      }),
    ).toBe("partner");
  });

  it("resolves club-page-admin as club portal even when gate role is supplier", () => {
    expect(
      resolvePortalSide({
        gateRole: "supplier",
        pathname: "/club-page-admin",
        permissionsLoading: false,
      }),
    ).toBe("club");
  });

  it("normalizes legacy partnermarketplace alias", () => {
    expect(normalizePartnerPortalPath("/partnermarketplace")).toBe("/partner-marketplace");
  });

  it("defaults denied external users to partner marketplace", () => {
    expect(defaultPartnerPortalPath("supplier", "supplier")).toBe("/partner-marketplace");
    expect(defaultPartnerPortalPath("club_admin", "club_admin")).toBe("/dashboard/club_admin");
  });
});
