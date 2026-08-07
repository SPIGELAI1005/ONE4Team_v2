# Generated app metrics

`app-loc.json` is produced by `npm run loc:count` (also runs on `prebuild`).

Do not edit the JSON by hand — rerun the script after large code changes, or rely on CI/build to refresh it.

## Snapshot fields (2026-08-07)

| Field | Purpose |
|-------|---------|
| `linesOfCode` | Total physical lines under `src/` (excludes this file) |
| `fileCount` | Source files counted |
| `operatorScope.linesOfCode` | Operator Control Center module (`components/operator`, `pages/operator`, `i18n/operator`, `lib/operator*`) |
| `operatorScope.fileCount` | Files in operator module |
| `previousBaselines` | Historical LOC values for auto-refresh of stale browser overrides |

Operator **Financials** development cost uses **total** `linesOfCode` × €/line (see `src/lib/operator-financials.ts`).
