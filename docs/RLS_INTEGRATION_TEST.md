# RLS integration tests

JWT-based Row Level Security checks against a **real** Supabase project (staging recommended).

Default `npm test` skips these when env vars are absent (CI stays green). Run manually or via the optional GitHub Actions workflow **`rls-integration`**.

## Required environment variables

```bash
RLS_TEST_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
RLS_TEST_SUPABASE_ANON_KEY=your_anon_key
RLS_TEST_JWT_USER_A=eyJ...   # JWT for user A (normal member of club A only)
RLS_TEST_CLUB_A_ID=uuid-of-club-a
RLS_TEST_CLUB_B_ID=uuid-of-club-b
```

**User A** must be a normal member of **club A** only (not club B).

## Run locally

```bash
RLS_TEST_SUPABASE_URL=... \
RLS_TEST_SUPABASE_ANON_KEY=... \
RLS_TEST_JWT_USER_A=... \
RLS_TEST_CLUB_A_ID=... \
RLS_TEST_CLUB_B_ID=... \
npm test -- src/test/rls.integration.test.ts
```

## GitHub Actions

Workflow: [`.github/workflows/rls-integration.yml`](../.github/workflows/rls-integration.yml)

Trigger manually (**Actions → RLS integration → Run workflow**) after adding repository secrets:

- `RLS_TEST_SUPABASE_URL`
- `RLS_TEST_SUPABASE_ANON_KEY`
- `RLS_TEST_JWT_USER_A`
- `RLS_TEST_CLUB_A_ID`
- `RLS_TEST_CLUB_B_ID`

## Test file

[`src/test/rls.integration.test.ts`](../src/test/rls.integration.test.ts)
