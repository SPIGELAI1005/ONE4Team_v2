import { describe, expect, it } from "vitest";
import {
  buildOperatorAccess,
  getDefaultOperatorPermissions,
  hasOperatorPermission,
  normalizeOperatorPermissions,
  normalizeOperatorRole,
} from "@/lib/operator-permissions";

describe("operator permissions", () => {
  it("maps the legacy platform-admin boolean to owner access", () => {
    const access = buildOperatorAccess(true);

    expect(access.isOperator).toBe(true);
    expect(access.role).toBe("OWNER");
    expect(access.permissions).toContain("operator.access.manage");
  });

  it("normalizes explicit operator access payloads", () => {
    const access = buildOperatorAccess({
      is_platform_user: true,
      role: "Support",
      status: "ACTIVE",
      email: "support@one4team.test",
      permissions: ["operator.clubs.read", "operator.support.use", "members:read"],
    });

    expect(access).toEqual({
      isOperator: true,
      role: "SUPPORT",
      permissions: ["operator.clubs.read", "operator.support.use"],
      email: "support@one4team.test",
      status: "ACTIVE",
    });
  });

  it("falls back to role permissions when no explicit permission list is supplied", () => {
    const access = buildOperatorAccess({ is_platform_user: true, role: "OPERATOR", status: "ACTIVE" });

    expect(access.permissions).toEqual(getDefaultOperatorPermissions("OPERATOR"));
    expect(hasOperatorPermission(access, "operator.modules.manage")).toBe(true);
    expect(hasOperatorPermission(access, "operator.access.manage")).toBe(false);
  });

  it("keeps support and viewer roles read-oriented", () => {
    const support = buildOperatorAccess({ is_platform_user: true, role: "SUPPORT", status: "ACTIVE" });
    const viewer = buildOperatorAccess({ is_platform_user: true, role: "VIEWER", status: "ACTIVE" });

    expect(hasOperatorPermission(support, "operator.support.use")).toBe(true);
    expect(hasOperatorPermission(support, "operator.modules.manage")).toBe(false);
    expect(hasOperatorPermission(viewer, "operator.analytics.read")).toBe(true);
    expect(hasOperatorPermission(viewer, "operator.support.use")).toBe(false);
    expect(hasOperatorPermission(viewer, "operator.settings.read")).toBe(true);
  });

  it("rejects club-dashboard roles and unrelated permissions", () => {
    expect(normalizeOperatorRole("club_admin")).toBeNull();
    expect(normalizeOperatorRole("trainer")).toBeNull();
    expect(normalizeOperatorRole("player")).toBeNull();
    expect(normalizeOperatorRole("parent")).toBeNull();
    expect(normalizeOperatorRole("partner")).toBeNull();
    expect(normalizeOperatorPermissions(["operator.clubs.read", "payments:write"])).toEqual([
      "operator.clubs.read",
    ]);
  });

  it("denies access when the user is not a platform user", () => {
    const access = buildOperatorAccess({
      is_platform_user: false,
      role: "admin",
      status: "ACTIVE",
    });

    expect(access.isOperator).toBe(false);
    expect(hasOperatorPermission(access, "operator.overview.read")).toBe(false);
  });

  it("denies disabled platform users by default", () => {
    const access = buildOperatorAccess({ is_platform_user: true, role: "OWNER", status: "DISABLED" });

    expect(access.isOperator).toBe(false);
    expect(access.permissions).toEqual([]);
  });
});
