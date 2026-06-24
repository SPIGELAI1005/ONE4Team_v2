# AI 4 T Agent — Concrete Implementation Plan

**Status:** Phases 0–4 implemented (2026-06-15); pilot Phases 1–4 extensions (2026-06-24) — team scope, duplicate week, public club Agent modal  
**Last updated:** 2026-06-24  
**Scope:** Club-scoped AI agent that **proposes** workflows and **executes** them only after explicit user confirmation — integrated with `/co-trainer` and contextual header shortcuts.

**Related code today:**
- Chat / scope: `src/pages/CoTrainer.tsx`, `supabase/functions/co-trainer`, `supabase/functions/_shared/ai4team_scope.ts`
- Club context: `src/lib/ai-context.ts`
- Permissions: `src/lib/permissions.ts`, `src/hooks/use-permissions.ts`
- Training writes (reference): `src/pages/Teams.tsx` (`handleAddSession`, `activities` / `training_sessions`)
- Member drafts (reference): `src/pages/Members.tsx`
- Announcements (reference): `src/pages/Communication.tsx`
- Header shell: `src/components/layout/DashboardHeaderSlot.tsx`, `DashboardTopBar.tsx`
- Plan gate: `src/components/plan-gate.tsx` (`feature="ai"`)
- Automation hook (async only): `enqueue_automation_run` RPC, `automation_rules` table

---

## 1. Goals and non-goals

### Goals
- Trainers/admins can run **workflows** from AI 4 T: create/update/cancel trainings, notify trainers, add member **drafts** (not silent invites).
- **Two-step safety:** `propose` → user reviews → `execute` (no silent LLM mutations).
- **Same RBAC** as manual UI (`schedule:write`, `members:write`, etc.).
- **Audit trail** per run (who, what, when, outcome).
- **Contextual entry:** full Agent tab on `/co-trainer` + Sparkles shortcut on key pages (Teams, Members, Activities).
- **Design parity:** glass cards, `rounded-2xl`, gradient-gold Confirm, Lucide icons, EN/DE i18n.

### Non-goals (v1)
- Player-initiated mutations (read-only / ask-only for players).
- Auto-execute without Confirm.
- General web search or off-club tools (extends existing `ai4team_scope.ts` policy).
- Replacing existing `/ai` page in v1 (Agent lives under `/co-trainer`; `/ai` can redirect later).
- Email/SMS delivery in v1 (use in-app **announcements** + optional link to Communication).

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Client                                                          │
│  CoTrainer (tab=agent) │ AiAgentSheet (header) │ page deep links│
│         └──────────────────┬──────────────────────────────────┘
│                            │ propose / execute + idempotency_key
└────────────────────────────┼────────────────────────────────────
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Edge: supabase/functions/ai4team-agent/index.ts                 │
│  • Auth + clubHasPlanFeature('ai') + rate limit                 │
│  • mode: propose | execute                                      │
│  • LLM tool-calling OR template workflows                       │
│  • execute → Postgres RPCs (service role + user_id arg)         │
└────────────────────────────┬────────────────────────────────────
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Postgres RPCs (security definer)                                │
│  agent_create_training, agent_cancel_training, …                 │
│  • is_club_trainer / is_club_admin checks inside RPC            │
│  • Same inserts as Teams.tsx / Members.tsx patterns             │
└────────────────────────────┬────────────────────────────────────
                             ▼
│  activities, training_sessions, club_member_drafts,             │
│  announcements, ai_agent_runs                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Principle:** Edge orchestrates; **RPCs own writes** so RLS + permission logic stays in one place and the React app can call the same RPCs later for “Apply suggestion” buttons.

---

## 3. Data model

### Migration: `supabase/migrations/20260615120000_ai_agent_runs.sql`

```sql
-- ai_agent_runs: audit + proposal lifecycle
create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in (
    'proposed', 'confirmed', 'executed', 'failed', 'cancelled', 'expired'
  )),
  intent text not null,                    -- e.g. 'create_training', 'plan_week'
  page_context jsonb not null default '{}',
  proposal jsonb not null default '{}',    -- structured steps + preview
  execution_result jsonb,
  error_message text,
  idempotency_key text,                    -- set on execute
  expires_at timestamptz,                  -- proposed rows expire (e.g. 24h)
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  executed_at timestamptz
);

create unique index if not exists idx_ai_agent_runs_idempotency
  on public.ai_agent_runs (club_id, user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_ai_agent_runs_club_user_created
  on public.ai_agent_runs (club_id, user_id, created_at desc);

alter table public.ai_agent_runs enable row level security;

-- SELECT: own runs + trainers see club runs (audit)
-- INSERT/UPDATE: own runs only via Edge (or authenticated insert for propose from client with strict RLS)
```

**RLS policies (sketch):**
- `select`: `user_id = auth.uid()` OR (`is_club_trainer(auth.uid(), club_id)` for club audit).
- `insert`: authenticated member of club, `user_id = auth.uid()`.
- `update`: own row only, status transitions validated in RPC `agent_confirm_run` / Edge.

### Optional v1.1: link to chat

Add nullable `conversation_id uuid references ai_conversations(id)` on `ai_agent_runs` when Agent is opened from Chat tab.

---

## 4. Tool registry (server)

### File: `supabase/functions/_shared/ai4team_agent_tools.ts`

Define tools as JSON-schema-like descriptors for the LLM + TypeScript executors:

| Tool id | Permission | RPC / action | v1 |
|---------|------------|--------------|-----|
| `list_teams` | `schedule:read` | read `teams` | ✅ |
| `list_upcoming_trainings` | `schedule:read` | read `activities` type training | ✅ |
| `create_training` | `schedule:write` | `agent_create_training` | ✅ |
| `update_training` | `schedule:write` | `agent_update_training` | Phase 2 |
| `cancel_training` | `schedule:write` | `agent_cancel_training` | ✅ |
| `create_member_draft` | `members:write` | `agent_create_member_draft` | Phase 2 |
| `send_club_announcement` | `schedule:write` or admin | `agent_send_announcement` | Phase 3 |
| `plan_training_week` | `schedule:write` | composite: N × `create_training` | Phase 3 |

### Migration: `supabase/migrations/20260615130000_ai_agent_tool_rpcs.sql`

**RPC signatures (implement in SQL):**

```sql
-- Returns activity id; mirrors Teams.tsx insert (activities first, fallback training_sessions)
create or replace function public.agent_create_training(
  _club_id uuid,
  _user_id uuid,
  _team_id uuid,
  _title text,
  _starts_at timestamptz,
  _ends_at timestamptz,
  _location text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_club_trainer(_user_id, _club_id) then
    raise exception 'not_authorized';
  end if;
  -- insert into activities (type training) … return jsonb_build_object('activity_id', id);
end;
$$;

create or replace function public.agent_cancel_training(
  _club_id uuid,
  _user_id uuid,
  _activity_id uuid,
  _reason text default null
) returns jsonb …;

create or replace function public.agent_create_member_draft(
  _club_id uuid,
  _user_id uuid,
  _payload jsonb  -- email, display_name, role, team, master_data subset
) returns jsonb …;
```

Each RPC must:
1. Verify `is_member_of_club(_user_id, _club_id)`.
2. Verify trainer/admin capability for the action.
3. Validate foreign keys (`team_id` belongs to club).
4. Return `{ "ok": true, "ids": { … }, "summary": "…" }` or raise with stable error codes.

**Grant:** `grant execute on function … to authenticated;` — Edge calls with user JWT context where possible; for execute batch, Edge passes `_user_id` from JWT and RPC re-checks.

---

## 5. Edge function: `ai4team-agent`

### File: `supabase/functions/ai4team-agent/index.ts`

**Request body:**

```ts
interface Ai4TeamAgentRequest {
  club_id: string;
  mode: "propose" | "execute";
  language?: "en" | "de";
  // propose
  message?: string;              // user natural language
  intent?: string;               // optional template id
  page_context?: AgentPageContext;
  // execute
  run_id?: string;               // ai_agent_runs.id
  idempotency_key?: string;      // client-generated uuid per Confirm click
}
```

**Response (propose):**

```ts
interface ProposeResponse {
  run_id: string;
  status: "proposed";
  summary: string;               // markdown for chat bubble
  proposal: {
    title: string;
    steps: AgentProposalStep[];  // typed preview rows
    warnings?: string[];
  };
}
```

**Response (execute):**

```ts
interface ExecuteResponse {
  run_id: string;
  status: "executed" | "failed";
  result: { links?: { label: string; href: string }[]; details?: string };
  error?: string;
}
```

**Flow:**
1. Reuse: `getUserIdFromRequest`, `clubHasPlanFeature`, `enforceLlmRateLimitOrResponse`, `detectObviousOffScope` on user message.
2. **propose:** Load club context snippet (reuse `buildClubContext` data fetch server-side or pass minimal context from client). Call LLM with tool definitions → parse structured proposal → insert `ai_agent_runs` status `proposed`, `expires_at = now() + interval '24 hours'`.
3. **execute:** Load run by id; verify `user_id`, `club_id`, status `proposed`, not expired; set `confirmed_at`; run tools in order; update `execution_result`; set status `executed` or `failed`. Honor `idempotency_key` unique index.

**Deploy:** `supabase functions deploy ai4team-agent`  
**Secrets:** same as `co-trainer` (`OPENAI_API_KEY`, etc.)

---

## 6. Client modules

### 6.1 Types and API

| File | Purpose |
|------|---------|
| `src/lib/ai-agent/types.ts` | `AgentPageContext`, `AgentProposal`, `AgentRunStatus`, intents |
| `src/lib/ai-agent/intents.ts` | Template catalog: id, label, required permission, default message |
| `src/lib/ai-agent/api.ts` | `proposeAgentRun()`, `executeAgentRun()` → fetch Edge |
| `src/lib/ai-agent/page-context.ts` | Build context from route + page state |

**`AgentPageContext`:**

```ts
interface AgentPageContext {
  source: "teams" | "members" | "activities" | "matches" | "communication" | "co-trainer";
  entityType?: "training" | "member" | "match" | "team";
  entityId?: string;
  teamId?: string;
  teamName?: string;
  extra?: Record<string, unknown>;
}
```

### 6.2 UI components

| Component | Location | Role |
|-----------|----------|------|
| `AiAgentWorkspace` | `src/components/ai-agent/AiAgentWorkspace.tsx` | Main Agent tab content: templates + thread + proposal list |
| `AiAgentProposalCard` | `src/components/ai-agent/AiAgentProposalCard.tsx` | Glass card: summary, step list, Edit / Cancel / Confirm |
| `AiAgentRunHistory` | `src/components/ai-agent/AiAgentRunHistory.tsx` | Recent runs (subset of History tab) |
| `AiAgentSheet` | `src/components/ai-agent/AiAgentSheet.tsx` | shadcn `Sheet` — compact agent from header |
| `AiAgentHeaderButton` | `src/components/ai-agent/AiAgentHeaderButton.tsx` | Sparkles `w-9 h-9 rounded-2xl` button |

**Proposal card UX (match Co-Trainer):**
- Container: `rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4`
- Confirm: `Button` with `bg-gradient-gold-static`
- Show role badge + club name like chat workspace header

### 6.3 Context provider

**File:** `src/contexts/ai-agent-context.tsx`

```ts
interface AiAgentContextValue {
  open: boolean;
  pageContext: AgentPageContext | null;
  openAgent: (ctx?: AgentPageContext) => void;
  closeAgent: () => void;
}
```

Wrap in `DashboardLayout` (same level as `DashboardTopBarProvider`).

### 6.4 Co-Trainer integration

**File:** `src/pages/CoTrainer.tsx` changes:

1. Extend `mainTab`: `"chat" | "agent" | "history"` (rename `"actions"` → merge into `"agent"` or keep actions as subsection).
2. URL: `?tab=agent&intent=plan-week&source=teams&teamId=…`
3. Extend URL consumer `useEffect` (lines ~385–397) for `tab=agent`, `intent`, `teamId`, `entityId`.
4. **History tab:** two sections — Saved chats (existing) + Workflow runs (`ai_agent_runs`).

**Recommended tab layout (4 tabs):**

| Tab | Content |
|-----|---------|
| Chat | Existing streaming chat |
| Agent | `AiAgentWorkspace` |
| Tools | Legacy generate plan/digest (from current Actions tab) — optional merge into Agent templates |
| History | Chats + runs |

If you prefer 3 tabs: **Agent** includes template cards + generate plan/digest at top.

### 6.5 Header shortcut

**Pattern A (minimal v1):** Each page adds to `DashboardHeaderSlot` `rightSlot`:

```tsx
<AiAgentHeaderButton context={{ source: "teams", teamId: selectedTeamId }} />
```

**Pattern B (preferred):** `DashboardTopBar` always shows Sparkles when `PlanGate` would allow AI (use `usePlanGuard('ai')`), opens `AiAgentSheet` with context from `AiAgentContext` set by the active page via `useRegisterAiAgentContext(pageContext)` hook.

**Pages — phase 1 shortcuts:**

| Route | Context passed |
|-------|------------------|
| `/teams` | `{ source: "teams", teamId }` |
| `/members` | `{ source: "members" }` |
| `/activities` | `{ source: "activities", entityId: selectedActivityId }` |
| `/matches` | `{ source: "matches", entityId: matchId }` |

Gate: `usePermissions()` — hide button if no `schedule:write` and no `members:write` (agent is for actors, not players).

---

## 7. Workflow catalog (v1 templates)

Define in `src/lib/ai-agent/intents.ts` + i18n `coTrainerPage.agentIntents.*`:

| Intent id | User label (EN) | Default prompt | Min role |
|-----------|-----------------|----------------|----------|
| `create_training` | Create training | "Schedule a training for {team} on …" | trainer |
| `cancel_training` | Cancel training | "Cancel the training on {date} for {team}" | trainer |
| `plan_week` | Plan training week | "Create Mon/Wed/Fri trainings for {team} next week" | trainer |
| `notify_trainers` | Notify trainers | "Announce tomorrow's training to all trainers" | trainer |
| `add_member_draft` | Add member (draft) | "Add draft member: …" | admin |

**Compound workflow example (`plan_week` + `notify_trainers`):**

Proposal steps:
1. `create_training` × 3 (preview dates/times)
2. `send_club_announcement` (preview title/body, audience trainers)

User confirms once; Edge executes sequentially; partial failure → status `failed` with completed step ids in `execution_result`.

---

## 8. i18n

**Namespace:** extend `coTrainerPage` in `src/i18n/en.ts` / `de.ts`:

- `tabAgent`, `agentTitle`, `agentSubtitle`, `agentConfirm`, `agentCancel`, `agentEdit`
- `agentIntents.createTraining`, …
- `agentRunStatus.proposed`, `executed`, `failed`
- `agentShortcutAria` (header button)
- User-facing errors: `agentErrorNotAuthorized`, `agentErrorExpired`, `agentErrorRateLimit`

**Support FAQ (later):** one FAQ under AI 4 T: “Can AI 4 T change my schedule?” → explains confirm step.

---

## 9. Security checklist

- [ ] Every execute path checks `clubHasPlanFeature('ai')` + trial/subscription (existing).
- [ ] `detectObviousOffScope` on propose message (reuse `ai4team_scope.ts`).
- [ ] RPCs use `security definer` but **always** validate `_user_id` from JWT, never trust client-only role.
- [ ] Proposal expiry (24h); execute rejects `expired`.
- [ ] Idempotency on Confirm (UUID in client state, stored on run).
- [ ] Rate limit: separate bucket or shared LLM limit — e.g. max 10 executes/hour/club in `edge_guard.ts`.
- [ ] Log to `ai_agent_runs` + optional `logStructured` with `facet: "ai4team_agent"`.
- [ ] No PII in proposal JSON sent to analytics; club-scoped only.

---

## 10. Phased delivery

### Phase 0 — Foundation (no UI) — ~2–3 days

| Task | Files |
|------|-------|
| Migration `ai_agent_runs` | `20260615120000_ai_agent_runs.sql` |
| RPCs `agent_create_training`, `agent_cancel_training` | `20260615130000_ai_agent_tool_rpcs.sql` |
| Shared tool types + executors | `_shared/ai4team_agent_tools.ts` |
| Edge skeleton propose/execute | `ai4team-agent/index.ts` |
| Unit tests for RPCs (SQL or integration) | optional `src/test/agent-rpcs.integration.test.ts` |

**Exit criteria:** curl/Postman can propose+execute create training for a trainer JWT in staging.

---

### Phase 1 — Agent tab on `/co-trainer` — ~3–4 days

| Task | Files |
|------|-------|
| Client API + types | `src/lib/ai-agent/*` |
| `AiAgentWorkspace`, `AiAgentProposalCard` | components |
| Co-Trainer tab + URL params | `CoTrainer.tsx` |
| i18n EN/DE | `en.ts`, `de.ts` |
| History: list runs | Co-Trainer History section |

**Workflows:** `create_training`, `cancel_training` only (templates + NL).

**Exit criteria:** Trainer creates/cancels training from Agent tab; sees run in History; Teams page shows new/cancelled session.

---

### Phase 2 — Header shortcut + member draft — ~2–3 days

| Task | Files |
|------|-------|
| `AiAgentContext` + `AiAgentSheet` | context + sheet |
| `useRegisterAiAgentContext` hook | hook |
| Header button on Teams, Members, Activities | respective pages + optional TopBar |
| RPC `agent_create_member_draft` | migration append |
| Intent `add_member_draft` | intents + Edge |

**Exit criteria:** From Members, open sheet, propose draft, confirm, row appears in Members pending import/drafts.

---

### Phase 3 — Notify trainers + week planning — ~3–4 days

| Task | Files |
|------|-------|
| RPC `agent_send_announcement` | migration |
| Composite `plan_training_week` in Edge | tool executor |
| Template cards in Agent workspace | UI |
| Link results to `/communication` or `/teams` | proposal result links |

**Exit criteria:** “Plan week + inform trainers” produces 3 sessions + one announcement visible in Communication.

---

### Phase 4 — Chat integration (optional) — ~2 days

| Task | Files |
|------|-------|
| Chat detects actionable reply → embed `AiAgentProposalCard` | `CoTrainer.tsx` stream parser or second API call |
| `conversation_id` on runs | migration |
| Deprecate duplicate Actions on `/ai` | redirect `/ai` → `/co-trainer?tab=agent` |

---

## 11. Testing plan

| Layer | Tests |
|-------|-------|
| RPC | Trainer can create; player JWT fails; wrong `team_id` fails |
| Edge | propose off-scope → refusal; execute twice same idempotency → single write |
| UI | Playwright: open Agent → template → confirm → assert activity row |
| Regression | Existing Co-Trainer chat still streams; PlanGate unchanged |

**Manual smoke (TSV Allach pilot):**
1. Pro plan or feature trial active.
2. Create training via Agent → visible on Teams calendar.
3. Cancel same via Agent.
4. Non-trainer account → button hidden or 403 on execute.

---

## 12. Documentation & ops (on ship)

Update in same PR as Phase 1:
- `CHANGELOG.md` — AI 4 T Agent section
- `MEMORY_BANK.md` — agent runs table + Edge name
- `DEPLOYMENT.md` — deploy `ai4team-agent`, apply migrations `20260615120000`, `20260615130000`
- `TASKS.md` — `AI-AGENT-001` … operator checklist
- `HOLD.md` — operator migration order

**Operator commands:**

```bash
supabase db push   # or apply migrations in dashboard
supabase functions deploy ai4team-agent
supabase functions deploy co-trainer   # only if shared scope changes
```

---

## 13. File checklist (summary)

### New files
```
supabase/migrations/20260615120000_ai_agent_runs.sql
supabase/migrations/20260615130000_ai_agent_tool_rpcs.sql
supabase/functions/ai4team-agent/index.ts
supabase/functions/_shared/ai4team_agent_tools.ts
src/lib/ai-agent/types.ts
src/lib/ai-agent/intents.ts
src/lib/ai-agent/api.ts
src/lib/ai-agent/page-context.ts
src/components/ai-agent/AiAgentWorkspace.tsx
src/components/ai-agent/AiAgentProposalCard.tsx
src/components/ai-agent/AiAgentSheet.tsx
src/components/ai-agent/AiAgentHeaderButton.tsx
src/contexts/ai-agent-context.tsx
src/hooks/use-register-ai-agent-context.ts
docs/AI4TEAM_AGENT_IMPLEMENTATION_PLAN.md  (this file)
```

### Modified files
```
src/pages/CoTrainer.tsx
src/i18n/en.ts
src/i18n/de.ts
src/components/layout/DashboardLayout.tsx   (provider)
src/pages/Teams.tsx                         (header shortcut)
src/pages/Members.tsx                       (header shortcut)
src/pages/Activities.tsx                    (header shortcut)
supabase/functions/_shared/ai4team_scope.ts (agent policy paragraph)
CHANGELOG.md, MEMORY_BANK.md, DEPLOYMENT.md, TASKS.md
```

---

## 14. Open decisions (resolve before Phase 1 coding)

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | 3 vs 4 tabs on Co-Trainer | **Done (2026-06-15):** **3 tabs** — Chat \| Agent \| History; Quick actions merged into Agent |
| 2 | LLM tool-calling vs rule-based templates for v1 | **Templates + NL for propose** with LLM filling slots; fewer hallucinated writes |
| 3 | Announcement audience | v1: insert into `announcements` with club-wide or trainer role tag; no push email |
| 4 | `activities` vs `training_sessions` | Match `Teams.tsx`: try `activities` first, fallback `training_sessions` inside RPC |
| 5 | Player sees Agent? | **No write button**; players keep Chat-only quick prompts |

---

## 15. Success metrics (pilot)

- ≥1 training created via Agent per trainer session (Allach pilot).
- Zero unconfirmed DB writes from Agent path (audit query: no `executed` without `confirmed_at`).
- Support tickets: no increase in “AI changed my schedule without asking” (confirm UX clear).

---

*End of plan — implement Phase 0 first, then Phase 1 for a demonstrable vertical slice.*
