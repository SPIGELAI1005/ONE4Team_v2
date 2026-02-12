#!/usr/bin/env node
/*
Phase 0 audit: Supabase SELECTs should be properly scoped.

This is a heuristic regression guard (not a security guarantee).

Rules (heuristic):
- For club-scoped tables: any `select()` chain must include a tenant scope filter:
  - `.eq("club_id", ...)` OR `.in("club_id", ...)` OR `.filter("club_id", ...)` OR `.or(` with a `club_id` clause.
- For user-private tables: allow `.eq("user_id", ...)` for profiles/notifications.
- For join-y fetches, we still expect club scope for the base table when it has club_id.

If this script flags a legitimate query, either:
- add explicit club scoping (preferred), or
- add a narrow allowlist entry with a comment.
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

/** Tables where we expect direct club scoping on reads. */
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

/** Tables that are safely scoped via a parent id (still tenant-safe if parent is tenant-scoped). */
const PARENT_SCOPED = new Map([
  ["match_events", { keys: ["match_id"] }],
  ["match_lineups", { keys: ["match_id"] }],
  ["team_players", { keys: ["team_id"] }],
  // event_participants: membership_id is globally unique; event_id is also acceptable
  ["event_participants", { keys: ["event_id", "membership_id"] }],
]);

/** Tables where user_id scoping is acceptable (even if club_id also exists). */
const USER_PRIVATE_OK = new Set(["profiles"]);

/**
 * Allowlist specific files/lines to reduce false positives.
 * Format: { [relativeFilePath]: Set([lineNumber, ...]) }
 */
const ALLOWLIST = {
  // Example:
  // "src/pages/ClubPage.tsx": new Set([123]),
};

function walk(dir) {
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

function extractChain(lines, startIdx) {
  const out = [];
  for (let i = startIdx; i < lines.length; i++) {
    out.push(lines[i]);
    if (lines[i].includes(";")) break;
  }
  return out.join("\n");
}

function hasClubScope(chain) {
  return [
    /\.eq\(\s*["']club_id["']\s*,/,
    /\.in\(\s*["']club_id["']\s*,/,
    /\.filter\(\s*["']club_id["']\s*,/,
    // `.or(` containing club_id clause
    /\.or\(\s*["'][^"']*club_id\./,
  ].some((r) => r.test(chain));
}

function hasUserScope(chain) {
  return /\.eq\(\s*["']user_id["']\s*,/.test(chain);
}

function auditFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const allow = ALLOWLIST[rel];

  const lines = readLines(file);
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("supabase.from(")) continue;

    const chain = extractChain(lines, i);

    const tableMatch = chain.match(/supabase\.from\(\s*["']([^"']+)["']\s*\)/);
    const table = tableMatch?.[1];
    if (!table) continue;

    // Only check select chains (and ignore mutation chains that call .select() to return inserted rows)
    if (!/\.select\s*\(/.test(chain)) continue;
    if (/\.(insert|update|upsert|delete)\s*\(/.test(chain)) continue;

    // If allowlisted, skip
    if (allow && allow.has(i + 1)) continue;

    // Don’t require club scope for non-tenant tables.
    if (!CLUB_SCOPED.has(table) && !PARENT_SCOPED.has(table) && !USER_PRIVATE_OK.has(table)) continue;

    // profiles can be scoped by user_id
    if (USER_PRIVATE_OK.has(table)) {
      if (!hasUserScope(chain)) {
        issues.push({
          file: rel,
          line: i + 1,
          reason: `Select from ${table} missing .eq(\"user_id\", ...) scope`,
          context: lines[i].trim(),
        });
      }
      continue;
    }

    // parent scoped
    const parent = PARENT_SCOPED.get(table);
    if (parent) {
      const okParent = parent.keys.some(
        (k) => new RegExp(`\\.eq\\(\\s*[\"']${k}[\"']\\s*,`).test(chain) || new RegExp(`\\.in\\(\\s*[\"']${k}[\"']\\s*,`).test(chain),
      );
      if (!okParent && !hasClubScope(chain)) {
        issues.push({
          file: rel,
          line: i + 1,
          reason: `Select from ${table} missing parent scope (${parent.keys.join(" or ")}) or club_id scope`,
          context: lines[i].trim(),
        });
      }
      continue;
    }

    // club scoped
    if (!hasClubScope(chain)) {
      issues.push({
        file: rel,
        line: i + 1,
        reason: `Select from ${table} missing club_id scope (.eq/.in/.filter/.or)`,
        context: lines[i].trim(),
      });
    }
  }

  return issues;
}

function main() {
  const files = walk(SRC);
  const issues = files.flatMap(auditFile);

  if (issues.length === 0) {
    console.log("audit-supabase-selects: OK");
    return;
  }

  console.error(`audit-supabase-selects: FAIL (${issues.length} issue(s))`);
  for (const it of issues) {
    console.error(`- ${it.file}:${it.line}  ${it.reason}`);
    console.error(`  ${it.context}`);
  }
  process.exit(1);
}

main();
