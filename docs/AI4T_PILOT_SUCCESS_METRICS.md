# AI 4 T pilot success metrics (8-week gate)

**Purpose:** Objective criteria before investing in [Phase 5](./AI4T_ROADMAP.md#phase-5--long-term-after-pilot-confidence). Tracked in [`TASKS.md`](../TASKS.md) as **AI4T-PILOT-001**–**005**.

**Status (2026-07-16):** **AI4T-PILOT-001**–**005** marked complete per operator confirmation. Re-run monthly golden / usage checks as needed for Phase 5 gating.

**Pilot club:** TSV Allach 09 (`slug` ≈ `tsv-allach-09`)

**Cadence**

| When | What |
|------|------|
| **Weekly** (W1–W8) | PILOT-001 coach usage SQL + quick sanity |
| **Monthly** (W4, W8) | PILOT-002 golden run; PILOT-003/004 SQL; file GitHub review issue |
| **Week 8** | PILOT-005 interview; Phase 5 go/no-go |

Issue template: [`.github/ISSUE_TEMPLATE/ai4t-pilot-monthly-review.md`](../.github/ISSUE_TEMPLATE/ai4t-pilot-monthly-review.md)

---

## PILOT-001 — Weekly coach usage

**Target:** ≥3 distinct **trainer or admin** users update an `ai_conversations` row at least once per calendar week, for **4 consecutive weeks**.

**How to measure** (Supabase SQL Editor; replace club slug if needed):

```sql
with pilot_club as (
  select id from public.clubs where slug ilike '%allach%' order by created_at limit 1
),
coach_users as (
  select distinct cm.user_id
  from public.club_memberships cm
  join pilot_club pc on pc.id = cm.club_id
  where cm.status = 'active'
    and cm.role in ('admin', 'trainer')
),
weeks as (
  select date_trunc('week', d)::date as week_start
  from generate_series(
    date_trunc('week', now() - interval '7 weeks')::date,
    date_trunc('week', now())::date,
    interval '1 week'
  ) d
),
active_per_week as (
  select
    date_trunc('week', c.updated_at)::date as week_start,
    count(distinct c.user_id)::int as coaches_active
  from public.ai_conversations c
  join pilot_club pc on pc.id = c.club_id
  join coach_users u on u.user_id = c.user_id
  where c.updated_at >= now() - interval '8 weeks'
  group by 1
)
select
  w.week_start,
  coalesce(a.coaches_active, 0) as coaches_active,
  coalesce(a.coaches_active, 0) >= 3 as meets_target
from weeks w
left join active_per_week a on a.week_start = w.week_start
order by w.week_start desc;
```

**Pass:** The **last 4 rows** in the result all have `meets_target = true`.

**Notes**

- `updated_at` on `ai_conversations` changes when the user sends chat messages.
- Admins count toward the ≥3 if they use chat; prefer real coaches when possible.
- Log weekly results in the monthly review issue.

---

## PILOT-002 — Golden questions ≥90%

**Target:** **≥90%** of manual golden questions pass per monthly run.

**How to measure**

1. Run [`docs/AI4T_GOLDEN_QUESTIONS.md`](./AI4T_GOLDEN_QUESTIONS.md) manual E2E table (GQ-01 … GQ-10) as Allach trainer/admin.
2. Score each **Pass** / **Fail** (see golden doc).
3. `pass_rate = passes / total_scored` (exclude N/A if a question does not apply).

**Also run automated context tests** (no LLM):

```bash
npm test -- src/lib/ai-context.test.ts
```

Automated tests are necessary but **not sufficient** for PILOT-002 — the 90% target is the **live LLM** monthly run.

**Pass:** `pass_rate >= 0.90` on the latest monthly run.

---

## PILOT-003 — Safe agent runs

**Target:** **≥10** agent workflows reach `status = 'executed'` during the pilot window; **zero** data incidents.

**Data incident** = wrong team, wrong local time, duplicate training write, or any production fix required because the agent mutated incorrect data.

**Quick stats** (admin RPC or SQL):

```sql
-- Settings → Club → AI 4 T usage panel calls this RPC:
select public.get_club_ai_usage_stats(
  (select id from public.clubs where slug ilike '%allach%' limit 1),
  now() - interval '56 days',
  now()
);
```

Or direct SQL:

```sql
select
  count(*) filter (where status = 'executed') as executed,
  count(*) filter (where status = 'failed') as failed,
  count(*) as total
from public.ai_agent_runs r
where r.club_id = (select id from public.clubs where slug ilike '%allach%' limit 1)
  and r.created_at >= now() - interval '56 days';
```

**Pass:** `executed >= 10` and a written **incident log** in the review issue shows zero data incidents.

---

## PILOT-004 — Negative feedback rate

**Target:** Share of **thumbs-down** among rated messages **&lt;15%**, and **not increasing** month over month.

```sql
with pilot as (
  select id from public.clubs where slug ilike '%allach%' limit 1
),
rated as (
  select
    date_trunc('month', f.created_at) as month,
    count(*)::int as total,
    count(*) filter (where f.rating = -1)::int as negative
  from public.ai_message_feedback f
  join pilot p on p.id = f.club_id
  where f.created_at >= now() - interval '3 months'
  group by 1
)
select
  month,
  total,
  negative,
  round(100.0 * negative / nullif(total, 0), 1) as negative_pct
from rated
order by month desc;
```

**Pass:** Latest month `negative_pct < 15` and ≤ prior month (or only one month of data so far).

**Notes:** Low volume (&lt;5 ratings/month) — treat as indicative; encourage coaches to rate wrong answers.

---

## PILOT-005 — Qualitative (training planning)

**Target:** At least **one** Allach coach (trainer role) provides a direct quote or interview note equivalent to: *“I use AI 4 T for training planning.”*

**How to measure**

- 15-minute call or async message at **week 6–8**
- Record in monthly review issue:

```markdown
### PILOT-005 quote
- Coach: [name / role]
- Date:
- Quote: "..."
- Used for: [plan week / cancel session / duplicate week / chat only / other]
```

**Pass:** ≥1 credible training-planning use case documented.

---

## Phase 5 go / no-go (week 8)

| Metric | ID | Status |
|--------|-----|--------|
| Weekly coach usage | PILOT-001 | ☐ |
| Golden ≥90% | PILOT-002 | ☐ |
| Safe agent runs | PILOT-003 | ☐ |
| Low thumbs-down | PILOT-004 | ☐ |
| Training-planning quote | PILOT-005 | ☐ |

**All five green** → prioritize Phase 5 backlog in [`AI4T_ROADMAP.md`](./AI4T_ROADMAP.md).

**Any red** → open `ai4t-pilot` issues; fix regressions before Phase 5 features.

---

## Suggested 8-week calendar

| Week | Focus |
|------|--------|
| **W1** | Phase 0 done; start weekly PILOT-001 tracking |
| **W2–W3** | Coach onboarding; encourage Agent tab on Teams |
| **W4** | First monthly review (golden run + SQL) |
| **W5–W6** | Steady usage; collect feedback notes |
| **W7** | Second golden run if deploy changed prompts |
| **W8** | Final review + PILOT-005 interview + go/no-go |

---

*Last updated: 2026-06-24*
