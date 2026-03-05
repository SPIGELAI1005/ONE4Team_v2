# Phase 12 Go/No-Go Checklist

## Go criteria
- [ ] Staging migrations applied through `20260305231500_abuse_slice3_gateway_alert_hooks.sql`.
- [ ] Production migrations applied through `20260305231500_abuse_slice3_gateway_alert_hooks.sql`.
- [ ] `supabase/PHASE12_VERIFY.sql` passed in staging and production.
- [ ] `PHASE12_VALIDATION_MATRIX.md` passed in staging.
- [ ] CI green (`lint`, `test`, `build`, `audit:phase0`, `audit:phase12`, `e2e`).
- [ ] Environment mapping documented in `ENVIRONMENT_MATRIX.md`.
- [ ] Release owner sign-off recorded.
- [ ] Week-12 governance gate decision recorded in `GOVERNANCE_MONTHLY_GATES.md`.

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

