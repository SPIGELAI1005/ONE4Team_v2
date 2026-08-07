/**
 * Count physical lines under src/ for Operator financials baseline.
 * Writes src/generated/app-loc.json (committed + regenerated on prebuild).
 *
 * Usage: node scripts/count-app-loc.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const OUT_FILE = path.join(SRC_DIR, "generated", "app-loc.json");

const INCLUDE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".mjs", ".cjs"]);
const EXCLUDE_DIR_NAMES = new Set(["node_modules", "dist", "coverage", ".git"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
      walk(full, files);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!INCLUDE_EXT.has(ext)) continue;
    // Skip the generated snapshot itself from the count.
    if (full === OUT_FILE) continue;
    files.push(full);
  }
  return files;
}

function countLines(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  if (!text) return 0;
  // Physical lines (including blanks/comments), matching historical operator baseline style.
  return text.split(/\r\n|\n|\r/).length;
}

function readPreviousSnapshot() {
  try {
    if (!fs.existsSync(OUT_FILE)) return null;
    return JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  } catch {
    return null;
  }
}

const OPERATOR_DIRS = [
  path.join(SRC_DIR, "components", "operator"),
  path.join(SRC_DIR, "pages", "operator"),
  path.join(SRC_DIR, "i18n", "operator"),
];

function collectOperatorFiles() {
  const files = [];
  for (const dir of OPERATOR_DIRS) {
    walk(dir, files);
  }
  const libDir = path.join(SRC_DIR, "lib");
  if (fs.existsSync(libDir)) {
    for (const entry of fs.readdirSync(libDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.startsWith("operator")) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!INCLUDE_EXT.has(ext)) continue;
      files.push(path.join(libDir, entry.name));
    }
  }
  return files;
}

function main() {
  const files = walk(SRC_DIR);
  let linesOfCode = 0;
  for (const file of files) {
    linesOfCode += countLines(file);
  }

  const operatorFiles = collectOperatorFiles();
  let operatorLinesOfCode = 0;
  for (const file of operatorFiles) {
    operatorLinesOfCode += countLines(file);
  }

  const previous = readPreviousSnapshot();
  const previousBaselines = new Set([84000, 157592]);
  if (previous && Number.isFinite(Number(previous.linesOfCode))) {
    previousBaselines.add(Number(previous.linesOfCode));
  }
  if (Array.isArray(previous?.previousBaselines)) {
    for (const value of previous.previousBaselines) {
      if (Number.isFinite(Number(value))) previousBaselines.add(Number(value));
    }
  }
  previousBaselines.delete(linesOfCode);

  const snapshot = {
    linesOfCode,
    measuredAt: new Date().toISOString(),
    scope: "src/**/*.{ts,tsx,js,jsx,css,scss,mjs,cjs} (excluding generated/app-loc.json)",
    fileCount: files.length,
    operatorScope: {
      linesOfCode: operatorLinesOfCode,
      fileCount: operatorFiles.length,
      scope:
        "src/{components, pages}/operator/**, src/i18n/operator/**, src/lib/operator*.{ts,tsx}",
    },
    previousBaselines: [...previousBaselines].sort((a, b) => a - b),
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(
    `[count-app-loc] ${snapshot.linesOfCode.toLocaleString("en-US")} lines across ${snapshot.fileCount} files; operator ${snapshot.operatorScope.linesOfCode.toLocaleString("en-US")} / ${snapshot.operatorScope.fileCount} → ${path.relative(ROOT, OUT_FILE)}`,
  );
}

main();
