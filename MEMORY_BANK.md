# ONE4Team — Memory Bank

Last updated: 2026-03-19 (Session 8 property planner + Teams modal UX)

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
- Pricing promo banner now targets April 10 with aligned EN/DE copy and verified live countdown behavior on `/pricing`.
- German brand copy standardization pass completed:
  - About hero wording now uses `Sportvereine`,
  - all known `Hobbyverein`/`Hobbyvereine` occurrences were replaced.
- Post-plan execution waves (2–6) now committed in code:
  - abuse slice 4 schema/policy automation migration,
  - billing + shop live schema and UI wiring,
  - partner workflows schema and tabbed UI,
  - multi-sport catalog baseline and team sport normalization,
  - automation schema + AI server-first generation path (with fallback).
- Property planner model now includes full map element and booking primitives:
  - pitch/element grid definitions (`club_pitches`),
  - booking records (`pitch_bookings`),
  - optional parent split relation and reconfirmation workflow fields.
- Club property mapping now supports layer contexts and typed elements:
  - layer catalog (`club_property_layers`) for training/admin/operations views,
  - element type classification and optional per-element `display_color`.
- Teams map create/edit element modal UX has been hardened for density:
  - scrollable modal body with fixed save footer,
  - color section collapses by default and expands on demand.
- Phase 12 closure status:
  - Supabase migrations applied and verified in target environments,
  - validation matrix signed off,
  - go/no-go checklist completed and governance gate moved to Continue.

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
- Abuse-control first slice implemented:
  - request limiter table + helper in Supabase,
  - rate limits enforced in `request_club_invite` and `register_club_join_request`,
  - user-facing rate-limit toast added to public club-page flow.
- Abuse-control second slice implemented:
  - device-aware signals captured from request headers (IP + user-agent fingerprint),
  - escalation cooldown path after repeated blocked attempts,
  - reviewer/admin abuse audit RPC and minimal invites-tab dashboard.
- Abuse-control third slice implemented:
  - gateway heuristics (bot-score + user-agent + country/IP signals),
  - sustained-abuse alert hooks (`abuse_alerts` + `raise_abuse_alert`),
  - reviewer alert retrieval/resolve RPCs with invites-tab alert queue UI.
- Phase 12 rollout guardrail package implemented:
  - `supabase/PHASE12_VERIFY.sql` (single verification block),
  - `supabase/APPLY_CHECKLIST_PHASE12.md`,
  - `ENVIRONMENT_MATRIX.md`,
  - `PHASE12_VALIDATION_MATRIX.md`,
  - `PHASE12_GO_NO_GO_CHECKLIST.md`.
- CI/test gate hardening implemented:
  - `scripts/audit-phase12.cjs` + `npm run audit:phase12`,
  - CI step for Phase 12 audit,
  - Playwright continuity suite `e2e/continuity.spec.ts`.
- Auth continuity hardening implemented:
  - protected route redirects preserve `returnTo`,
  - auth consumes sanitized `returnTo`,
  - club public join request flow preserves return context when redirecting to auth.

## Recently Applied Migrations In Supabase
1. `20260305193000_member_drafts.sql`
2. `20260305204500_club_public_join_flow.sql`
3. `20260305220000_invite_join_rate_limits.sql`
4. `20260305224500_abuse_slice2_device_escalation_audit.sql`
5. `20260305231500_abuse_slice3_gateway_alert_hooks.sql`
6. `20260319190000_abuse_slice4_notifications.sql`
7. `20260319191500_v21_v22_billing_shop.sql`
8. `20260319193000_v23_partner_workflows.sql`
9. `20260319194500_v24_v25_multisport_automation.sql`
10. `20260319212000_pitch_planner_and_bookings.sql`
11. `20260319220000_pitch_split_and_confirmation.sql`
12. `20260319231500_club_property_layers_and_elements.sql`
13. `20260319233000_club_pitches_display_color.sql`

Also ensure previously listed communication migrations remain applied in the same project:
- `20260301152000_add_chat_bridge_connectors_and_events.sql`
- `20260301164000_ensure_messages_table_exists.sql`
- `20260301173500_add_message_attachments_and_storage.sql`
- `20260301181500_ensure_announcements_table_exists.sql`

## Known Operational Risk
- Most regressions seen recently come from migration/environment drift rather than frontend code defects.
- If behavior mismatches local code expectations, verify app env vars point to the same Supabase project where all required migrations are applied.

## Suggested Next Implementation Steps
- Add production workers/dispatch for:
  - abuse notification event delivery,
  - automation run execution lifecycle.
- Harden Stripe integration:
  - webhook event ingestion and idempotency handling,
  - entitlement transitions tied to billing state.
- Expand authenticated E2E coverage for new v2 flows (shop/partners/billing/automation).
