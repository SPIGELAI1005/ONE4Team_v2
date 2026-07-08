import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendPlatformAuditLog,
  getClubModuleEntitlements,
  getPlatformAuditLogs,
  getPlatformModules,
  getPlatformPlans,
} from "@/lib/platform-catalog";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801093000_platform_catalog_entitlements_audit.sql",
);

describe("platform catalog schema", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("creates the platform catalog and entitlement tables without duplicating subscriptions", () => {
    expect(migration).toContain("create table if not exists public.modules");
    expect(migration).toContain("create table if not exists public.plans");
    expect(migration).toContain("create table if not exists public.plan_modules");
    expect(migration).toContain("create table if not exists public.club_module_entitlements");
    expect(migration).toContain("billing_subscriptions.plan_id");
    expect(migration).not.toContain("create table if not exists public.billing_subscriptions");
  });

  it("seeds default modules and marketing plan keys", () => {
    for (const moduleKey of [
      "public_club_page",
      "team_management",
      "training_calendar",
      "match_management",
      "player_profiles",
      "documents",
      "marketplace",
      "partner_management",
      "payments",
      "communication",
      "statistics",
      "tournament_module",
      "qr_code_module",
      "ai_assistant",
    ]) {
      expect(migration).toContain(moduleKey);
    }

    for (const planKey of ["kickoff", "squad", "pro", "champions", "bespoke"]) {
      expect(migration).toContain(`'${planKey}'`);
    }
  });

  it("extends the existing audit stream and records sensitive changes", () => {
    expect(migration).toContain("alter table public.platform_admin_audit_events");
    expect(migration).toContain("create or replace view public.audit_logs");
    expect(migration).toContain("get_platform_audit_logs");
    expect(migration).toContain("MODULE_ENABLED");
    expect(migration).toContain("MODULE_DISABLED");
    expect(migration).toContain("PLAN_CHANGED");
    expect(migration).toContain("CLUB_STATUS_CHANGED");
    expect(migration).toContain("PLATFORM_USER_CREATED");
    expect(migration).toContain("IMPERSONATION_STARTED");
  });

  it("exports data access helper functions", () => {
    expect(typeof getPlatformModules).toBe("function");
    expect(typeof getPlatformPlans).toBe("function");
    expect(typeof getClubModuleEntitlements).toBe("function");
    expect(typeof appendPlatformAuditLog).toBe("function");
    expect(typeof getPlatformAuditLogs).toBe("function");
  });
});
