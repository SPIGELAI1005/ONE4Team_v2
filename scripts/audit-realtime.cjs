#!/usr/bin/env node
/*
Phase 0 audit: Supabase realtime subscriptions must be tenant-scoped.

Rule (heuristic): any `.on("postgres_changes", { ... })` must include `filter:`
unless the table is explicitly allowlisted.

Why heuristic: we want a cheap regression guard that catches obvious leaks.
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ALLOWLIST_TABLES = new Set([
  // Intentionally public subscriptions can go here (currently none).
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

/**
 * Very small parser: find lines containing `postgres_changes` and look ahead.
 */
function auditFile(file) {
  const lines = readLines(file);
  /** @type {{file:string,line:number,reason:string,context:string}[]} */
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("postgres_changes")) continue;

    const start = Math.max(0, i - 3);
    const end = Math.min(lines.length - 1, i + 25);
    const window = lines.slice(start, end + 1).join("\n");

    // Ignore if there's a filter key anywhere in the subscription options.
    if (/filter\s*:/.test(window)) continue;

    // If we can detect an allowlisted table, skip.
    const m = window.match(/table\s*:\s*["']([^"']+)["']/);
    const table = m?.[1] ?? null;
    if (table && ALLOWLIST_TABLES.has(table)) continue;

    issues.push({
      file: path.relative(ROOT, file),
      line: i + 1,
      reason: `Realtime subscription missing filter (table=${table ?? "unknown"})`,
      context: lines[i].trim(),
    });
  }

  return issues;
}

function main() {
  const files = walk(SRC);
  const issues = files.flatMap(auditFile);

  if (issues.length === 0) {
    console.log("audit-realtime: OK");
    return;
  }

  console.error(`audit-realtime: FAIL (${issues.length} issue(s))`);
  for (const it of issues) {
    console.error(`- ${it.file}:${it.line} ${it.reason}`);
    console.error(`  ${it.context}`);
  }
  process.exit(1);
}

main();
