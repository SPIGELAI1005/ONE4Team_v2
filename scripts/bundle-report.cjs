/*
  Simple bundle report without extra deps.
  Usage:
    npm run build
    node scripts/bundle-report.cjs
*/

const fs = require("node:fs");
const path = require("node:path");

const distDir = path.resolve("dist");
const assetsDir = path.join(distDir, "assets");

function fmt(bytes) {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run npm run build first.");
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  console.error("dist/assets not found. Something is off with the build output.");
  process.exit(1);
}

const files = fs
  .readdirSync(assetsDir)
  .map((f) => ({
    file: `assets/${f}`,
    full: path.join(assetsDir, f),
  }))
  .filter((x) => fs.statSync(x.full).isFile())
  .map((x) => ({
    file: x.file,
    bytes: fs.statSync(x.full).size,
  }))
  .sort((a, b) => b.bytes - a.bytes);

const total = files.reduce((sum, f) => sum + f.bytes, 0);

console.log("\nBundle report (dist/assets)");
console.log(`Total assets size: ${fmt(total)} (${total} bytes)`);
console.log("Top 15 files:");

for (const f of files.slice(0, 15)) {
  console.log(`- ${fmt(f.bytes).padStart(10)}  ${f.file}`);
}

console.log("");
