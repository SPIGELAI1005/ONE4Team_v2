# Phase 12 Environment Matrix

This matrix is the source of truth for environment-to-Supabase alignment.

## Required variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_APP_ENV`
- `VITE_LOG_LEVEL`

## Matrix

| Environment | Vercel target | Supabase project ref | Supabase URL | Migration head | Verified at | Owner |
|---|---|---|---|---|---|---|
| local | local dev | `<fill>` | `<fill>` | `20260305231500_abuse_slice3_gateway_alert_hooks.sql` | `<fill>` | `<fill>` |
| staging | preview | `<fill>` | `<fill>` | `20260305231500_abuse_slice3_gateway_alert_hooks.sql` | `<fill>` | `<fill>` |
| production | production | `<fill>` | `<fill>` | `20260305231500_abuse_slice3_gateway_alert_hooks.sql` | `<fill>` | `<fill>` |

## Enforcement rules
1) Staging and production must never share the same Supabase project ref.
2) Promotion is blocked unless:
   - staging and production both pass `supabase/PHASE12_VERIFY.sql`,
   - migration head matches this matrix.
3) Any env-var change must update this file and `PROJECT_STATUS.md` in the same PR.

## Verification commands/checks
- In each environment, run `supabase/PHASE12_VERIFY.sql`.
- Confirm app runtime points to intended Supabase URL.
- Confirm CI green on the release branch before promote.

## Evidence recording
- Archive completed matrix values and verification references in `RELEASE_NOTES_PHASE12.md`.

