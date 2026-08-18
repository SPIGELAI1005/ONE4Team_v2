# RLS integration tests

JWT-based Row Level Security checks against a **real** Supabase project (staging recommended).

Default `npm test` skips these when env vars are absent (CI stays green). Run manually or via the optional GitHub Actions workflow **`rls-integration`**.

Unit proofs for Team Ops Wave 1 gap §12 (no staging required) live in:

[`src/lib/team-ops-wave1-proofs.test.ts`](../src/lib/team-ops-wave1-proofs.test.ts)

## Required environment variables

```bash
RLS_TEST_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
RLS_TEST_SUPABASE_ANON_KEY=your_anon_key
RLS_TEST_JWT_USER_A=eyJ...   # JWT for user A (normal member of club A only)
RLS_TEST_CLUB_A_ID=uuid-of-club-a
RLS_TEST_CLUB_B_ID=uuid-of-club-b
```

**User A** must be a normal member of **club A** only (not club B).

## Optional Wave 1 probes

```bash
RLS_TEST_JWT_TRAINER_TEAM_A=eyJ...          # trainer scoped to team A only
RLS_TEST_TEAM_B_ACTIVITY_ID=uuid            # activity on team B (same club)
RLS_TEST_TEAM_B_MEMBERSHIP_ID=uuid          # player on team B
RLS_TEST_JWT_TEAM_MGMT=eyJ...               # team_management on club A
RLS_TEST_JWT_PARENT=eyJ...                  # parent without link to target membership
RLS_TEST_UNRELATED_MEMBERSHIP_ID=uuid
RLS_TEST_ACTIVITY_ID=uuid                   # any activity in club A
```

## Optional Tier 1–2 probes (20260812300000)

```bash
RLS_TEST_JWT_TRAINER_GUEST=eyJ...           # trainer who can convert guests
RLS_TEST_GUEST_ID=uuid                      # activity_guest_participants row with email
RLS_TEST_JWT_MEMBER_TRANSPORT=eyJ...      # rider membership (not driver)
RLS_TEST_TRANSPORT_OFFER_ID=uuid            # open transport offer
```

## Run locally

```bash
RLS_TEST_SUPABASE_URL=... \
RLS_TEST_SUPABASE_ANON_KEY=... \
RLS_TEST_JWT_USER_A=... \
RLS_TEST_CLUB_A_ID=... \
RLS_TEST_CLUB_B_ID=... \
npm test -- src/test/rls.integration.test.ts src/lib/team-ops-wave1-proofs.test.ts
```

## GitHub Actions

Workflow: [`.github/workflows/rls-integration.yml`](../.github/workflows/rls-integration.yml)

Trigger manually (**Actions → RLS integration → Run workflow**) after adding repository secrets for the required vars (optional Wave 1 JWTs can be added later).

## Test files

- [`src/test/rls.integration.test.ts`](../src/test/rls.integration.test.ts) — live JWT probes
- [`src/lib/team-ops-wave1-proofs.test.ts`](../src/lib/team-ops-wave1-proofs.test.ts) — CI unit proofs
