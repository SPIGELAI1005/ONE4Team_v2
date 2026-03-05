# Phase 12 Validation Matrix

Use this after Phase 12 migrations are applied and verified.

## Preconditions
- `supabase/PHASE12_VERIFY.sql` returns all `ok = true`.
- Test users available: `admin`, `trainer`, `member`.
- One public club with configurable onboarding settings.

## 1) Public join flow

### Case A: manual + admin_only
1) Set club `join_approval_mode=manual`, `join_reviewer_policy=admin_only`.
2) Logged-in non-member requests join from public club page.
3) Verify request appears in Members -> Invites.
4) Admin approves.
5) Verify membership created and request marked approved.

Expected:
- Trainer cannot approve in this mode.
- Member is added with default role/team settings.

### Case B: manual + admin_trainer
1) Set `join_reviewer_policy=admin_trainer`.
2) Create pending join request.
3) Approve with trainer account.

Expected:
- Trainer can approve.
- Membership is created correctly.

### Case C: auto mode
1) Set `join_approval_mode=auto`.
2) Logged-in non-member requests join from public club page.

Expected:
- Immediate `joined` outcome.
- Membership active with configured defaults.
- User lands in dashboard context.

## 2) Member draft flow
1) Open Members -> Add Member.
2) Import spreadsheet with valid and invalid rows.
3) Save selected rows to draft list.
4) Send invite for a single draft.
5) Remove a draft row.

Expected:
- Validation blocks invalid rows.
- Draft and invited statuses update correctly.
- Invite appears in active invites list.

## 3) Abuse controls operational checks
1) Trigger repeated join/invite attempts to exceed identifier limit.
2) Trigger burst attempts from same device fingerprint.
3) Trigger repeated blocks to activate escalation cooldown.

Expected:
- Requests blocked with user-facing throttling message.
- Abuse overview counters increase.
- Active abuse alerts appear in Members -> Invites.
- Reviewer can resolve an alert.

## 4) Auth continuity checks
1) Open protected route while logged out: `/onboarding?invite=test&club=demo`.
2) Verify redirect to `/auth` includes `returnTo`.
3) Complete login and verify return to requested target.

Expected:
- No context loss for protected deep links.
- Club join intent survives auth roundtrip.

## Sign-off
- [ ] All cases passed in staging.
- [ ] All critical defects fixed or explicitly waived.
- [ ] Go/No-Go decision recorded in `RELEASE_NOTES_PHASE12.md`.

