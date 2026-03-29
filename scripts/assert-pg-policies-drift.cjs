#!/usr/bin/env node
/**
 * Optional drift check: compare policy *names* from repo migrations to a snapshot file
 * produced from the database (one policy name per line).
 *
 * Generate snapshot (run against staging/prod with SQL access):
 *   psql "$DATABASE_URL" -Atc "select policyname from pg_policies where schemaname='public' order by 1" > ops/pg_policies.snapshot.txt
 *
 * Compare:
 *   PG_POLICIES_SNAPSHOT_FILE=ops/pg_policies.snapshot.txt node scripts/assert-pg-policies-drift.cjs
 *
 * Without PG_POLICIES_SNAPSHOT_FILE, exits 0 (no-op for CI).
 */

const fs = require("fs");
const path = require("path");

function fail(msg) {
  console.error(`pg_policies drift: ${msg}`);
  process.exit(1);
}

function scanMigrationPolicyNames() {
  const dir = path.join(__dirname, "..", "supabase", "migrations");
  const names = new Set();
  if (!fs.existsSync(dir)) return names;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".sql")) continue;
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const re = /create\s+policy\s+"([^"]+)"\s+on/gi;
    let m;
    while ((m = re.exec(text))) names.add(m[1]);
    const re2 = /create\s+policy\s+([a-z_][a-z0-9_]*)\s+on/gi;
    while ((m = re2.exec(text))) names.add(m[1]);
  }
  return names;
}

const snapPath = (process.env.PG_POLICIES_SNAPSHOT_FILE || "").trim();
if (!snapPath) {
  console.log("pg_policies drift: skip (set PG_POLICIES_SNAPSHOT_FILE to enable)");
  process.exit(0);
}

const fullSnap = path.isAbsolute(snapPath) ? snapPath : path.join(__dirname, "..", snapPath);
if (!fs.existsSync(fullSnap)) fail(`snapshot file missing: ${fullSnap}`);

const fromDb = new Set(
  fs
    .readFileSync(fullSnap, "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean),
);
const fromMigrations = scanMigrationPolicyNames();

const onlyInDb = [...fromDb].filter((n) => !fromMigrations.has(n)).sort();
const onlyInMigrations = [...fromMigrations].filter((n) => !fromDb.has(n)).sort();

if (onlyInDb.length || onlyInMigrations.length) {
  console.error("Policy name mismatch (migration extract vs DB snapshot):");
  if (onlyInDb.length) console.error("  only in DB:", onlyInDb.join(", "));
  if (onlyInMigrations.length) console.error("  only in migrations (unquoted CREATE POLICY may be missed):", onlyInMigrations.join(", "));
  process.exit(1);
}

console.log("pg_policies drift: OK (names match snapshot).");
