# Team Ops operator acceptance — 2026-08-16 hardening

Use a disposable staging club. Do not run the fixture or cleanup steps against production.

## Verification status — 2026-08-18

- Local gates pass: ESLint, 754 unit tests (14 credential-gated integration skips), phase-0 audit, build, and bundle budget.
- Team Ops Playwright executed 14 tests with zero skips: **3 passed / 11 failed**.
- Remaining failures require distinct role-correct fixture accounts, deterministic active-club selection, and duplicate transition-selector cleanup.
- Four activities created outside the intended staging club during diagnostics were deleted.
- Reminder cron execution logs have not yet been captured for final acceptance.
- Invite creation can show `Unauthorized` when the browser carries a stale JWT; sign out/in and revoke/recreate exposed invite links. Permanent client refresh plus one 401 retry remains open.

This is a release handoff, not production approval. Continue with the steps below until the acceptance target is **14 passed / 0 failed / 0 skipped** and cron evidence is stored.

## 1. Confirm the deployed baseline

From the repository root:

```powershell
supabase migration list --linked
supabase functions list
supabase secrets list
```

Expected:

- Local and remote both contain `20260816120000` and `20260816130000`.
- `calendar-ics` and `process-attendance-reminders` are `ACTIVE`.
- `ATTENDANCE_REMINDER_CRON_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` exist.

The 2026-08-16 migration and updated `calendar-ics` function were applied to the linked project during implementation.

## 2. Prepare the staging identities

Create seven dedicated, email-confirmed users under **Supabase → Authentication → Users**. Use unique staging-only email addresses and one strong shared temporary password if your security policy permits.

| Fixture | Base role | Team setup | Additional setup |
|---|---|---|---|
| Admin | `admin` | optional | Club-admin assignment |
| Trainer | `trainer` | Coach on Team A | Can create activities and tasks |
| Parent | `parent` | none | Guardian of Child |
| Child | `player` | Player on Team A | Ward of Parent, Player+Parent and Trainer+Parent |
| Ordinary Player | `player` | Player on Team A | No parent assignment and no guardian link |
| Player+Parent | `player` | Player on Adult Team | Guardian of Child; parent assignment must exist |
| Trainer+Parent | `trainer` | Coach on Team A | Guardian of Child; parent assignment must exist |

In ONE4Team:

1. Sign in as Admin.
2. Open **Members** and invite/add all seven users to the same staging club.
3. Assign the base roles shown above.
4. Add Trainer and Trainer+Parent as coaches on Team A.
5. Add Child and Ordinary Player as players on Team A.
6. Add Player+Parent to an adult team.
7. Open Child → **Safety & Emergencies → Linked guardians / parents**.
8. Link Parent, Player+Parent and Trainer+Parent.
9. Reload each dual-role account in **Settings** and confirm a `parent` row exists in its effective roles.
10. Record the exact display names for Parent, Child and Ordinary Player.

Do not manually grant Parent to Ordinary Player. That account is the negative authorization fixture.

## 3. Configure authenticated Playwright

In the same PowerShell window:

```powershell
$env:E2E_TRAINER_EMAIL="trainer-staging@example.com"
$env:E2E_TRAINER_PASSWORD="<temporary-password>"
$env:E2E_PARENT_EMAIL="parent-staging@example.com"
$env:E2E_PARENT_PASSWORD="<temporary-password>"
$env:E2E_CHILD_DISPLAY_NAME="E2E Child"

$env:E2E_PARENT_DISPLAY_NAME="E2E Parent"
$env:E2E_EXCLUDED_MEMBER_DISPLAY_NAME="E2E Ordinary Player"
$env:E2E_PLAYER_EMAIL="player-staging@example.com"
$env:E2E_PLAYER_PASSWORD="<temporary-password>"
$env:E2E_PLAYER_PARENT_EMAIL="player-parent-staging@example.com"
$env:E2E_PLAYER_PARENT_PASSWORD="<temporary-password>"
$env:E2E_TRAINER_PARENT_EMAIL="trainer-parent-staging@example.com"
$env:E2E_TRAINER_PARENT_PASSWORD="<temporary-password>"

$env:E2E_ACTIVE_CLUB_NAME="<staging club name>"
$env:PW_NO_REUSE_SERVER="1"
```

The root `.env` must contain the real staging `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Run:

```powershell
npm run e2e:team-ops
```

The command fails before Playwright if any required fixture value is missing. Acceptance requires:

- No failed tests.
- No skipped tests.
- Family scope tests pass.
- Ordinary Player has no Parent persona.
- Player+Parent and Trainer+Parent have the Parent persona.
- Duty creation/claim and two-trainer ledger approval pass.

## 4. Parent Members and persona checks

### Parent account

1. Sign in as Parent.
2. Open `/members`.
3. Confirm the roster contains exactly Parent and Child.
4. Search for Child by name; Child must remain visible.
5. Search for Ordinary Player; no result or personal data may be returned.
6. Open Settings; Parent persona is available.

### Ordinary Player

1. Sign in as Ordinary Player.
2. Open Settings.
3. Confirm Player is available and Parent is absent.
4. Navigate directly to `/dashboard/parent_supporter`.
5. Confirm the app resolves back to an authorized persona.

### Player+Parent and Trainer+Parent

1. Sign in to each account.
2. Confirm Parent appears in Settings.
3. Select Parent and open Members: only self + Child.
4. Switch back to Player or Trainer.
5. Open Members: Player follows player access; Trainer sees the authorized team/staff roster.

## 5. Attendance, capacity and availability

1. As Trainer, create a Team A training at least two days in the future.
2. Set a response deadline and enable automatic reminders.
3. Set capacity to `1`.
4. As Parent, RSVP **Coming** for Child.
5. As Ordinary Player, RSVP **Coming** at nearly the same time from another browser.
6. Expected: exactly one `confirmed`; the other is `waitlisted`.
7. Change the confirmed response to **Not coming** with a reason.
8. Expected: the first waitlisted member is promoted to `confirmed`.
9. Attempt a parent RSVP after the deadline.
10. Expected: `rsvp_closed`.
11. As Trainer, override the Child status to **Attended**.
12. Expected: the attendance report includes the attended result.
13. As Parent, add an unavailable window for Child that overlaps a second training.
14. Expected: the training card/trainer view shows the availability conflict.

## 6. Notification opt-out

1. Leave Child and Ordinary Player without an RSVP on a new training.
2. As Ordinary Player, open Settings and disable **Training reminders**.
3. As Parent/Child fixture, leave Training reminders enabled.
4. As Trainer, run **Remind missing RSVP**.
5. Expected:
   - Child/eligible opted-in user receives the in-app reminder.
   - Ordinary Player receives no in-app reminder and no email.
6. Re-enable Training reminders but disable the general **Email** switch.
7. Trigger a different reminder type/deadline key.
8. Expected: in-app notification exists, but no email is sent.

Use Supabase SQL Editor to verify:

```sql
select user_id, title, created_at
from public.notifications
where reference_id = '<activity-id>'::uuid
order by created_at desc;

select membership_id, reminder_type, deadline_key, sent_at
from public.activity_attendance_reminder_log
where activity_id = '<activity-id>'::uuid
order by sent_at desc;
```

## 7. Duties, checklists, polls, transport, guests and ledger

### Duties and checklists

1. Trainer creates a claimable duty with two slots.
2. Parent claims one slot.
3. Expected: one filled slot and no duplicate claim.
4. Trainer creates an activity checklist and completes each item.
5. Expected: readiness badge changes from incomplete to ready, including realtime updates.

### Polls

1. Trainer creates a Yes/No poll.
2. Parent votes Yes.
3. Ordinary Player votes No.
4. Trainer closes the poll.
5. Expected: totals are correct and further votes are rejected.

### Transport

1. Trainer offers one seat on an activity.
2. Parent requests the seat.
3. Expected: request is pending.
4. Driver accepts it.
5. Expected: seat count becomes full and additional requests are rejected.
6. Driver or rider declines/cancels the accepted request.
7. Expected: the seat becomes available again.

### Guests

1. Trainer adds a guest with a unique `e2e-guest-<timestamp>@example.com` address.
2. Convert the guest using **Draft + invite**.
3. Expected: one draft, one invite and no second conversion.

### Team ledger

1. Trainer submits an incoming `12.34 EUR` entry with an `E2E Ledger` description.
2. Confirm the balance does not change while status is pending.
3. Trainer+Parent approves the entry.
4. Confirm the balance increases by `12.34 EUR`.
5. Submit a second entry, reject it, resubmit it and approve it.
6. Expected: only approved entries affect the balance.

## 8. ICS boundary checks

### Self/family feed

1. As Parent, open the calendar subscription card and create a feed.
2. Open the URL in a private browser or calendar client.
3. Expected: only activities for Parent and linked Child teams/attendance appear.
4. Confirm an unrelated team activity is absent.

### Authorization boundaries

- Ordinary Player requesting `club` scope must receive `club_scope_forbidden`.
- Ordinary Player requesting an unrelated `team` scope must receive `team_scope_forbidden`.
- Parent requesting Child's team scope may succeed.
- Trainer/Admin requesting an authorized club scope may succeed.
- Revoke each feed and confirm the URL returns HTTP 404.

These checks should be automated with staging JWT RLS tests before production if club/team feed controls are exposed in the UI.

## 9. PWA check

1. Clear site data and unregister existing service workers.
2. Directly open `/activities`, `/members`, `/tasks` and `/settings` in separate clean sessions.
3. In DevTools → Application → Service Workers, confirm `/sw-dashboard.js` is registered.
4. Confirm authenticated API responses are not cached and offline navigation fails safely.

## 10. Local release gates

```powershell
npm run lint
npm test
npm run audit:phase0
npm run build
npm run budget:bundle
```

All five commands must exit with code `0`.

## 11. Verify hourly reminder execution

In Supabase SQL Editor:

```sql
select jobid, schedule, active, command
from cron.job
where command ilike '%process-attendance-reminders%';

select status, start_time, end_time, return_message
from cron.job_run_details
where jobid in (
  select jobid
  from cron.job
  where command ilike '%process-attendance-reminders%'
)
order by start_time desc
limit 20;
```

Expected:

- One active hourly job (`0 * * * *` or equivalent).
- Recent successful runs.
- Edge Function logs for `process-attendance-reminders` show HTTP 200 and no repeated errors.

## 12. Clean staging data

Prefer deleting test records through the app. If necessary, run the following only after replacing `<staging-club-id>`:

```sql
begin;

delete from public.activities
where club_id = '<staging-club-id>'::uuid
  and title like 'E2E %';

delete from public.club_polls
where club_id = '<staging-club-id>'::uuid
  and title like 'E2E Poll %';

delete from public.club_tasks
where club_id = '<staging-club-id>'::uuid
  and title like 'E2E Duty %';

delete from public.team_ledger_entries
where club_id = '<staging-club-id>'::uuid
  and description like 'E2E Ledger %';

delete from public.club_invites
where club_id = '<staging-club-id>'::uuid
  and email like 'e2e-guest-%@example.com';

delete from public.club_member_drafts
where club_id = '<staging-club-id>'::uuid
  and email like 'e2e-guest-%@example.com';

commit;
```

Keep the seven dedicated identities if they will be reused by CI. Otherwise remove their club memberships in ONE4Team and delete the users from Supabase Authentication.
