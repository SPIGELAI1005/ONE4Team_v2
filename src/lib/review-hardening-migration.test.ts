import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20260816120000_review_hardening_family_calendar_reminders.sql",
  ),
  "utf8",
);
const lintFixMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20260816130000_team_ops_db_lint_fixes.sql",
  ),
  "utf8",
);

describe("post-review hardening migration", () => {
  it("allows guardians to read linked ward memberships", () => {
    expect(migration).toContain(
      'create policy "Guardians can view linked ward memberships"',
    );
    expect(migration).toContain("public.is_guardian_for_member(auth.uid(), id)");
  });

  it("scopes non-staff roster search to self and wards", () => {
    expect(migration).toContain("v_full_roster");
    expect(migration).toContain("or cm.user_id = v_uid");
    expect(migration).toContain("or public.is_guardian_for_member(v_uid, cm.id)");
  });

  it("keeps the guardian role mutator trigger-internal", () => {
    expect(migration).toContain(
      "revoke all on function public.ensure_guardian_parent_role(uuid, uuid) from authenticated",
    );
    expect(migration).not.toContain(
      "grant execute on function public.ensure_guardian_parent_role(uuid, uuid) to authenticated",
    );
  });

  it("authorizes calendar scopes and serializes capacity", () => {
    expect(migration).toContain("'club_scope_forbidden'");
    expect(migration).toContain("'team_scope_forbidden'");
    expect(migration).toContain("for update;");
    expect(migration).toContain("trg_enforce_activity_attendance_capacity");
  });

  it("applies notification preferences to reminder recipients", () => {
    expect(migration).toContain("club_pref.training_reminders");
    expect(migration).toContain("club_pref.match_reminders");
    expect(migration).toContain("club_pref.email");
    expect(lintFixMigration).toContain("left join auth.users u on u.id = cm.user_id");
    expect(lintFixMigration).toContain("trim(u.email)");
    expect(lintFixMigration).toContain(
      "on conflict (user_id, club_id) where club_id is not null",
    );
  });
});
