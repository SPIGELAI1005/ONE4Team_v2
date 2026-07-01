# ONE4Team — Schema status (local)

## Source of truth
- Primary schema source: `supabase/migrations/*.sql`
- Baseline bootstrap for fresh projects: `supabase/APPLY_BUNDLE_*.sql` (see `supabase/APPLY_ORDER_GUIDE.md`)
- `supabase/MVP_SCHEMA_RLS.sql` remains a planning/reference artifact and must not be treated as deployed state.

## Current communication-critical schema dependencies
The Communication module now expects all of the following to exist in the active Supabase project:
- `public.messages` (plus RLS + realtime publication)
- `public.announcements` (plus RLS + trigger/policies)
- `public.chat_bridge_connectors`
- `public.chat_bridge_events`
- `public.messages.attachments` column
- Storage bucket `chat-attachments` with member-scoped policies

## Current onboarding/member-ops schema dependencies (Session 5)
The onboarding/member operations module now additionally expects:
- `public.club_member_drafts` table (+ RLS policies for admin management)
- `public.clubs.join_approval_mode` (`manual` / `auto`)
- `public.clubs.join_reviewer_policy` (`admin_only` / `admin_trainer`)
- `public.clubs.join_default_role` + `public.clubs.join_default_team`
- `public.club_invite_requests.request_user_id`
- Function `public.can_review_club_join_requests(uuid, uuid)`
- RPC `public.register_club_join_request(uuid, text, text)`
- RPC `public.approve_club_join_request(uuid)`
- `public.request_rate_limits` table (abuse-control ledger)
- Function `public.enforce_request_rate_limit(text, uuid, text, int, interval)`
- RPC `public.get_club_request_abuse_audit(uuid, int)`
- `public.abuse_alerts` table (sustained abuse alerts)
- Function `public.raise_abuse_alert(uuid, text, text, text, int, jsonb)`
- RPC `public.get_club_abuse_alerts(uuid, text, int)`
- RPC `public.resolve_club_abuse_alert(uuid, text)`
- Reviewer policies on `public.club_invites` and `public.club_invite_requests` based on `can_review_club_join_requests(...)`

## Required incremental migrations (post-baseline)
Apply these in order when the environment is missing newer communication/member onboarding features:
1) `20260301152000_add_chat_bridge_connectors_and_events.sql`
2) `20260301164000_ensure_messages_table_exists.sql`
3) `20260301173500_add_message_attachments_and_storage.sql`
4) `20260301181500_ensure_announcements_table_exists.sql`
5) `20260305193000_member_drafts.sql`
6) `20260305204500_club_public_join_flow.sql`
7) `20260305220000_invite_join_rate_limits.sql`
8) `20260305224500_abuse_slice2_device_escalation_audit.sql`
9) `20260305231500_abuse_slice3_gateway_alert_hooks.sql`

## Members registry + guardians (2026-03-25)
When using master registry, drafts with extended fields, or guardian linking, the active project should also include (in order after prior member bundles):
- `20260324120000_club_member_master_records.sql` — `club_member_master_records`, `club_member_guardian_links`, email RPCs
- `20260324140000_club_role_assignments.sql` — optional but recommended for assignment-aware admin/trainer
- `20260324201000_club_member_master_records_select_broaden.sql` — SELECT policies for staff
- `20260324210000_club_member_drafts_master_data.sql` — `club_member_drafts.master_data`
- `20260325220000_redeem_invite_guardian_links.sql` — `redeem_club_invite` reads optional `invite_payload.guardian_membership_ids` and inserts guardian link rows after membership upsert

## Public club microsite (2026-05-02 — 2026-05-03)
For draft/publish JSON, extended public pages, team privacy, schedule/match/event publish flags, public join/contact/documents, and join-request v2, apply (in filename order after prior `public_page_*` / club profile migrations):
- `20260502120000_club_public_page_draft_publish.sql` through `20260503143000_public_join_request_flow_v2.sql` (see `CHANGELOG.md` § 2026-05-03 and `HOLD.md`).

**Client-only (same release window, no schema delta):** Public microsite **theme contrast** and **accent CTA hovers** live in `src/` only — see `CHANGELOG.md` § **2026-05-03 (Public club microsite — UI polish)**.

## Financial reporting (2026-06-14)
For admin P&L (collected revenue vs recorded costs), apply:
- `supabase/migrations/20260614120000_club_expenses.sql` — `club_expenses` table + admin RLS

Depends on existing **`payments`**, **`membership_dues`**, and optional **`shop_orders`** tables. Smoke: `/dashboard/admin` financial card, `/reports?section=financial`, add/delete expense.

## AI 4 T feature trials (2026-06-14)
For pilot access to **AI 4 T** (or shop) without a full plan upgrade, apply:
- `supabase/migrations/20260614140000_club_feature_trials.sql` — `club_feature_trials` table + optional Allach seed

Edge **`clubHasPlanFeature`** and client **`usePlanGuard`** read active trials. Deploy **`co-trainer`**, **`co-aimin`**, **`ai-match-analysis`**, **`ai4team-agent`** after applying. Operator helper: `supabase/scripts/fix_tsv_allach_ai_access.sql`.

## AI 4 T Agent workflows (2026-06-15)
For propose → confirm → execute club workflows (trainings, member drafts, announcements), apply in order:
- `supabase/migrations/20260615120000_ai_agent_runs.sql` — `ai_agent_runs` audit table
- `supabase/migrations/20260615130000_ai_agent_tool_rpcs.sql` — `agent_create_training`, `agent_cancel_training`
- `supabase/migrations/20260615140000_ai_agent_runs_conversation_id.sql` — link runs to `ai_conversations`
- `supabase/migrations/20260615150000_ai_agent_tool_rpcs_extended.sql` — `agent_create_member_draft`, `agent_send_club_announcement`

Deploy **`ai4team-agent`** Edge function. Smoke: `/co-trainer` Agent tab, dashboard Sparkles shortcut. See `CHANGELOG.md` § 2026-06-15 and `DEPLOYMENT.md` § AI 4 T Agent.

## AI 4 T pilot + public club extensions (2026-06-24)
Apply after agent migrations above:
- `supabase/migrations/20260624120000_club_public_feature_flags_rpc.sql` — public feature access RPCs
- `supabase/migrations/20260624180000_club_page_multilingual_feature.sql` — multilingual public club pages (Pro gate)
- `supabase/migrations/20260624190000_ai_message_feedback.sql` — thumbs up/down on AI messages
- `supabase/migrations/20260625120000_ai_agent_team_training_scope.sql` — team-scoped agent training RBAC
- `supabase/migrations/20260626120000_ai4t_duplicate_week_club_ai_stats.sql` — duplicate week RPC + club AI usage stats

Client-only (no new SQL beyond above): training attendance RSVP on `/activities` + public club; hero team filter (`?team=`). See `CHANGELOG.md` § 2026-06-24.

## TSV Allach public club extensions (2026-06-27)
Apply after pilot migrations above:
- `supabase/migrations/20260627120000_club_events_camp_fields.sql` — football camp metadata + `import_key` on `events`
- `supabase/migrations/20260628120000_club_invite_application_payload.sql` — `club_invite_requests.application_payload` + extended join RPCs

Optional operator seed: `supabase/scripts/seed_tsv_allach_football_camps.sql`.

Client-only: Sommerfest 2026 tournament board, membership application form, news carousel, public UX polish. See `CHANGELOG.md` § 2026-06-27 and `docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`.

## Communication hub, tasks, attendance (2026-06-25)
Apply after TSV Allach migrations above (filename order):
- `20260629120000_club_messages_team_scope_and_notify.sql` — team-scoped message access + notification fan-out
- `20260630120000_repair_notifications_table.sql` through `20260724160100_backfill_orphan_announcement_notifications.sql` — notifications repair, trainers channel, moderation, announcement cleanup
- `20260724170000_fix_publish_club_page_join_default_role_cast.sql` — publish RPC enum fix
- `20260724180000_club_tasks.sql` — `club_tasks` + task notifications
- `20260725130000_activity_attendance_member_self_rsvp.sql` — member self-RSVP RLS on `activity_attendance`
- `20260725140000_repair_list_club_membership_emails.sql` — repair `list_club_membership_emails` RPC
- `20260725150000_repair_images_avatars_bucket.sql` — repair `images-avatars` storage bucket + policies

Client-only: Messages hub, attendance overview UI, white decline dialog, tasks page, members team assignment, club member card PNG export. WhatsApp setup backlog: `docs/backlog/WHATSAPP_EXTERNAL_BRIDGE_SETUP.md`. Deploy **`chat-bridge`** for External Bridge. See `CHANGELOG.md` § 2026-06-25 and § 2026-06-28.

## Member payments + fee packages (2026-06-30)
For admin **`/payments`** (packages + per-member payment lines), apply after communication/attendance repairs above:
- `supabase/migrations/20260728120000_repair_membership_fee_types_and_payments.sql` — `membership_fee_types`, `payments`
- `supabase/migrations/20260728130000_repair_club_memberships_profile_fk.sql` — profile FK for roster embeds
- `supabase/migrations/20260728140000_membership_fee_types_package_fields.sql` — `price_components`, `member_category`, `fee_kind`, `sort_order`

Deploy **`send-club-invite-email`** for Resend invite delivery. Regenerate **`src/integrations/supabase/types.ts`** after apply.

Client-only: fee package form/overview, record payment UX, annual levy split in summary (`membership-fee-packages.ts`). See `CHANGELOG.md` § 2026-06-30 and `docs/PRODUCTION_RELEASE_CHECKLIST.md`.

## Partner portal + marketplace provider (2026-07-01)
Apply after member payments migrations above (strict filename order):
- `20260731120000_partner_task_engagements.sql`
- `20260731170000_marketplace_provider_portal_apply.sql` (canonical provider portal schema; supersedes duplicate-version `20260731150000` if not applied)
- `20260731180000_marketplace_requests_enhance.sql`
- `20260731190000_marketplace_offers_enhance.sql`
- `20260731200000_marketplace_partners_bridge.sql`
- `20260731210000_marketplace_provider_images_bucket.sql`
- `20260731215000_supplier_portal_scope.sql`
- `20260731220000_repair_marketplace_provider_images_bucket.sql`

Repair (apply if redeem fails): `20260731130000_repair_redeem_invite_pgcrypto.sql`, `20260731140000_repair_redeem_invite_ambiguous_club_id.sql`, `20260731160000_repair_redeem_invite_membership_upsert.sql`.

Client: partner routes (`/partner-*`, `/supplier-page`), PersonaPortalGate, Partner Page admin, `/partner-ai`, persona switch, RBAC sidebar. See `CHANGELOG.md` § 2026-07-01 (Partner portal) and `docs/rbac-dashboard-plan.md` §10.

## Verification artifact
- Run `supabase/PHASE12_VERIFY.sql` after applying the migrations above.
- Treat any `ok = false` row as a rollout blocker.

## Environment consistency note
Most runtime issues reported recently were caused by migration drift (app connected to a Supabase project missing one or more tables/columns/policies/functions).  
When troubleshooting, verify that the frontend environment variables point to the same Supabase project where these migrations were applied.
