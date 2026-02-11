# Phase 0 — RBAC checklist (ONE4Team)

Purpose: **no privileged write is possible** without correct role + club context.

Legend:
- ✅ implemented in UI + handler guard
- ⚠️ UI-only guard (button disabled) → handler still needs guard
- 🧱 DB/RLS/RPC (later) = server-side enforcement (recommended, but can be scheduled)

---

## A) Global invariants (must hold)
- [ ] Any mutation (insert/update/delete/upsert) is scoped to the active club context (usually via `club_id` or a parent key that is already club-scoped).
- [ ] Any privileged mutation checks permissions **inside the handler**, not only via disabled buttons.
- [ ] Any realtime subscription is filtered by `club_id` (unless intentionally public).

---

## B) Roles & permissions (current model)
- **Admin**: full control in club
- **Trainer**: trainer + admin can manage training, teams, matches, events
- **Player/Member/Other**: read + self actions only (chat, RSVP for self, etc.)

---

## C) Page-by-page checklist

### Members (Admin)
- ✅ Remove member (`club_memberships.delete`) guarded by `perms.isAdmin` and scoped by `club_id`.
- ✅ Approve/reject invite request guarded by admin view and scoped by `club_id`.
- ✅ Create invite guarded by admin view and scoped by `club_id`.
- ✅ Revoke invite guarded by admin view and scoped by `club_id`.

### Payments (Admin)
- ✅ Mark paid guarded by `perms.isAdmin` and scoped by `club_id`.
- ✅ Add fee type: **handler guard added** (`perms.isAdmin`).
- 🧱 Later: lock down `payments` + `membership_fee_types` writes via RLS/RPC.

### Teams & Training (Trainer/Admin)
- ✅ Delete team guarded by `perms.isTrainer` and scoped by `club_id`.
- ✅ Add team: **handler guard added** (`perms.isTrainer`).
- ✅ Add session: **handler guard added** (`perms.isTrainer`).
- 🧱 Later: RLS/RPC for teams + training_sessions.

### Events (Trainer/Admin)
- ✅ Create event: **handler guard added** (`perms.isTrainer`).
- ✅ Invite participant: **handler guard added** (`perms.isTrainer`).
- ✅ RSVP updates are scoped to event.
- 🧱 Later: RLS to ensure only trainers/admin can create/invite; players can only RSVP themselves.

### Matches (Trainer/Admin)
- ✅ Schedule match: **handler guard added** (`perms.isTrainer`).
- ✅ Create competition: **handler guard added** (`perms.isTrainer`).
- ✅ Finalize result: **handler guard added** (`perms.isTrainer`).
- ✅ Add match event: **handler guard added** (`perms.isTrainer`).
- ✅ Manage lineup: **handler guard added** (`perms.isTrainer`).
- 🧱 Later: RLS/RPC enforcement for match creation + edits.

### Communication
- ✅ Add announcement guarded by `perms.isAdmin`.
- ✅ Send message: any signed-in user (club-scoped insert).

### AdminNotificationSender component
- ✅ Now admin-only: handler guard + non-admin UI shows “Admin-only”.

### Realtime
- ✅ NotificationBell filtered by `club_id` and `user_id`.
- ✅ LiveMatchTicker filtered by `club_id` per user club.
- ✅ LiveScores filtered by `club_id` per user club.
- 🧱 Later: verify Supabase replication policies + RLS prevent leakage even if client subscribes broadly.

---

## D) Quick regression test checklist (manual)
1) Sign in as **player** in club A:
   - cannot create team/session/match/event; buttons may be disabled but also verify handler rejects (no DB writes).
2) Sign in as **trainer** in club A:
   - can create team/session/match/event, but cannot access Payments admin actions.
3) Sign in as **admin** in club A:
   - can do everything.
4) Switch to club B:
   - verify no data from club A appears in lists, modals, notifications, live widgets.

---

## Notes / follow-ups
- Phase 0 is *client hardening* + correctness. True security requires DB enforcement (RLS/RPC). We should schedule DB hardening after your Supabase apply window.
