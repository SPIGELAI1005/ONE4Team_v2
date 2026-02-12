# ONE4Team — MVP Plan (Football-first)

**Goal:** Ship a SaaS-grade, multi-tenant "Club OS" for hobby football clubs (soccer) first, while keeping the data model extensible for other sports (tennis/chess/handball).

**Product pillars:**
1) Club/member management (roles, scheduling, attendance, matches, stats)
2) Manual member dues tracking (no Stripe in v1)
3) Partner portal (stub only)
4) Club front page + invite-only onboarding with invite requests
5) AI copilots (workflow-first, club-scoped, logged)

---

## 0) MVP decisions (locked)
- **Sport focus:** Football-first
- **Member payments:** Manual tracking (no Stripe in v1)
- **Onboarding:** Invite-only + public "request invite" funnel
- **Partner portal:** Stub (data model + placeholder UI only)

---

## 1) MVP scope (what we ship)

### Core flows (must work end-to-end)
- Create club → admin membership created
- Invite a user (trainer/player/member) → invite accepted → membership active
- Schedule trainings + matches → track attendance
- Record match events (goals/assists/cards/subs) → view player stats
- Admin marks dues paid/unpaid → sees unpaid list + export
- Public club front page → submit invite request → admin sees request
- AI: generate weekly training plan + admin digest (club-scoped + logged)

### Non-goals (explicitly not v1)
- Stripe payments + invoices + refunds
- Full shop checkout (only a placeholder)
- Full partner contracting lifecycle
- Advanced calendar UI (list view is fine)
- Complex sports abstraction (we only design for it)

---

## 2) Epics & Tickets (ordered)

### EPIC A — Multi-tenant foundation (SaaS-grade)
**Goal:** hard tenant isolation by `club_id` + RLS.
- **A1** Create `clubs` table (slug unique)
- **A2** Create `club_memberships` table (unique `(club_id, user_id)`)
- **A3** Implement "active club" selection in app (store in user settings)
- **A4** Baseline RLS helper(s):
  - `is_club_member(club_id, user_id)`
  - `is_club_admin(club_id, user_id)`
- **A5** Seed/dev helper: create first club + admin membership

**Acceptance:** a user cannot read/write anything outside their club(s).

---

### EPIC B — RBAC (roles → permissions)
**Goal:** permissions are the source of truth (UI + server).
- **B1** Define roles: `admin`, `trainer`, `player`, `member`, `parent_fan`, `partner`
- **B2** Define permission set:
  - `members:read|write`
  - `schedule:read|write`
  - `matches:read|write`
  - `payments:read|write`
  - `partners:read|write`
  - `settings:write`
- **B3** Create seed mapping: `role_permissions`
- **B4** Implement `hasPermission()` client helper (for nav + buttons)
- **B5** Enforce permissions server-side (RLS where easy, API/RPC where complex)

**Acceptance:** trainer can schedule; player cannot edit club members/payments.

---

### EPIC C — Invite-only onboarding + invite requests
**Goal:** invite-only is enforced; public can request invite.
- **C1** `club_invites`: admin can create invites (copy link) (store only token hash)
- **C2** Invite acceptance flow: turns invite into membership
- **C3** `club_invite_requests`: public form on club page
- **C4** Admin inbox view for invite requests; approve → generate invite

**Acceptance:** no one can join a club without invite, but requests can be submitted.

---

### EPIC D — Scheduling core (trainings + events + matches)
**Goal:** one scheduling engine.
- **D1** `activities` table (club-scoped)
  - types: `training | match | event`
- **D2** Create/list activities (list view OK)
- **D3** `activity_attendance` table (invited/confirmed/declined/attended)
- **D4** Basic training assignment fields:
  - team, trainer, location/field

**Acceptance:** schedule + attendance works for at least training + match.

---

### EPIC E — Matches + stats (football-first)
**Goal:** match events drive stats.
- **E1** Match creation (opponent, home/away, kickoff)
- **E2** `match_events`: goal/assist/yellow/red/sub in/out
- **E3** Player stats pages: top scorers / assists / cards
- **E4** Player profile: match history + attendance summary

**Acceptance:** record events and see leaderboards.

---

### EPIC F — Manual dues tracking (no Stripe v1)
**Goal:** admin can track who paid.
- **F1** `membership_dues` table (due/paid/waived)
- **F2** Admin UI: mark paid/unpaid + notes
- **F3** Dashboard widget: unpaid count
- **F4** Export CSV

**Acceptance:** admin can run dues without external payments.

---

### EPIC G — Partner portal (stub)
**Goal:** reserve structure without building the whole system.
- **G1** `partners` table (club-scoped)
- **G2** partner nav + placeholder UI
- **G3** "Contracts/invoices" views behind "Coming soon"

---

### EPIC H — AI copilots (workflow-first + safe)
**Goal:** useful AI, low risk.
- **H1** `ai_requests` table for logging
- **H2** Co-Trainer v1: weekly training plan generator
- **H3** Co-AImin v1: admin digest (dues + attendance + upcoming schedule)
- **H4** Guardrails:
  - always scoped to active `club_id`
  - show "inputs used" (sources)

**Acceptance:** AI produces outputs without cross-club leakage.

---

## 3) Suggested Supabase schema (tables)

### clubs
- `id uuid pk`
- `name text`
- `slug text unique`
- `description text`
- `is_public boolean`
- `created_by uuid`
- timestamps

### club_memberships
- `id uuid pk`
- `club_id uuid fk clubs`
- `user_id uuid fk auth.users`
- `role text`
- `status text` (`invited|active|disabled`)
- football attrs: `team_id uuid?`, `position text?`, `age_group text?`
- timestamps

### club_invites
- `id uuid pk`
- `club_id uuid`
- `email text?`
- `role text`
- `token_hash text unique`
- `expires_at timestamptz`
- `used_at timestamptz`
- timestamps

### club_invite_requests
- `id uuid pk`
- `club_id uuid`
- `name text`
- `email text`
- `message text?`
- `status text` (`pending|approved|rejected`)
- timestamps

### activities
- `id uuid pk`
- `club_id uuid`
- `type text` (`training|match|event`)
- `title text`
- `starts_at timestamptz`
- `ends_at timestamptz?`
- `location text?`
- `team_id uuid?`
- match-only: `opponent text?`, `is_home boolean?`, `home_score int?`, `away_score int?`, `status text?`
- timestamps

### activity_attendance
- `id uuid pk`
- `activity_id uuid`
- `membership_id uuid`
- `status text` (`invited|confirmed|declined|attended`)
- timestamps

### match_events
- `id uuid pk`
- `activity_id uuid` (match)
- `membership_id uuid?`
- `event_type text` (`goal|assist|yellow_card|red_card|substitution_in|substitution_out`)
- `minute int?`
- timestamps

### membership_dues
- `id uuid pk`
- `club_id uuid`
- `membership_id uuid`
- `due_date date`
- `amount_cents int?`
- `currency text?`
- `status text` (`due|paid|waived`)
- `paid_at timestamptz?`
- `note text?`

### partners (stub)
- `id uuid pk`
- `club_id uuid`
- `name text`
- `type text` (`sponsor|supplier|service_provider|consultant|other`)
- `notes text?`

### ai_requests
- `id uuid pk`
- `club_id uuid`
- `user_id uuid`
- `kind text` (`training_plan|admin_digest`)
- timestamps

---

## 4) RLS strategy (minimal, correct)
Create helper functions:
- `is_club_member(p_club_id uuid, p_user_id uuid)`
- `is_club_admin(p_club_id uuid, p_user_id uuid)`

Policies:
- SELECT on club-scoped tables: allowed if `is_club_member(club_id, auth.uid())`
- INSERT/UPDATE/DELETE:
  - activities/matches: admin or trainer
  - memberships/invites/dues/settings: admin only
  - attendance: member can update own attendance; admin/trainer can update all

---

## 5) Golden path smoke test (MVP)
1) Create club (admin)
2) Create invite (trainer) → accept invite
3) Schedule a training → invite players → confirm attendance
4) Create a match → record a goal + card
5) Visit player stats → verify leaderboards
6) Create dues entries → mark one paid → unpaid widget updates
7) Public club page → submit invite request → visible to admin
8) AI: generate training plan + admin digest → verify logging

---

## 6) v2+ roadmap (after MVP)
- Stripe billing (club subscription) + club-member payments
- Shop checkout
- Partner contracts/invoices/tasks
- Real-time updates (subscriptions)
- E2E tests (Playwright)
