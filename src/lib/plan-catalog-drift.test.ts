/**
 * Fails CI when TypeScript PLAN_CATALOG_SEED drifts from documented commercial ladder.
 * DB seed values are asserted to match the same constants (migration review checklist).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLAN_CATALOG, PLAN_CATALOG_SEED } from "@/lib/plan-catalog";

const MIGRATION = "supabase/migrations/20260804120000_pricing_founding_club_offers.sql";

describe("plan catalogue drift", () => {
  it("PLAN_CATALOG_SEED matches PLAN_CATALOG numeric caps", () => {
    for (const key of ["kickoff", "squad", "pro", "champions"] as const) {
      expect(PLAN_CATALOG_SEED[key].max_users).toBe(PLAN_CATALOG[key].maxMembers);
      expect(PLAN_CATALOG_SEED[key].max_teams).toBe(PLAN_CATALOG[key].maxTeams);
      expect(PLAN_CATALOG_SEED[key].max_storage_mb).toBe(PLAN_CATALOG[key].maxStorageMb);
      expect(PLAN_CATALOG_SEED[key].max_admins).toBe(PLAN_CATALOG[key].maxAdmins);
      expect(PLAN_CATALOG_SEED[key].price_monthly).toBe(PLAN_CATALOG[key].basePrice.monthly);
    }
  });

  it("founding-club migration encodes the same caps", () => {
    const sql = readFileSync(join(process.cwd(), MIGRATION), "utf8");
    expect(sql).toContain("max_users = 500");
    expect(sql).toContain("max_teams = 10");
    expect(sql).toContain("max_storage_mb = 1024");
    expect(sql).toContain("max_admins = 3");
    expect(sql).toContain("max_users = 1000");
    expect(sql).toContain("max_teams = 30");
    expect(sql).toContain("max_users = 2000");
    expect(sql).toContain("max_teams = 100");
    expect(sql).toContain("max_users = 5000");
    expect(sql).toContain("max_teams = 250");
    expect(sql).toContain("ONE4Team-Founding-Club-12M");
    expect(sql).toContain("redeem_commercial_offer");
  });
});
