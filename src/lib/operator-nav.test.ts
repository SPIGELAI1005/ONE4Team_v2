import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { DASHBOARD_MODULES } from "@/lib/rbac-config";
import {
  getOperatorNavItems,
  getOperatorNavItem,
  getOperatorSectionTitle,
  isOperatorPath,
  operatorRouteTransitionKey,
} from "@/lib/operator-nav";

describe("operator navigation", () => {
  it("recognizes only the isolated operator route tree", () => {
    expect(isOperatorPath("/operator")).toBe(true);
    expect(isOperatorPath("/operator/clubs/club-id")).toBe(true);
    expect(isOperatorPath("/dashboard/club_admin")).toBe(false);
    expect(isOperatorPath("/club/tsv-allach")).toBe(false);
  });

  it("uses a stable transition key inside the operator shell", () => {
    expect(operatorRouteTransitionKey("/operator")).toBe("__operator_shell__");
    expect(operatorRouteTransitionKey("/operator/clubs/club-id")).toBe("__operator_shell__");
    expect(operatorRouteTransitionKey("/members")).toBe("/members");
  });

  it("keeps operator navigation out of club dashboard modules", () => {
    expect(DASHBOARD_MODULES).not.toContain("operator" as never);
    expect(DASHBOARD_MODULES).not.toContain("platform_admin" as never);
    expect(getOperatorNavItems(en).map((item) => item.path)).toEqual([
      "/operator",
      "/operator/clubs",
      "/operator/users",
      "/operator/modules",
      "/operator/analytics",
      "/operator/financials",
      "/operator/marketplace",
      "/operator/performance",
      "/operator/issues",
      "/operator/audit",
      "/operator/support",
      "/operator/legal",
      "/operator/settings",
    ]);
  });

  it("resolves operator route titles and permissions", () => {
    expect(getOperatorSectionTitle("/operator", en)).toBe("Overview");
    expect(getOperatorSectionTitle("/operator/modules", en)).toBe("Modules & Plans");
    expect(getOperatorNavItem("/operator", en)?.permission).toBe("operator.overview.read");
    expect(getOperatorNavItem("/operator/support", en)?.permission).toBe("operator.support.use");
    expect(getOperatorNavItem("/operator/settings", en)?.permission).toBe("operator.settings.read");
  });
});
