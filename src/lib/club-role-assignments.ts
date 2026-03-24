/** DB table public.club_role_assignments (Option 2 scoped RBAC). */

export type ClubRoleScope = "club" | "team" | "self";

export type ClubRoleKind =
  | "club_admin"
  | "team_admin"
  | "trainer"
  | "player"
  | "player_teen"
  | "player_adult"
  | "parent"
  | "staff"
  | "member"
  | "sponsor"
  | "supplier"
  | "service_provider"
  | "consultant";

export interface ClubRoleAssignmentRow {
  id: string;
  club_id: string;
  membership_id: string;
  role_kind: ClubRoleKind;
  scope: ClubRoleScope;
  scope_team_id: string | null;
  created_at: string;
}
