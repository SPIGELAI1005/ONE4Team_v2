# Generated app metrics

`app-loc.json` is produced by `npm run loc:count` (also runs on `prebuild`).

Do not edit the JSON by hand — rerun the script after large code changes, or rely on CI/build to refresh it.

## Snapshot fields (2026-08-18)

| Field | Purpose |
|-------|---------|
| `linesOfCode` | Total physical lines under `src/` (excludes this file) — **179,101** as of 2026-08-18 |
| `fileCount` | Source files counted — **884** |
| `operatorScope.linesOfCode` | Operator Control Center module (`components/operator`, `pages/operator`, `i18n/operator`, `lib/operator*`) — **17,985** |
| `operatorScope.fileCount` | Files in operator module — **87** |
| `previousBaselines` | Historical LOC values for auto-refresh of stale browser overrides (includes **170,246** from 2026-08-07) |

Operator **Financials** development cost uses **total** `linesOfCode` × €/line (see `src/lib/operator-financials.ts`).
