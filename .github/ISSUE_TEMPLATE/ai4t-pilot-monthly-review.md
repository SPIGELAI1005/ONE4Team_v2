---
name: AI 4 T pilot monthly review
about: Weekly/monthly pilot metrics — gate before Phase 5
title: "[AI4T] Pilot review — "
labels: ai4t-pilot
assignees: ''
---

## Review context

- **Club:** TSV Allach 09
- **Review period:** <!-- e.g. 2026-07-01 → 2026-07-31 -->
- **Week of pilot:** <!-- W1–W8 -->
- **Metrics guide:** [`docs/AI4T_PILOT_SUCCESS_METRICS.md`](../../docs/AI4T_PILOT_SUCCESS_METRICS.md)
- **Tasks:** `AI4T-PILOT-001`–`005` in [`TASKS.md`](../../TASKS.md)

---

## PILOT-001 — Weekly coach usage (≥3 coaches, 4 consecutive weeks)

Paste SQL output from [metrics doc § PILOT-001](../../docs/AI4T_PILOT_SUCCESS_METRICS.md#pilot-001--weekly-coach-usage):

| Week starting | Coaches active | ≥3? |
|---------------|----------------|-----|
| | | ☐ |
| | | ☐ |
| | | ☐ |
| | | ☐ |

- [ ] **PILOT-001** pass (last 4 weeks all ≥3)

---

## PILOT-002 — Golden questions ≥90%

```bash
npm test -- src/lib/ai-context.test.ts
```

- [ ] Automated context tests green

Manual run: [`docs/AI4T_GOLDEN_QUESTIONS.md`](../../docs/AI4T_GOLDEN_QUESTIONS.md)

| ID | Pass? | Notes |
|----|-------|-------|
| GQ-01 | ☐ | |
| GQ-02 | ☐ | |
| GQ-03 | ☐ | |
| GQ-04 | ☐ | |
| GQ-05 | ☐ | |
| GQ-06 | ☐ | |
| GQ-07 | ☐ | |
| GQ-08 | ☐ | |
| GQ-09 | ☐ | |
| GQ-10 | ☐ | |

**Pass rate:** <!-- e.g. 9/10 = 90% -->

- [ ] **PILOT-002** pass (≥90%)

---

## PILOT-003 — Safe agent runs (≥10 executed, zero incidents)

Paste `get_club_ai_usage_stats` or SQL from [metrics doc § PILOT-003](../../docs/AI4T_PILOT_SUCCESS_METRICS.md#pilot-003--safe-agent-runs):

- Executed: 
- Failed: 
- Data incidents this period: <!-- 0 required -->

- [ ] **PILOT-003** pass

---

## PILOT-004 — Negative feedback rate (&lt;15%, trending down)

Paste SQL from [metrics doc § PILOT-004](../../docs/AI4T_PILOT_SUCCESS_METRICS.md#pilot-004--negative-feedback-rate):

| Month | Rated | Negative | % |
|-------|-------|----------|---|
| | | | |

- [ ] **PILOT-004** pass

---

## PILOT-005 — Qualitative (week 6–8)

### Coach quote

- **Coach:** 
- **Date:** 
- **Quote:** 
- **Used for:** 

- [ ] **PILOT-005** pass (training planning use case documented)

---

## Phase 5 go / no-go

- [ ] All five metrics green → **approve Phase 5 prioritization**
- [ ] One or more red → **defer Phase 5**; link follow-up issues below

### Follow-up issues

<!-- ai4t-pilot labeled issues -->

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Pilot lead | | |
