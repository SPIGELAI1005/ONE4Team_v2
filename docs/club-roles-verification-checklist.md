# Club roles optimization — manual verification checklist

Use after applying migration `20260804180000_club_roles_team_management_fan_supporter.sql`.

**Status (2026-07-28):** Migration applied on linked remote. Related repairs through **`20260804200000`**; **`supabase db lint --linked`** clean.

## Invite / role pickers
- [ ] Members invite role dropdown shows: Member, Player, Trainer, Staff, Team Management, Parent, Fan, Supporter (+ partners, Admin)
- [ ] Labels are separate Parent / Fan / Supporter (no “Parent / Supporter” combo)
- [ ] Club Page Admin join default role includes Fan, Supporter, Team Management
- [ ] Role Manager can assign `team_management`, `fan`, `supporter` kinds

## Finance gating
- [ ] Club Admin can open `/payments`
- [ ] Trainer / Staff / Team Management cannot open payments (route/menu hidden)
- [ ] Parent sees My Dues (own + linked wards) when guardian links exist
- [ ] DB role `parent` (not only `parent_supporter`) still loads ward dues

## Trainer scope
- [ ] Trainer with only `team_coaches` / team-scoped assignment cannot edit other teams’ matches
- [ ] Bare legacy trainer without coaches/assignments cannot manage all matches
- [ ] Club-scoped trainer assignment can still manage club-wide matches

## Fan / Supporter
- [ ] Login as Fan redirects to `/club/:slug` (not ops dashboard)
- [ ] Fan sidebar has no members/trainings/payments modules
- [ ] Supporter may see events/shop settings shell only

## Parent + under-18
- [ ] Player under 18 shows guardian hint on Safety tab
- [ ] Linking a parent does **not** change the child’s role from Player
- [ ] Child remains `player`; guardian row in `club_member_guardian_links`

## Automated
- [ ] `npx vitest run src/lib/rbac-config.test.ts src/lib/match-management-access.test.ts src/lib/my-dues.test.ts src/lib/under-18.test.ts`
