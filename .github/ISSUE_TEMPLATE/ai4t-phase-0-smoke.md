---
name: AI 4 T Phase 0 smoke (TSV Allach)
about: Copy-paste pilot smoke checklist — migrations, Edge deploy, manual QA sign-off
title: "[AI4T] Phase 0 smoke — "
labels: ai4t-pilot
assignees: ''
---

## Pilot context

- **Club:** TSV Allach 09 (`/club/tsv-allach-09`)
- **Roadmap:** [`docs/AI4T_ROADMAP.md`](../../docs/AI4T_ROADMAP.md) Phase 0
- **Task IDs:** `AI4T-P0-001`, `AI4T-P0-002` in [`TASKS.md`](../../TASKS.md)
- **Operator script:** [`supabase/scripts/fix_tsv_allach_ai_access.sql`](../../supabase/scripts/fix_tsv_allach_ai_access.sql)

**Sign-off:** Pilot lead + one Allach coach. Log failures below with screenshots / error text.

### Fast sign-off (already tested in the app?)

If you already exercised **AI 4 T** with admin/trainer and player accounts, you do **not** need to re-run every checkbox. Minimum evidence to close Phase 0:

1. **SQL verify** (billing/trials + RPC/schema checks below) — paste results in this issue
2. **Automated:** `npm test -- src/lib/ai-context.test.ts` — 10/10 green
3. **Manual:** 3–5 bullets in **Failures / notes** (chat, agent propose→execute, public modal, role gating)
4. **Sign-off table** — pilot lead required; Allach coach when available

Skip unless you have not tried them: idempotency double-confirm, rate-limit spam test.

**CLI helpers:** `npm run db:push` · `npm run db:types`

---

## Environment

| Field | Value |
|-------|-------|
| Environment | <!-- staging / production --> |
| Supabase project ref | |
| Deploy date | |
| Tester (trainer/admin) | |
| Tester (member/player) | |

---

## 0.1 Database migrations

Apply in **filename order** (staging → prod), or confirm `npm run db:push` reports **Remote database is up to date**:

- [ ] `20260614140000_club_feature_trials.sql`
- [ ] `20260624120000_club_public_feature_flags_rpc.sql`
- [ ] `20260624180000_club_page_multilingual_feature.sql`
- [ ] `20260615120000_ai_agent_runs.sql`
- [ ] `20260615130000_ai_agent_tool_rpcs.sql`
- [ ] `20260615140000_ai_agent_runs_conversation_id.sql`
- [ ] `20260615150000_ai_agent_tool_rpcs_extended.sql`
- [ ] `20260624190000_ai_message_feedback.sql` (feedback widget)
- [ ] `20260625120000_ai_agent_team_training_scope.sql` (team RBAC + cancel scope)
- [ ] `20260626120000_ai4t_duplicate_week_club_ai_stats.sql` (duplicate week + usage stats)
- [ ] Allach shortcut: `fix_tsv_allach_ai_access.sql` run (idempotent)

**Verify billing + trials:**

```sql
select c.name, b.plan_id, b.status, t.feature, t.expires_at
from public.clubs c
left join public.billing_subscriptions b on b.club_id = c.id
left join public.club_feature_trials t on t.club_id = c.id
where c.slug ilike '%allach%';
```

Expected: `ai` trial active **and/or** `pro` + `trialing`; optional `multilingual` trial.

**Verify key RPCs / schema (latest agent wave):**

```sql
select exists (select 1 from pg_proc where proname = 'agent_cancel_training');
select exists (select 1 from pg_proc where proname = 'can_manage_team_training');
select exists (select 1 from pg_proc where proname = 'agent_duplicate_training_week_sessions');
select exists (select 1 from pg_proc where proname = 'get_club_ai_usage_stats');
select exists (
  select 1 from information_schema.columns
  where table_name = 'club_llm_settings' and column_name = 'club_ai_instructions'
);
```

All should return `true`.

- [ ] SQL verify passed

---

## 0.2 Edge functions & secrets

Deploy (after repo changes to `ai4team_scope.ts` / context):

```bash
supabase functions deploy co-trainer
supabase functions deploy ai4team-agent
supabase functions deploy co-aimin
supabase functions deploy ai-match-analysis
```

- [ ] `co-trainer` deployed
- [ ] `ai4team-agent` deployed
- [ ] `co-aimin` deployed
- [ ] `ai-match-analysis` deployed
- [ ] `OPENAI_API_KEY` (or club-level LLM) set in project secrets
- [ ] Settings → Club → AI provider → **Test connection** = success (Allach admin)
- [ ] Client `.env` `VITE_SUPABASE_URL` / anon key correct; dev server restarted if changed

---

## 0.3 Smoke test — Access & gating

Use a **trainer/admin** account and a **member/player** account.

- [ ] `/co-trainer` loads (not PlanGate block) for Allach admin/trainer
- [ ] Player sees appropriate limits (chat OK; agent mutations blocked)
- [ ] Public `/club/tsv-allach-09` shows AI 4 T section + hero button when `ai4team` section enabled
- [ ] Public modal opens; signed-in member can chat (if AI feature active)

---

## 0.3 Smoke test — Chat accuracy (manual)

- [ ] “When is U12-1 training?” → time matches Teams UI (**club local**, not UTC)
- [ ] “Who are you?” → **AI 4 T** (not AI4Team / ONE4Team)
- [ ] Off-topic (e.g. “buy shoes online”) → short redirect, club-focused suggestions
- [ ] Data-backed reply includes **Sources:** line citing context sections (when applicable)
- [ ] Thumbs up/down on assistant message saves without error (after chat persisted)

---

## 0.3 Smoke test — Agent tab

- [ ] **Agent** tab → pick workflow → **Review & propose** → summary visible
- [ ] **Confirm & run** → status `executed`; row in `ai_agent_runs`
- [ ] Repeat confirm with same idempotency → no duplicate write
- [ ] Header **Sparkles** on Teams → sheet opens with page context
- [ ] Teams **Training Sessions** tab → quick actions: Plan week / Cancel training / Notify trainers

---

## 0.3 Smoke test — Regression

- [ ] Settings → Club → AI provider → Test connection = success
- [ ] Rate limit: rapid sends eventually return friendly message (not opaque 500)

---

## Automated checks (repo)

```bash
npm test -- src/lib/ai-context.test.ts
```

- [ ] Golden context tests green in CI / locally

Manual golden script: [`docs/AI4T_GOLDEN_QUESTIONS.md`](../../docs/AI4T_GOLDEN_QUESTIONS.md)

---

## Failures / notes

<!-- Paste errors, screenshots links, or PR fixes needed -->

---

## Sign-off

- [ ] **AI4T-P0-001** complete (migrations + Edge deploy)
- [ ] **AI4T-P0-002** complete (smoke signed off by pilot lead + coach)

| Role | Name | Date |
|------|------|------|
| Pilot lead | | |
| Allach coach | | *(optional for fast sign-off; add when available)* |
