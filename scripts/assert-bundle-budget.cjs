#!/usr/bin/env node
/**
 * ST-012: Fail CI when built asset sizes regress beyond budgets.
 * Requires `npm run build` first (dist/assets).
 *
 * Env overrides:
 *   BUNDLE_MAX_SINGLE_FILE_BYTES (default 2_621_440 = 2.5 MiB)
 *   BUNDLE_MAX_TOTAL_ASSETS_BYTES (default 18_874_368 = 18 MiB)
 */
const fs = require("node:fs");
const path = require("node:path");

const distDir = path.resolve("dist");
const assetsDir = path.join(distDir, "assets");

const maxSingle = Number(process.env.BUNDLE_MAX_SINGLE_FILE_BYTES ?? 2_621_440);
const maxTotal = Number(process.env.BUNDLE_MAX_TOTAL_ASSETS_BYTES ?? 18_874_368);

function main() {
  if (!fs.existsSync(assetsDir)) {
    console.error("assert-bundle-budget: dist/assets missing — run `npm run build` first.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(assetsDir)
    .map((f) => path.join(assetsDir, f))
    .filter((p) => fs.statSync(p).isFile())
    .map((full) => ({ rel: path.relative(distDir, full).replace(/\\/g, "/"), bytes: fs.statSync(full).size }));

  const total = files.reduce((s, f) => s + f.bytes, 0);
  const overs = files.filter((f) => f.bytes > maxSingle).sort((a, b) => b.bytes - a.bytes);

  let failed = false;
  if (total > maxTotal) {
    console.error(
      `assert-bundle-budget: total assets ${total} bytes exceed budget ${maxTotal} (set BUNDLE_MAX_TOTAL_ASSETS_BYTES to adjust).`,
    );
    failed = true;
  }
  if (overs.length) {
    console.error(`assert-bundle-budget: ${overs.length} file(s) exceed single-file budget ${maxSingle} bytes:`);
    for (const f of overs.slice(0, 10)) {
      console.error(`  - ${f.rel}: ${f.bytes}`);
    }
    failed = true;
  }

  if (failed) process.exit(1);

  console.log(
    `assert-bundle-budget: OK (total ${total} bytes, max single ${Math.max(...files.map((f) => f.bytes), 0)} bytes)`,
  );
}

main();
