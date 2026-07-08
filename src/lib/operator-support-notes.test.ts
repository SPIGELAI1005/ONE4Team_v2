import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatSupportNoteCategory,
  getOperatorClubSupportNotes,
  SUPPORT_NOTE_CATEGORIES,
} from "@/lib/operator-support-notes";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260801150000_operator_support_notes.sql",
);

describe("operator support notes migration", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("creates the internal support_notes table", () => {
    expect(migration).toContain("create table if not exists public.support_notes");
    expect(migration).toContain("club_id uuid not null");
    expect(migration).toContain("author_user_id uuid not null");
    expect(migration).toContain("author_email text not null");
    expect(migration).toContain("is_archived boolean not null default false");
    expect(migration).toContain("support_notes_no_direct_access");
  });

  it("exposes guarded RPCs with role-aware permissions", () => {
    expect(migration).toContain("get_operator_club_support_notes");
    expect(migration).toContain("create_operator_support_note");
    expect(migration).toContain("update_operator_support_note");
    expect(migration).toContain("archive_operator_support_note");
    expect(migration).toContain("Only OWNER can archive support notes");
    expect(migration).toContain("OWNER, OPERATOR, and SUPPORT");
  });

  it("writes audit actions for support note lifecycle", () => {
    expect(migration).toContain("'SUPPORT_NOTE_CREATED'");
    expect(migration).toContain("'SUPPORT_NOTE_UPDATED'");
    expect(migration).toContain("'SUPPORT_NOTE_ARCHIVED'");
    expect(migration).toContain("append_audit_log");
  });
});

describe("operator support notes helpers", () => {
  it("lists the supported categories", () => {
    expect(SUPPORT_NOTE_CATEGORIES.map((item) => item.key)).toContain("billing");
    expect(formatSupportNoteCategory("feature_request")).toBe("Feature Request");
  });

  it("exports support notes data access helpers", () => {
    expect(typeof getOperatorClubSupportNotes).toBe("function");
  });
});
