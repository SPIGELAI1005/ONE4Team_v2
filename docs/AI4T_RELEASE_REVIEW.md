# AI 4 T release review (pilot → production)

Last updated: 2026-07-01

## Shipped in this batch

| Area | Change |
|------|--------|
| Player / member safety | Agent tab hidden for player/member personas; chat context scoped by gate role + team IDs |
| Persona hint | Dual-role users see Settings persona reminder in AI 4 T chat |
| Chat UX | Thread trim before API (`prepareChatMessagesForApi`), follow-up chips, mapped edge errors (DE/EN) + Settings link |
| Public club modal | `?team=` scope in embed context; Guide tab role can/cannot lists |
| History | Agent run filters by intent and status; outcome links unchanged |
| Admin home | `get_club_ai_usage_stats` widget (7-day window) on club admin dashboard |
| Partner portal | Marketplace listing/requests/offers injected into partner chat context |
| Ops SQL | `supabase/scripts/ai4t_review_negative_feedback.sql`, `ai4t_agent_smoke_checklist.sql` |

## Pilot ops (manual, not automatable here)

1. **Golden questions** — Run [AI4T_GOLDEN_QUESTIONS.md](./AI4T_GOLDEN_QUESTIONS.md) on TSV Allach trainer account; log failures as `ai4t-pilot` GitHub issues.
2. **Feedback review** — Run negative-feedback SQL weekly; triage themes into prompts or context fixes.
3. **Agent smoke** — Plan week, cancel training, notify trainers; verify `ai_agent_runs` + `execution_result.links`.
4. **Coach interview** — Ask one real coach: *Which single action would you use AI for every week?* Build only that next.

## Deferred (post-pilot)

| Item | Phase | Notes |
|------|-------|-------|
| Partner listing/offer/message propose→confirm→execute | Partner 2.x | Context only; full workflows mirror club agent pattern |
| `ai4team-agent` `portal: "partner"` edge mode | Partner 2.x | Separate tool surface without training RPCs |
| E2E Playwright (chat golden + agent idempotency) | QA | Skeleton in `e2e/ai4t-smoke.spec.ts`; enable in CI when auth fixtures exist |
| Rate limits per role | 4.3 | Protect cost/abuse after pilot metrics |
| Model routing (cheap classify, strong answer) | 4.x | After usage baseline |
| Observability dashboard (correlation IDs, latency) | 4.x | `request_context.ts` logging exists; UI TBD |
| RAG (club docs, FAQ, PDFs) | 5 | Only after pilot passes |

## Release gate

- [x] `AI4T-PILOT-001`–`005` metrics green *(operator OK 2026-07-16)*
- [ ] No P0 on player/member data leakage in scoped contexts
- [ ] DE prompt review by native coach (`ai-4-t-role-prompts.ts`)
- [ ] `DEPLOY-*` smokes and `RBAC-PERSONA-SMOKE` from TASKS.md

See also [AI4T_ROADMAP.md](./AI4T_ROADMAP.md) and [AI4T_PILOT_SUCCESS_METRICS.md](./AI4T_PILOT_SUCCESS_METRICS.md).
