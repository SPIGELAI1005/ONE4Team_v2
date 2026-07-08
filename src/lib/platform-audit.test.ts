import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { en } from "@/i18n/en";
import {
  createAuditLog,
  createClubAuditLog,
  createModuleAuditLog,
  createPlanAuditLog,
  formatAuditAction,
  formatAuditEntityType,
  formatAuditJson,
  formatAuditTimestamp,
  getOperatorAuditTrail,
} from "@/lib/platform-audit";
import { rowsToCsv } from "@/lib/csv-export";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801113000_operator_audit_trail.sql",
);

describe("operator audit trail", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines a filtered audit trail RPC with enriched fields", () => {
    expect(migration).toContain("create or replace function public.get_operator_audit_trail(");
    expect(migration).toContain("require_platform_permission('operator.audit.read')");
    expect(migration).toContain("entity_name");
    expect(migration).toContain("club_name");
    expect(migration).toContain("resolve_audit_entity_name");
  });

  it("masks technical metadata for non-owner roles", () => {
    expect(migration).toContain("case when is_owner then filtered.ip_address::text else null end");
    expect(migration).toContain("case when is_owner then filtered.user_agent else null end");
  });

  it("exports reusable audit helpers and csv export", () => {
    expect(typeof createAuditLog).toBe("function");
    expect(typeof createClubAuditLog).toBe("function");
    expect(typeof createModuleAuditLog).toBe("function");
    expect(typeof createPlanAuditLog).toBe("function");
    expect(typeof getOperatorAuditTrail).toBe("function");
    expect(formatAuditTimestamp(null)).toBe("—");
    expect(formatAuditJson({ enabled: true })).toContain('"enabled": true');
    expect(rowsToCsv([{ id: "1", action: "MODULE_ENABLED" }])).toContain("MODULE_ENABLED");
  });

  it("localizes audit actions and entity types", () => {
    expect(formatAuditAction("MODULE_ENABLED", en)).toBe("Module enabled");
    expect(formatAuditAction("MODULE_ENABLED", de)).toBe("Modul aktiviert");
    expect(formatAuditEntityType("club_module_entitlement", de)).toBe("Vereins-Modulberechtigung");
  });
});
