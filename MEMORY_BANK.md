# ONE4Team — Memory Bank

Last updated: 2026-03-05

## Purpose
Persistent handoff context for future agents so work can continue without re-discovery.

## Current Product State
- App is in post-Phase-12 local implementation with major onboarding/member operations upgrades completed in code.
- Core UX now supports SaaS-style return behavior:
  - returning users resume dashboard context,
  - onboarding is skipped when active memberships already exist.
- Club website onboarding now supports configurable approval:
  - manual request approval,
  - auto-join,
  - reviewer policy (admin-only or admin+trainer).

## Session 5 Realized Work (code complete, needs migration parity in target env)
- `ClubPageAdmin` input remount issue fixed (field typing stable).
- Auth/onboarding persistence alignment:
  - `one4team.activeRole` standardized.
  - Active club key scoped by user (`one4team.activeClubId:{userId}`).
- Footer behavior for logged-out users improved and legal links present.
- Members page reworked to save-first member drafts and per-member invite sending.
- Members workbook export upgraded to structured `.xlsx` with template + current data sheets.
- DE/EN localization expanded for updated member and onboarding flows.
- Public club page registration flow moved to authenticated, policy-aware join requests.
- Reviewer policy enforcement added to both UI and Supabase access paths.

## New Migrations To Apply In Supabase
1. `20260305193000_member_drafts.sql`
2. `20260305204500_club_public_join_flow.sql`

Also ensure previously listed communication migrations remain applied in the same project:
- `20260301152000_add_chat_bridge_connectors_and_events.sql`
- `20260301164000_ensure_messages_table_exists.sql`
- `20260301173500_add_message_attachments_and_storage.sql`
- `20260301181500_ensure_announcements_table_exists.sql`

## Known Operational Risk
- Most regressions seen recently come from migration/environment drift rather than frontend code defects.
- If behavior mismatches local code expectations, verify app env vars point to the same Supabase project where all required migrations are applied.

## Immediate Next Validation Pass
- Validate public join flow in all combinations:
  - manual + admin-only,
  - manual + admin+trainer,
  - auto + admin-only.
- Validate member draft lifecycle:
  - save draft -> send invite -> status update.
- Validate post-login continuity:
  - existing member resumes dashboard,
  - new user without membership lands on onboarding.

## Suggested Next Implementation Steps
- Add abuse controls/rate limiting for join/invite requests.
- Add Playwright coverage for join policy matrix and save-first draft flow.
- Complete staging/prod Supabase separation and release checklist run.
