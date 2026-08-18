# ONE4Team — Activity domain model (Waves 1–2)

**Date:** 2026-08-08
**Status:** Mapping only — no destructive merge of `matches` / `events` into a single table.

## Canonical RSVP parent

| Concept | Storage | Notes |
|---------|---------|--------|
| **Activity** | `public.activities` | `type` ∈ `training` \| `match` \| `event` |
| **Attendance** | `public.activity_attendance` | One row per `(activity_id, membership_id)` |
| **Planned availability** | `public.member_availability` | Independent of RSVP; overlap = hint only |
| **Reminder log** | `public.activity_attendance_reminder_log` | Idempotent missing-response sends |

## Related product tables (do not replace)

| Concept | Table | Relation to activities |
|---------|-------|------------------------|
| Match fixtures / scores | `matches` | Soft-mapped for RSVP; lineups in `match_lineups` (selection ≠ RSVP) |
| Training sessions (legacy) | `training_sessions` | Prefer writing trainings to `activities`; fallback still exists |
| Club events / camps | `events` | Festival content; RSVP should converge on `activity_attendance` over time |
| Pitch bookings | `pitch_bookings` | Linked via `activities.pitch_booking_id` |

## Attendance statuses (Wave 1)

```text
invited | confirmed | declined | attended | maybe
```

| Status | Meaning |
|--------|---------|
| `invited` / missing row on roster | Unanswered |
| `confirmed` / `attended` | Coming |
| `declined` | Not coming (+ `notes` / `response_reason`) |
| `maybe` | Tentative |

Actor metadata: `responded_by`, `responded_at` (set by RPC).

## Activity flags (Wave 2)

- `response_deadline` — closes RSVP when set (plus training 1h cutoff)
- `response_required` / `automatic_reminders` — trainer create options; feed reminder RPC

## Privileged write path

`upsert_activity_attendance_response(activity_id, membership_id, status, notes, response_reason)`

Allows: self · guardian link · shared login email · club admin/trainer/team_management (manage).

Enforces training deadline (1h before start) or `activities.response_deadline` for non-managers.

Availability: `upsert_member_availability` / `delete_member_availability`
Reminders: `remind_missing_activity_attendance(activity_id, reminder_type)`

## Desired conceptual types (map, do not invent enum yet)

```text
TRAINING → activities.type = training
MATCH → activities.type = match (+ matches row for fixture detail)
TOURNAMENT / CLUB_EVENT / TEAM_EVENT → events +/or activities.type = event
MEETING / OTHER → activities.type = event (or extend later)
```

## Client entry points

- Dashboard: `src/pages/Activities.tsx`
- My Data availability: `src/components/members/member-availability-panel.tsx`
- Public: `src/hooks/use-public-club-attendance.ts`
- Domain: `src/lib/training-attendance.ts`, `src/lib/activity-attendance-api.ts`, `src/lib/member-availability.ts`
- Access helpers: `src/lib/activity-attendance-access.ts`
