# Phase 0 — Role + Club switching regression checklist

Goal: switching **active club** and **active role** must not leak data across clubs, and the UI must re-sync correctly.

This is a **manual smoke checklist** you can run in ~10–15 minutes.

---

## Preconditions
- At least **two clubs** (Club A + Club B).
- Your test user is a member in both clubs, ideally with different roles:
  - Club A: admin (or trainer)
  - Club B: player/member

Tip: keep DevTools open to watch network requests for `club_id`.

---

## 1) Active club switching (primary isolation)

### 1.1 Header + global context
- [ ] Use the club switcher (or whatever UI you have) to switch from **Club A → Club B**.
- [ ] Header subtitle / club pill updates immediately to Club B.
- [ ] Refresh page: the app remembers Club B (`localStorage.one4team.activeClubId`).

### 1.2 Data lists must not “flash” old club content
On each of these pages, switch A→B and verify the list clears and reloads:
- [ ] **Members**: member list clears → reloads; selected member drawer resets.
- [ ] **Invites** tab (admin): invite requests/invites clear → reload.
- [ ] **Teams & Training**: teams/sessions clear → reload.
- [ ] **Events**: list clears → reload; open event modal closes.
- [ ] **Matches**: matches/competitions clear → reload; match modal closes.
- [ ] **Payments** (admin): fees/payments clear → reload.
- [ ] **Communication**: announcements/messages clear → reload.

Expected: no “cross-club flash”. If data is missing, it should show loading/empty state, not Club A data.

### 1.3 Realtime subscriptions are scoped
- [ ] In Club A, create a message/event/match update.
- [ ] While on Club B, verify you **do not** receive Club A’s realtime inserts.

---

## 2) Active role switching (routing context)

Role switching is route-driven (“A” decision): `/dashboard/:role` defines effective role.

### 2.1 Dashboard role affects nav links
- [ ] Go to `/dashboard/admin` and confirm header role pill = admin.
- [ ] Switch to `/dashboard/player` and confirm header role pill = player.
- [ ] Refresh after each: role should persist via `localStorage.one4team.activeRole`.

### 2.2 Permission boundaries
In the same club:
- [ ] As **player**, attempt trainer/admin actions (create team/session/match/event, fees, notifications).
  - Expected: buttons disabled AND handler-level “Not authorized” toast if triggered.
- [ ] As **trainer**, confirm trainer actions work but payments/admin-only do not.

---

## 3) Combined switching matrix
Run this matrix quickly:
- [ ] Club A + admin route → everything visible.
- [ ] Club A + player route → admin features hidden/blocked.
- [ ] Club B + admin route → should still be limited by membership role in that club (not by route alone).

Expected: membership role (from `useActiveClub`) is the source of truth for permissions; route role only affects navigation context.

---

## Notes
We added explicit state resets on club switch in:
- `src/pages/Members.tsx`
- `src/pages/Teams.tsx`
- `src/pages/Events.tsx`
- `src/pages/Matches.tsx`
- `src/pages/Payments.tsx`
- `src/pages/Communication.tsx`

These resets prevent cross-club data flashes during fetch.
