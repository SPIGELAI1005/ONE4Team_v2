# AI 4 T golden questions (pilot harness)

Fixed question set for **TSV Allach 09** and similar pilot clubs. Use before/after each `co-trainer` deploy to catch regressions in context assembly and answer quality.

**Related:** [`AI4T_ROADMAP.md`](./AI4T_ROADMAP.md) Phase 1 · Task **`AI4T-P1-001`** in [`TASKS.md`](../TASKS.md)

---

## Automated (CI — no LLM)

Validates **club context assembly** (timezone, schedule lines, section structure) without Supabase or an LLM.

| File | Role |
|------|------|
| `src/lib/ai-context-golden.ts` | Golden cases + `runGoldenContextAssertions()` |
| `src/lib/ai-context.test.ts` | Vitest unit + golden harness |
| `src/lib/ai-context.ts` | `formatContextDateTime`, `formatActivityScheduleLine`, `buildClubContext` |

```bash
npm test -- src/lib/ai-context.test.ts
```

### Context assertions (automated)

| ID | Example question | Automated pass criteria |
|----|------------------|------------------------|
| GQ-01 | When is U12-1 training this week? | `16:00Z` → `18:00` in `Europe/Berlin`; team on schedule line |
| GQ-02 | How many active members do we have? | Members section includes `Active members: N` pattern |
| GQ-03 | What matches are coming up? | Upcoming matches section + fixture line |
| GQ-04 | U12-I vs U12-1 team naming | Roman numeral `team: U12-I` on schedule line |
| GQ-05 | German locale formatting | `formatContextDateTime` with `de` locale returns Berlin local time |

---

## Manual E2E (LLM + live club)

Run in **AI 4 T Chat** (`/co-trainer`) as Allach **trainer/admin** after Phase 0 deploy. Compare answers to **Teams & Trainings** and dashboard counts.

| ID | Question (EN) | Question (DE) | Pass criteria |
|----|---------------|---------------|---------------|
| GQ-01 | When is U12-1 training? | Wann ist das U12-1 Training? | Correct weekday + **local** time (e.g. 18:00); matches Teams UI |
| GQ-02 | What trainings are this week? | Welche Trainings sind diese Woche? | List matches schedule module for next 7 days |
| GQ-03 | Next match for [team]? | Nächstes Spiel für [Team]? | Correct opponent/date or “none listed” — no invented fixture |
| GQ-04 | How many active members? | Wie viele aktive Mitglieder haben wir? | Matches dashboard or states data not in context |
| GQ-05 | Who are you? | Wer bist du? | **AI 4 T** branding; not AI4Team / ONE4Team |
| GQ-06 | Buy shoes online | Schuhe online kaufen | Short off-scope redirect + club-focused suggestions |
| GQ-07 | Summarize this week’s schedule | Fass den Wochenplan zusammen | Times quoted exactly from context; **Sources:** when data-backed |
| GQ-08 | Who is on the U12 roster? | Wer ist im U12-Kader? | Names only from roster snapshot; no invented players |
| GQ-09 | Any unpaid dues? (admin) | Gibt es offene Beiträge? | Admin: count or “not available”; player: dues omitted |
| GQ-10 | Plan focus for Tuesday session | Trainingsschwerpunkt für Dienstag | Actionable coaching advice; cites schedule if session exists |

### Public embed (optional)

Repeat **GQ-01**, **GQ-05**, **GQ-06** on `/club/tsv-allach-09` signed-in modal.

### Scoring (monthly pilot run)

- **Pass:** meets pass criteria without invented club facts.
- **Fail:** wrong time zone, wrong team, invented member/score, or wrong product name.
- Target: **≥90%** pass rate — tracked as **AI4T-PILOT-002**; see [`AI4T_PILOT_SUCCESS_METRICS.md`](./AI4T_PILOT_SUCCESS_METRICS.md).

Log failures as GitHub issues with label `ai4t-pilot` and golden ID (e.g. `GQ-01`).

---

## Agent workflows (manual, separate from chat golden set)

| ID | Action | Pass criteria |
|----|--------|---------------|
| GW-01 | Teams → Plan training week | Proposal → confirm → `ai_agent_runs` = executed |
| GW-02 | Teams → Cancel training | Same; no duplicate on idempotent re-confirm |
| GW-03 | Teams → Notify trainers | Announcement proposal visible before confirm |

---

## Extending

1. Add a row to `AI4T_GOLDEN_QUESTIONS` in `src/lib/ai-context-golden.ts` (automated) and/or the manual table above.
2. Add matching assertion in `runGoldenContextAssertions()` for context-only checks.
3. Add Vitest coverage in `src/lib/ai-context.test.ts`.
4. Update this doc and note in release / smoke issue.

---

*Last updated: 2026-06-24*
