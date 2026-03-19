# Phase 12 Go/No-Go Checklist

## Go criteria
- [x] Staging migrations applied through `20260305231500_abuse_slice3_gateway_alert_hooks.sql`.
- [x] Production migrations applied through `20260305231500_abuse_slice3_gateway_alert_hooks.sql`.
- [x] `supabase/PHASE12_VERIFY.sql` passed in staging and production.
- [x] `PHASE12_VALIDATION_MATRIX.md` passed in staging.
- [x] CI green (`lint`, `test`, `build`, `audit:phase0`, `audit:phase12`, `e2e`).
- [x] Environment mapping documented in `ENVIRONMENT_MATRIX.md`.
- [x] Release owner sign-off recorded.
- [x] Week-12 governance gate decision recorded in `GOVERNANCE_MONTHLY_GATES.md`.

## No-Go triggers
- Any failed verification check in `PHASE12_VERIFY.sql`.
- Staging/prod Supabase mismatch.
- Unresolved high-severity abuse alert with active recurrence.
- Failing high-risk continuity or invite/join tests.

## Rollback notes
1) Vercel: redeploy previous production deployment.
2) Supabase: rollback using pre-approved SQL rollback script for affected migration(s).
3) Re-run `supabase/PHASE12_VERIFY.sql` and sanity smoke.
4) Document incident summary in `PROJECT_STATUS.md`.

## Evidence artifact
- Record all staging/production evidence in `RELEASE_NOTES_PHASE12.md`.

