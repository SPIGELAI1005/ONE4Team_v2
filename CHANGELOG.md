# ONE4Team (clubhub-connect) — CHANGELOG

This log is maintained by the agent during local-first execution.
It records notable changes, features, and hardening steps.

## 2026-02-13
### Trainer-first UX pass (Schedule / Dues / Partners / Dashboard / Profile)
- Schedule became the central hub:
  - Added filters (type/team/mine/past)
  - Added trainer attendance summaries per activity
  - Added trainer attendance detail drawer (confirmed/declined/unconfirmed + member lists)
  - Added "Week template" action (creates 2 trainings + 1 match, uses team filter if set)
  - Added "Nudge unconfirmed" placeholder (copies message to clipboard; real send is HOLD)
- Dues improvements:
  - Added bulk create dues for active members (with role filter)
  - Include member display names in UI and CSV export
- Partners improvements:
  - Contact-card fields (website/email/phone/notes)
  - Search across partner fields
- Dashboard improvements:
  - Added trainer "Getting started" checklist
  - Best-effort upcoming list + KPIs from DB when available (falls back safely when not)
- Player profile polish:
  - Added dues summary (due/paid) as best-effort block in Overview
- Navigation polish:
  - Trainer sidebar + mobile nav include Schedule

### Phase 7 hardening (local readiness)
- Auth redirect semantics: protected routes redirect to `/auth`.
- ErrorBoundary + minimal logger wired.
- Health/debug endpoint: `/health`.
- E2E:
  - Playwright scaffold with webServer.
  - Route smoke coverage and protected-route redirect coverage.
  - CI runs Playwright (installs browsers).
- Bundle report:
  - Added `npm run build:report` / `bundle:report`.

## Previous phases (local readiness)
- Phase 2: activities + attendance (bundle + page + audits)
- Phase 3: matches + stats (bundle + docs)
- Phase 4: manual dues (bundle + Dues page)
- Phase 5: partners stub (bundle + placeholder page)
- Phase 6: AI hub (ai_requests logging + stub copilots)

---

## HOLD (requires Supabase / infra)
See `HOLD.md`.
