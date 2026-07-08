import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getOperatorClubDetail } from "@/lib/operator-club-detail";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801100000_operator_club_detail.sql",
);

describe("operator club detail", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("defines a protected club detail RPC for internal operator use", () => {
    expect(migration).toContain("create or replace function public.get_operator_club_detail(_club_id uuid)");
    expect(migration).toContain("create or replace function public.get_operator_clubs()");
    expect(migration).toContain("require_platform_permission('operator.clubs.read')");
    expect(migration).toContain("support_notes");
    expect(migration).toContain("page_views_available");
  });

  it("returns club-scoped operator data without relying on club membership", () => {
    expect(migration).toContain("from public.clubs c");
    expect(migration).toContain("from public.club_memberships cm");
    expect(migration).toContain("from public.audit_logs");
    expect(migration).toContain("join auth.users u on u.id = cm.user_id");
    expect(migration).not.toContain("is_club_admin");
    expect(migration).not.toContain("is_member");
  });

  it("exports operator club detail data access helper", () => {
    expect(typeof getOperatorClubDetail).toBe("function");
  });
});
