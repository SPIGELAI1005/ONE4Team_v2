# Team Ops E2E fixtures (JWT Playwright)

Env-gated Playwright flows for Team Operations close-out **Phase 22**. Default CI skips when credentials are unset.

## Latest diagnostic (2026-08-18)

The full Team Ops command executed **14 tests with zero skips: 3 passed and 11 failed**. Authentication works, but the supplied identities are not valid acceptance fixtures:

- the account used for ordinary Player, Player+Parent, and Trainer+Parent is one base `member` without those assignments;
- accounts can land in a different active club than the activity creator;
- some transition states briefly render duplicate test IDs such as `tasks-create-open`.

Do not interpret these 11 failures as proof of 11 product defects. Create distinct users for each persona below, set `E2E_ACTIVE_CLUB_NAME`, verify assignments/guardian links in that same club, and rerun. Acceptance remains **14 passed / 0 failed / 0 skipped**.

## Scenario 1 — parent RSVP for child

Spec: [`e2e/team-ops-rsvp.spec.ts`](../e2e/team-ops-rsvp.spec.ts)

Flow:

1. Trainer creates a training on `/activities` (no team required).
2. Parent opens `/activities`, selects linked child in **Responding for**, taps **I'm coming**.
3. Trainer reloads and sees the child under **Team response → Coming**.

## Required environment variables

```bash
# Linked Supabase (same as local Vite .env — not e2e-placeholder)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

E2E_TRAINER_EMAIL=trainer@example.com
E2E_TRAINER_PASSWORD=...

E2E_PARENT_EMAIL=parent@example.com
E2E_PARENT_PASSWORD=...

# Substring of the child's display name in Members / guardian picker
E2E_CHILD_DISPLAY_NAME=Alex

# Family/persona and ledger scenarios
E2E_PARENT_DISPLAY_NAME=E2E Parent
E2E_EXCLUDED_MEMBER_DISPLAY_NAME=E2E Ordinary Player
E2E_PLAYER_EMAIL=player@example.com
E2E_PLAYER_PASSWORD=...
E2E_PLAYER_PARENT_EMAIL=player-parent@example.com
E2E_PLAYER_PARENT_PASSWORD=...
E2E_TRAINER_PARENT_EMAIL=trainer-parent@example.com
E2E_TRAINER_PARENT_PASSWORD=...

# Optional: force active club when the account belongs to many clubs (name match)
E2E_ACTIVE_CLUB_NAME=TSV Allach
```

## Staging account requirements

Both accounts must belong to the **same club** (active membership).

| Account | Role | Needs |
|---------|------|--------|
| Trainer | `trainer` (or admin) on a team | Can create activities |
| Parent | `parent_supporter` (or **`player`/`trainer`** with **`parent`** assignment + guardian links) | Guardian link to child membership |
| Child | `player` on a team | Visible in parent's **Responding for** picker |

**Dual-role staging (2026-08-13):** A **trainer** or **player** who is also a parent should have a **`parent`** row in **`club_role_assignments`** (auto from guardian link migration **`20260812320000`**) and **`club_member_guardian_links`**. For E2E, parent may use **Parent** dashboard persona in Settings when testing **`/members`** family roster; **Trainer** persona when testing team-scoped roster.

Create users in Supabase Auth, then assign roles and guardian links in the app (**Members → open a player row → Safety & Emergencies**, or **Full registry & club pass** on that player) or your existing staging seed process.

### Where guardian linking lives

Guardian UI is on the **player’s** profile only (role **Player** / player teen / player adult), **Safety & Emergencies** tab, section **Linked guardians / parents**.

It appears when:

| Condition | Required |
|-----------|----------|
| Member role | **Player** (not admin/trainer/parent on that row) |
| Your access | **Members admin** (`club_admin`, team management with full Members, etc.) **or** player is **under 18** with no guardian yet |
| Location | Inline roster panel **or** **Full registry & club pass** dialog (same Safety tab) |

If you open **your own** admin/trainer profile → Safety tab shows medical fields only (no guardian block). Open the **child player** instead.

**Steps:** Members → click **player row** → Safety & Emergencies → **Choose member** (your account) → **Link**.

**Tip:** Create the training **without** a team filter so RSVP works even if roster lines are empty.

## Run locally

1. Ensure **`.env`** in the project root has your real `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (Playwright loads this for the dev server on port **5173**).
2. Stop any old Vite on 5173 if it was started with placeholder Supabase, or run:
   ```powershell
   $env:PW_NO_REUSE_SERVER="1"
   ```
3. Set E2E credentials in the **same PowerShell session** (one line each):

```powershell
$env:E2E_TRAINER_EMAIL="..."
$env:E2E_TRAINER_PASSWORD="..."
$env:E2E_PARENT_EMAIL="..."
$env:E2E_PARENT_PASSWORD="..."
$env:E2E_CHILD_DISPLAY_NAME="Alex"
npx playwright test e2e/team-ops-rsvp.spec.ts
```

If login hangs, open `http://127.0.0.1:5173/auth` in a browser — you should see the normal Sign In form, not **Configuration error**.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Timeout on **New** / `club: -` in debug bar | Account has **no active club membership** (e.g. `george.neacsu@gmx.de` currently has none) | Use an account with `club_memberships.status = active`, or re-invite the user to the club |
| Login stays on `/auth` | Dev server pointed at **e2e-placeholder** Supabase | Stop old Vite on 5173; run with `$env:PW_NO_REUSE_SERVER="1"`; ensure root `.env` has real `VITE_SUPABASE_*` |
| Guardian picker not shown | No `club_member_guardian_links` row linking parent membership → child player | Members → open **player on active roster** → Safety → **Linked guardians / parents** → link **E2E_PARENT** account. Draft-only links (saved member list) do not power RSVP until the child has an active membership. |
| Child only on saved list | Invite not accepted / no `club_memberships` row | Accept invite or add member to roster first, then link guardian on the roster row |
| Wrong club / no child in picker | Account belongs to many clubs; active club is not the one with the child | Set `E2E_ACTIVE_CLUB_NAME` (planned) or pick the correct club in the app before running |

**Recommended staging account:** `spigelai@gmail.com` (admin on TSV Allach) — not `george.neacsu@gmx.de` until that account has an active membership and guardian link.

### Parent visibility (2026-08-09)

After linking guardian on the **roster** row, the parent account should also see the child under:

- **Settings → Profile** — Family members you manage
- **`/my-data`** — same panel + registry editor
- **`/members`** — family-filtered roster (not full club list)

Draft **`__draft_guardian_membership_ids`** alone does not populate any of the above.

## CI

Main [`ci.yml`](../.github/workflows/ci.yml) keeps these **skipped** without secrets. Add repository secrets and a dedicated workflow job when staging JWT accounts are stable (same pattern as [`rls-integration.yml`](../.github/workflows/rls-integration.yml)).

## Next scenarios (backlog)

| # | Flow | Spec |
|---|------|------|
| 2 | Parent decline RSVP on training | `team-ops-availability.spec.ts` |
| 3 | Open driver duty → claim | `team-ops-duties.spec.ts` |
| 4 | Poll create → vote | `team-ops-polls.spec.ts` |
| 5 | Carpool offer → request seat | `team-ops-transport.spec.ts` |
| 6 | Guest trial → draft+invite | `team-ops-guests.spec.ts` |

Run all env-gated specs with a required-credential preflight (including family personas and ledger approval):

```powershell
npm run e2e:team-ops
```

PowerShell does not expand the `e2e/team-ops-*.spec.ts` argument for Playwright; use the npm command above.

The full staging account matrix, acceptance sequence, cron verification and cleanup procedure is in
[`TEAM_OPS_OPERATOR_ACCEPTANCE_2026-08-16.md`](TEAM_OPS_OPERATOR_ACCEPTANCE_2026-08-16.md).
