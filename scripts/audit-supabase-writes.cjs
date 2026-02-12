#!/usr/bin/env node
/*
Phase 0 audit: Supabase mutations should be properly scoped.

Heuristic rules:
- For club-scoped tables: inserts must include `club_id`, and updates/deletes must include an `.eq("club_id", ...)` filter.
- For parent-scoped tables (event_participants, match_lineups, match_events): updates/deletes must filter by their parent id.
- For match_votes: inserts must include `club_id` and match_id + voter_membership_id.

This is NOT a full SQL/RLS verifier; it's a cheap regression guard.
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

/** Tables where we expect a direct club_id scope. */
const CLUB_SCOPED = new Set([
  "teams",
  "training_sessions",
  "events",
  "matches",
  "competitions",
  "announcements",
  "messages",
  "membership_fee_types",
  "payments",
  "notifications",
  "club_invites",
  "club_invite_requests",
  "achievements",
  "player_match_stats",
  "custom_stat_definitions",
  "season_awards",
  "activities",
  "activity_attendance",
  "membership_dues",
  "partners",
  "ai_requests",
]);

/** Tables scoped by parent id (still tenant-safe if parent is tenant-scoped). */
const PARENT_SCOPED = new Map([
  ["event_participants", { parentKey: "event_id" }],
  ["match_lineups", { parentKey: "match_id" }],
  ["match_events", { parentKey: "match_id" }],
  ["team_players", { parentKey: "team_id" }],
]);

/** Tables we ignore (not supabase / not tenant data). */
const IGNORE_FILES = new Set([
  path.join(SRC, "hooks", "use-toast.ts"),
]);

function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && (p.endsWith(".ts") || p.endsWith(".tsx"))) out.push(p);
  }
  return out;
}

function readLines(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

function containsAny(hay, regs) {
  return regs.some((r) => r.test(hay));
}

function extractChain(lines, startIdx) {
  const out = [];
  for (let i = startIdx; i < lines.length; i++) {
    out.push(lines[i]);
    if (lines[i].includes(";")) break;
  }
  return out.join("\n");
}

function hasObjectLiteralArgument(chain) {
  // naive but works: if insert/update/upsert call includes a `{` soon after
  return /\.(insert|update|upsert)\s*\(\s*\{/.test(chain);
}

function auditFile(file) {
  if (IGNORE_FILES.has(file)) return [];

  const lines = readLines(file);
  /** @type {{file:string,line:number,reason:string,context:string}[]} */
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("supabase.from(")) continue;

    const chain = extractChain(lines, i);

    const tableMatch = chain.match(/supabase\.from\(\s*["']([^"']+)["']\s*\)/);
    const table = tableMatch?.[1];
    if (!table) continue;

    const isInsert = /\.(insert)\s*\(/.test(chain);
    const isUpdate = /\.(update)\s*\(/.test(chain);
    const isDelete = /\.(delete)\s*\(/.test(chain);
    const isUpsert = /\.(upsert)\s*\(/.test(chain);

    if (!isInsert && !isUpdate && !isDelete && !isUpsert) continue;

    // If insert/update/upsert passes a variable (e.g. insert(notifications)), we don't
    // try to validate its contents here (too many false positives). We only validate
    // object-literal inserts.
    const validateBody = isDelete || hasObjectLiteralArgument(chain);

    if (CLUB_SCOPED.has(table)) {
      if ((isInsert || isUpsert) && validateBody) {
        const ok = /\bclub_id\s*:/.test(chain);
        if (!ok) {
          issues.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            reason: `Insert/upsert into ${table} missing club_id (object literal)`,
            context: lines[i].trim(),
          });
        }
      }

      if (isUpdate || isDelete) {
        const ok = containsAny(chain, [
          /\.eq\(\s*["']club_id["']\s*,/,
          /\.in\(\s*["']club_id["']\s*,/,
        ]);
        if (!ok) {
          issues.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            reason: `Update/delete on ${table} missing .eq("club_id", ...) scope`,
            context: lines[i].trim(),
          });
        }
      }

      continue;
    }

    const parent = PARENT_SCOPED.get(table);
    if (parent) {
      if ((isInsert || isUpsert) && validateBody) {
        const ok = new RegExp(`\\b${parent.parentKey}\\s*:`).test(chain);
        if (!ok) {
          issues.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            reason: `Insert/upsert into ${table} missing ${parent.parentKey} (object literal)`,
            context: lines[i].trim(),
          });
        }
      }
      if (isUpdate || isDelete) {
        const ok = new RegExp(`\\.eq\\(\\s*["']${parent.parentKey}["']\\s*,`).test(chain);
        if (!ok) {
          issues.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            reason: `Update/delete on ${table} missing .eq("${parent.parentKey}", ...) scope`,
            context: lines[i].trim(),
          });
        }
      }
      continue;
    }

    if (table === "match_votes") {
      if ((isInsert || isUpsert) && validateBody) {
        const okAll = /\bclub_id\s*:/.test(chain) && /\bmatch_id\s*:/.test(chain) && /\bvoter_membership_id\s*:/.test(chain);
        if (!okAll) {
          issues.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            reason: `match_votes insert/upsert missing club_id/match_id/voter_membership_id (object literal)`,
            context: lines[i].trim(),
          });
        }
      }
      continue;
    }
  }

  return issues;
}

function main() {
  const files = walk(SRC);
  const issues = files.flatMap(auditFile);

  if (issues.length === 0) {
    console.log("audit-supabase-writes: OK");
    return;
  }

  console.error(`audit-supabase-writes: FAIL (${issues.length} issue(s))`);
  for (const it of issues) {
    console.error(`- ${it.file}:${it.line} ${it.reason}`);
    console.error(`  ${it.context}`);
  }
  process.exit(1);
}

main();
