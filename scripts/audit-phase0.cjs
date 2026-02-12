#!/usr/bin/env node
/* Run all Phase 0 audits */

const { spawnSync } = require("child_process");
const path = require("path");

const scripts = ["audit-realtime.cjs", "audit-supabase-writes.cjs", "audit-supabase-selects.cjs"];

for (const s of scripts) {
  const p = path.join(__dirname, s);
  const res = spawnSync(process.execPath, [p], { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

console.log("audit-phase0: OK");
