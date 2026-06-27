# HOLD — items requiring Supabase / external setup

Last updated: 2026-06-25 — cross-reference: full ordered migration and deploy guidance is in `CHANGELOG.md` (§ 2026-03-30, § 2026-05-03, § **2026-06-14** admin + **AI 4 T**, § **2026-06-15** AI 4 T Agent, § **2026-06-24** attendance + pilot Phases 1–4, § **2026-06-25** communication/tasks/attendance, § **2026-06-27** TSV Allach Sommerfest + membership application), `MEMORY_BANK.md`, `DEPLOYMENT.md`, and `ops/PRODUCTION_READINESS_ARTIFACTS.md` (sections below are partial snapshots, not the canonical list).

This repo is prepared locally-first. The following items are intentionally on hold until you do Supabase Dashboard actions.

## ONE4Team — Apply SQL bundles in Supabase (Dashboard)
Recommended apply order (fresh project):
1) `supabase/APPLY_BUNDLE_BASELINE.sql`
2) `supabase/APPLY_BUNDLE_PHASE1.sql`
3) `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
4) `supabase/APPLY_BUNDLE_PHASE2.sql`
5) `supabase/APPLY_BUNDLE_PHASE3.sql`
6) `supabase/APPLY_BUNDLE_PHASE4.sql`
7) `supabase/APPLY_BUNDLE_PHASE5.sql`
8) `supabase/APPLY_BUNDLE_PHASE6.sql`

Then run smoke scripts in:
- `PHASE0_INDEX.md`, `PHASE1_INDEX.md`, `PHASE2_INDEX.md`, …

## Incremental migrations to apply (current project)
Apply these in the same Supabase project used by your app environment:
1) `supabase/migrations/20260301152000_add_chat_bridge_connectors_and_events.sql`
2) `supabase/migrations/20260301164000_ensure_messages_table_exists.sql`
3) `supabase/migrations/20260301173500_add_message_attachments_and_storage.sql`
4) `supabase/migrations/20260301181500_ensure_announcements_table_exists.sql`
5) `supabase/migrations/20260319190000_abuse_slice4_notifications.sql`
6) `supabase/migrations/20260319191500_v21_v22_billing_shop.sql`
7) `supabase/migrations/20260319193000_v23_partner_workflows.sql`
8) `supabase/migrations/20260319194500_v24_v25_multisport_automation.sql`

Why this is critical now:
- `/communication` depends on `public.messages`, `public.announcements`, bridge connector/event tables, and attachment storage policies.
- Missing any of the above in the active environment causes schema-cache/runtime errors.

## Public club microsite — May 2026 migrations (operator)
Apply in **strict filename order** in the same Supabase project as the app (after prior club/public migrations are already applied):
1. `supabase/migrations/20260502120000_club_public_page_draft_publish.sql`
2. `supabase/migrations/20260502140000_partners_public_club_visibility.sql`
3. `supabase/migrations/20260502150000_announcements_public_website_news.sql`
4. `supabase/migrations/20260502170000_public_team_privacy.sql`
5. `supabase/migrations/20260502180000_public_club_schedule_publish_flags.sql`
6. `supabase/migrations/20260502190000_public_matches_events_microsite.sql`
7. `supabase/migrations/20260502210000_public_club_documents_faq_join_contact.sql`
8. `supabase/migrations/20260502220000_club_page_extended_publish_unpublish.sql`
9. `supabase/migrations/20260503120000_public_club_privacy_team_rpc.sql`
10. `supabase/migrations/20260503143000_public_join_request_flow_v2.sql`

Then regenerate **`src/integrations/supabase/types.ts`** if RPCs/columns changed. Smoke: **`/club-page-admin`**, **`/club/:slug`**, **`/club/:slug/join`**, draft preview **`?draft=1`**.

## Financial reporting — club expenses (2026-06-14)
Apply after payments/dues (and optional shop) tables exist:
11. `supabase/migrations/20260614120000_club_expenses.sql`

Smoke: **`/dashboard/admin`** financial summary card, **`/reports?section=financial`**, add/delete expense, CSV export. See **`CHANGELOG.md` § 2026-06-14** and **`TASKS.md` FIN-OPS-001**.

## AI 4 T — feature trials + Edge deploy (2026-06-14)
Apply in the same Supabase project as the app:
1. `supabase/migrations/20260614140000_club_feature_trials.sql` (trigger uses **`update_updated_at()`**)
2. Deploy Edge: **`co-trainer`**, **`co-aimin`**, **`ai-match-analysis`**
3. Set Edge secrets **`OPENAI_API_KEY`** (and optional **`OPENAI_MODEL`**)
4. Optional operator SQL: **`supabase/scripts/fix_tsv_allach_ai_access.sql`** for Allach pilot clubs

See **`DEPLOYMENT.md` § AI 4 T** and **`TASKS.md` AI-OPS-001**.

## AI 4 T Agent — workflow migrations + Edge deploy (2026-06-15)
Apply in the same Supabase project as the app (after **`20260614140000`** if using feature trials):
1. `supabase/migrations/20260615120000_ai_agent_runs.sql`
2. `supabase/migrations/20260615130000_ai_agent_tool_rpcs.sql`
3. `supabase/migrations/20260615140000_ai_agent_runs_conversation_id.sql`
4. `supabase/migrations/20260615150000_ai_agent_tool_rpcs_extended.sql`
5. Deploy Edge: **`ai4team-agent`** (`supabase functions deploy ai4team-agent`)

Smoke: **`/co-trainer` → Agent tab** (propose → confirm create training); dashboard **Sparkles** on Teams/Members; Chat **`/agent`** command. See **`DEPLOYMENT.md` § AI 4 T Agent** and **`TASKS.md` AI-AGENT-OPS-001**.

## TSV Allach public club — Sommerfest + membership application (2026-06-27)
Apply in the same Supabase project as the app (after **`20260626120000`**):
1. `supabase/migrations/20260627120000_club_events_camp_fields.sql`
2. `supabase/migrations/20260628120000_club_invite_application_payload.sql`

Optional seed: `supabase/scripts/seed_tsv_allach_football_camps.sql`.

Smoke: **`/matches`** → publish Sommerfest 2026 → **`/club/tsv-allach-09/tournament/sommerfest-2026`**; **`/club/tsv-allach-09/join`** → submit 5-step application → verify **`application_payload`** in admin join inbox. See **`CHANGELOG.md` § 2026-06-27**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`TASKS.md` ALLACH-OPS-001**.

## Communication hub, tasks, attendance (2026-06-25)
Apply in the same Supabase project (after **`20260628120000`**):
1. `supabase/migrations/20260629120000_club_messages_team_scope_and_notify.sql`
2. `supabase/migrations/20260630120000_repair_notifications_table.sql`
3. `supabase/migrations/20260630130000_repair_events_training_and_feature_rpc.sql`
4. `supabase/migrations/20260630140000_messages_trainers_channel.sql`
5. `supabase/migrations/20260630150000_fix_can_access_team_message_ambiguity.sql`
6. `supabase/migrations/20260724130000_reload_can_access_team_message_schema.sql`
7. `supabase/migrations/20260724140000_announcement_updates_fanout_include_author.sql`
8. `supabase/migrations/20260724150000_message_and_announcement_moderation.sql`
9. `supabase/migrations/20260724160000_cleanup_announcement_notifications_on_delete.sql`
10. `supabase/migrations/20260724160100_backfill_orphan_announcement_notifications.sql`
11. `supabase/migrations/20260724170000_fix_publish_club_page_join_default_role_cast.sql`
12. `supabase/migrations/20260724180000_club_tasks.sql`
13. `supabase/migrations/20260725130000_activity_attendance_member_self_rsvp.sql`

Deploy Edge: **`chat-bridge`** (for WhatsApp/Telegram External Bridge).

Smoke: public club **Messages** hub; **`/communication`** announcements + moderation; **`/tasks`**; training RSVP overview + self-RSVP. See **`CHANGELOG.md` § 2026-06-25**, **`TASKS.md` COMM-OPS-001 / ATTEND-OPS-001.

## WhatsApp External Bridge — operator (follow-up)
**Not** personal WhatsApp / QR login. Use **WhatsApp Business API** only.

Step-by-step: **`docs/backlog/WHATSAPP_EXTERNAL_BRIDGE_SETUP.md`**

Blockers:
- **`chat-bridge`** must be deployed to the target Supabase project
- Meta webhook URL must be **public** (not `localhost`)
- **BRIDGE-WA-001:** Meta GET webhook verification (`hub.challenge`) may need a code change before Meta accepts the callback URL

## Phase 7 items (need Supabase / infra)
- Staging + prod Supabase projects (completed for Phase 12 closure)
- Vercel Preview → staging env vars; Production → prod env vars (completed for Phase 12 closure)
- Tenant isolation verification on staging (completed for Phase 12 closure)
- Invite-request spam controls / rate limiting (RPC) (implemented and verified in target environment)

## CLAW-FE blockers (Dashboard)
- Run: `OPENCLAW_CAFE/claw-fe/supabase/MIGRATIONS_BUNDLE_001_006.sql`
- Paste Auth email templates:
  - Magic Link
  - Confirm signup
  - Reset password
