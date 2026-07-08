import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OPERATOR_NAV_ITEMS } from "@/lib/operator-nav";
import {
  OPERATOR_ROLE_PERMISSIONS,
  buildOperatorAccess,
  getDefaultOperatorPermissions,
  hasOperatorPermission,
  normalizeOperatorRole,
  type OperatorPermission,
  type OperatorRole,
} from "@/lib/operator-permissions";

const foundationMigration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260801090000_operator_control_center_foundation.sql"),
  "utf8",
);

const catalogAuditMigration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260801093000_platform_catalog_entitlements_audit.sql"),
  "utf8",
);

const moduleEntitlementsMigration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260801103000_operator_club_module_entitlements.sql"),
  "utf8",
);

const catalogAdminMigration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260801110000_operator_modules_plans_management.sql"),
  "utf8",
);

const CLUB_DASHBOARD_ROLES = [
  "club_admin",
  "admin",
  "trainer",
  "coach",
  "player",
  "parent",
  "partner",
  "member",
] as const;

function accessFor(role: OperatorRole) {
  return buildOperatorAccess({ is_platform_user: true, role, status: "ACTIVE" });
}

function canAccessRoute(role: OperatorRole, permission: OperatorPermission): boolean {
  const access = accessFor(role);
  return access.isOperator && hasOperatorPermission(access, permission);
}

describe("operator control center security", () => {
  describe("unauthorized and club dashboard roles", () => {
    it("denies users without a platform row", () => {
      expect(buildOperatorAccess(null).isOperator).toBe(false);
      expect(buildOperatorAccess({ is_platform_user: false, role: "OWNER", status: "ACTIVE" }).isOperator).toBe(
        false,
      );
    });

    it("denies disabled platform users even when role is OWNER", () => {
      const access = buildOperatorAccess({ is_platform_user: true, role: "OWNER", status: "DISABLED" });
      expect(access.isOperator).toBe(false);
      expect(access.permissions).toEqual([]);
    });

    it("does not treat club dashboard roles as platform roles", () => {
      for (const clubRole of CLUB_DASHBOARD_ROLES) {
        expect(normalizeOperatorRole(clubRole)).toBeNull();
      }
    });

    it("keeps platform access independent from club RBAC in the foundation migration", () => {
      expect(foundationMigration).toContain("Club Admin, Trainer");
      expect(foundationMigration).toContain("using (false)");
      expect(foundationMigration).toContain("require_platform_access");
    });
  });

  describe("platform role permission matrix", () => {
    it("grants OWNER every operator permission including access management", () => {
      const owner = accessFor("OWNER");
      for (const permission of getDefaultOperatorPermissions("OWNER")) {
        expect(hasOperatorPermission(owner, permission)).toBe(true);
      }
      expect(hasOperatorPermission(owner, "operator.access.manage")).toBe(true);
    });

    it("allows OPERATOR to manage modules and plans but not platform access", () => {
      const operator = accessFor("OPERATOR");
      expect(hasOperatorPermission(operator, "operator.modules.manage")).toBe(true);
      expect(hasOperatorPermission(operator, "operator.plans.manage")).toBe(true);
      expect(hasOperatorPermission(operator, "operator.clubs.manage")).toBe(true);
      expect(hasOperatorPermission(operator, "operator.access.manage")).toBe(false);
    });

    it("keeps SUPPORT read-oriented without module or plan management", () => {
      const support = accessFor("SUPPORT");
      expect(hasOperatorPermission(support, "operator.support.use")).toBe(true);
      expect(hasOperatorPermission(support, "operator.clubs.read")).toBe(true);
      expect(hasOperatorPermission(support, "operator.modules.manage")).toBe(false);
      expect(hasOperatorPermission(support, "operator.plans.manage")).toBe(false);
      expect(hasOperatorPermission(support, "operator.analytics.read")).toBe(false);
    });

    it("allows VIEWER to read analytics and settings but not mutate modules or use support tools", () => {
      const viewer = accessFor("VIEWER");
      expect(hasOperatorPermission(viewer, "operator.analytics.read")).toBe(true);
      expect(hasOperatorPermission(viewer, "operator.settings.read")).toBe(true);
      expect(hasOperatorPermission(viewer, "operator.modules.manage")).toBe(false);
      expect(hasOperatorPermission(viewer, "operator.plans.manage")).toBe(false);
      expect(hasOperatorPermission(viewer, "operator.support.use")).toBe(false);
    });

    it("matches the seeded role-permission table for every platform role", () => {
      for (const role of Object.keys(OPERATOR_ROLE_PERMISSIONS) as OperatorRole[]) {
        const access = accessFor(role);
        expect(access.permissions).toEqual(getDefaultOperatorPermissions(role));
      }
    });
  });

  describe("operator route access expectations", () => {
    it("requires a specific permission for every operator nav route", () => {
      expect(OPERATOR_NAV_ITEMS.length).toBeGreaterThan(0);
      for (const item of OPERATOR_NAV_ITEMS) {
        expect(item.permission).toMatch(/^operator\./);
      }
    });

    it("blocks VIEWER from support-only routes", () => {
      expect(canAccessRoute("VIEWER", "operator.support.use")).toBe(false);
    });

    it("blocks SUPPORT from analytics while allowing support tools", () => {
      expect(canAccessRoute("SUPPORT", "operator.support.use")).toBe(true);
      expect(canAccessRoute("SUPPORT", "operator.analytics.read")).toBe(false);
    });

    it("allows OPERATOR to reach module management permissions used by club detail", () => {
      expect(canAccessRoute("OPERATOR", "operator.modules.manage")).toBe(true);
      expect(canAccessRoute("OPERATOR", "operator.plans.manage")).toBe(true);
    });
  });

  describe("server-side RPC guards (not UI-only)", () => {
    it("protects operator read RPCs with require_platform_permission", () => {
      expect(foundationMigration).toContain("require_platform_permission");
      expect(readFileSync(
        path.resolve(process.cwd(), "supabase/migrations/20260801094500_operator_platform_overview.sql"),
        "utf8",
      )).toContain("require_platform_permission('operator.overview.read')");
    });

    it("requires operator.modules.manage for club module entitlement mutations", () => {
      expect(moduleEntitlementsMigration).toContain(
        "require_platform_permission('operator.modules.manage')",
      );
      expect(moduleEntitlementsMigration).toContain("Reason is required.");
    });

    it("requires operator.plans.manage for plan-module mapping mutations", () => {
      expect(catalogAdminMigration).toContain("require_platform_permission('operator.plans.manage')");
      expect(catalogAdminMigration).toContain("Reason is required.");
    });

    it("restricts catalog plan record edits to OWNER even when plans.manage is granted", () => {
      expect(catalogAdminMigration).toContain("Only OWNER can create or edit plans.");
      expect(catalogAdminMigration).toContain("Only OWNER can create or edit modules.");
    });

    it("denies direct reads of platform_users for authenticated clients", () => {
      expect(foundationMigration).toContain("platform_users_no_direct_select");
      expect(foundationMigration).toContain("using (false)");
    });
  });

  describe("audit log contracts for sensitive mutations", () => {
    it("audits module enable and disable changes", () => {
      expect(moduleEntitlementsMigration).toContain("MODULE_ENABLED");
      expect(moduleEntitlementsMigration).toContain("MODULE_DISABLED");
      expect(moduleEntitlementsMigration).toContain("append_audit_log");
    });

    it("audits platform catalog plan and plan-module changes", () => {
      expect(catalogAuditMigration).toContain("PLAN_CHANGED");
      expect(catalogAdminMigration).toContain("PLAN_MODULE_CHANGED");
      expect(catalogAdminMigration).toContain("app.platform_audit_reason");
    });

    it("audits club status changes at the database layer", () => {
      expect(catalogAuditMigration).toContain("CLUB_STATUS_CHANGED");
      expect(catalogAuditMigration).toContain("audit_clubs_status_change");
    });

    it("documents platform user lifecycle audit actions", () => {
      expect(catalogAuditMigration).toContain("PLATFORM_USER_CREATED");
      expect(catalogAuditMigration).toContain("PLATFORM_USER_DISABLED");
      expect(catalogAuditMigration).toContain("audit_platform_users_change");
    });
  });

  describe("settings and club controls migration", () => {
    const settingsMigration = readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20260801170000_operator_settings_and_club_controls.sql"),
      "utf8",
    );

    it("extends platform user audit actions and OWNER-only RPCs", () => {
      expect(settingsMigration).toContain("PLATFORM_USER_ROLE_CHANGED");
      expect(settingsMigration).toContain("PLATFORM_USER_ENABLED");
      expect(settingsMigration).toContain("get_platform_users");
      expect(settingsMigration).toContain("require_platform_owner");
    });

    it("protects club lifecycle mutations", () => {
      expect(settingsMigration).toContain("set_operator_club_status");
      expect(settingsMigration).toContain("set_operator_club_plan");
      expect(settingsMigration).toContain("operator.clubs.manage");
    });
  });
});
