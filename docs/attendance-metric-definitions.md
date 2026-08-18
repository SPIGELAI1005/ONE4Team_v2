# Attendance metric definitions (Wave 5)

**Date:** 2026-08-08
**Status:** Canonical definitions for Reports / AI-safe summaries. Implement UI against these names only.

## Scope

Metrics are derived from:

- `public.activities` (`type` ∈ `training` | `match`)
- `public.activity_attendance`
- Roster eligibility via team players / club players (same rules as Activities RSVP)

Club finance metrics are **out of scope** (see Payments / Financial reports).

## Status vocabulary

| Status | Counts as **responded** | Counts as **coming** | Counts as **declined** | Counts as **maybe** |
|--------|-------------------------|----------------------|------------------------|---------------------|
| `invited` / missing row | no | no | no | no |
| `confirmed` | yes | yes | no | no |
| `attended` | yes | yes | no | no |
| `declined` | yes | no | yes | no |
| `maybe` | yes | no | no | yes |

## Core metrics

### 1. Response rate

```text
response_rate = responded_count / eligible_count
```

- **eligible_count** — roster members invited to the activity (team roster or club players when no team).
- **responded_count** — eligible members with a responded status (table above).
- If `eligible_count = 0`, response rate is `null` (do not show 0%).

### 2. Coming rate

```text
coming_rate = coming_count / eligible_count
```

- **coming_count** — `confirmed` + `attended`.
- Optional display: `coming_count / responded_count` labeled **coming among responders** (different metric — never mix labels).

### 3. Missing responders

```text
missing_count = eligible_count - responded_count
```

Same population as Wave 2 `findMissingAttendanceResponders`.

### 4. Window aggregates

For a date window `[from, to)` on `activities.starts_at`:

| Metric id | Definition |
|-----------|------------|
| `activities_in_window` | Count of training+match activities in window (scoped to club / team) |
| `avg_response_rate` | Mean of per-activity `response_rate` (skip nulls) |
| `avg_coming_rate` | Mean of per-activity `coming_rate` (skip nulls) |
| `total_missing` | Sum of `missing_count` across activities |
| `rsvp_gap_activities` | Count of activities with `missing_count > 0` |

## Scoping rules

| Surface | Scope |
|---------|--------|
| Club admin Reports → Attendance | All club teams (optional team filter) |
| Trainer / Team Management | Teams they coach / manage only |
| Player | Own membership rows only (self rates) — not club leaderboard |

Authorization: `canViewAttendanceAnalytics` (reports access or attendance manage). **Never** gate behind `payments:full`.

## Non-goals (Wave 5)

- Waitlist / capacity fill rate
- Soft-invite undercounting fixes beyond current roster math
- Public club exposure of decline reasons
- Mixing team ledger / cashbox into attendance cards
