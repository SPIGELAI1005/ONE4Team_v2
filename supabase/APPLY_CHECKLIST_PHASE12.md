# Phase 12 Apply Checklist (Environment Integrity + Rollout)

## Goal
Complete Phase 12 rollout with migration parity and production-safe validation:
- environment/migration drift eliminated
- public join + member draft + abuse-control features verified
- release gate evidence captured

## Files
- `supabase/migrations/20260305193000_member_drafts.sql`
- `supabase/migrations/20260305204500_club_public_join_flow.sql`
- `supabase/migrations/20260305220000_invite_join_rate_limits.sql`
- `supabase/migrations/20260305224500_abuse_slice2_device_escalation_audit.sql`
- `supabase/migrations/20260305231500_abuse_slice3_gateway_alert_hooks.sql`
- `supabase/PHASE12_VERIFY.sql`

## Apply order (must be exact)
1) `20260305193000_member_drafts.sql`
2) `20260305204500_club_public_join_flow.sql`
3) `20260305220000_invite_join_rate_limits.sql`
4) `20260305224500_abuse_slice2_device_escalation_audit.sql`
5) `20260305231500_abuse_slice3_gateway_alert_hooks.sql`

## Steps (Supabase Dashboard)
1) Open Supabase project for target environment (staging first, then prod).
2) SQL Editor: run each migration above in order.
3) SQL Editor: run `supabase/PHASE12_VERIFY.sql`.
4) Confirm every row in verification output has `ok = true`.
5) If any check fails, stop rollout and fix before UI/QA validation.

## Fail-fast rule
- Do not run application QA until `supabase/PHASE12_VERIFY.sql` passes fully.
- Do not promote staging -> production unless both environments pass with same migration head.

## Post-apply QA handoff
- Execute `PHASE12_VALIDATION_MATRIX.md`.
- Record result links/screenshots in `PROJECT_STATUS.md` and release notes.

