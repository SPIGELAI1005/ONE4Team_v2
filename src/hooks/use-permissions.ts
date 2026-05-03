import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { useActiveClub } from "@/hooks/use-active-club";
import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import {
  effectivePermissions,
  hasPermissionInSet,
  isClubGeneralAdminFromAssignments,
  isTrainerCapability,
  teamAdminTeamIds,
  type Permission,
} from "@/lib/permissions";

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("Could not find the table") || message.includes("does not exist");
}

export function usePermissions() {
  const { activeClub, loading: activeClubLoading } = useActiveClub();
  const { user } = useAuth();
  const legacyRole = activeClub?.role ?? null;

  const [assignments, setAssignments] = useState<ClubRoleAssignmentRow[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [adminRpcAllowed, setAdminRpcAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setAssignments([]);
      setAdminRpcAllowed(null);
      setAssignmentsLoading(false);
      return;
    }

    if (!activeClub?.membershipId) {
      setAssignments([]);
      setAdminRpcAllowed(null);
      setAssignmentsLoading(false);
      return;
    }

    let cancelled = false;
    setAssignmentsLoading(true);

    void (async () => {
      const { data, error } = await supabase
        .from("club_role_assignments")
        .select("*")
        .eq("membership_id", activeClub.membershipId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      let rows: ClubRoleAssignmentRow[] = [];
      if (error) {
        if (!isMissingRelationError(error)) {
          console.warn("[usePermissions] club_role_assignments:", error.message);
        }
      } else {
        rows = (data as ClubRoleAssignmentRow[]) ?? [];
      }

      if (!cancelled) setAssignments(rows);

      // Always confirm with server: fixes (a) successful empty assignment rows while
      // `club_memberships.role` is admin in DB but client cache is stale, (b) RLS hiding
      // assignment rows without surfacing a Postgres "missing relation" error.
      let rpcAllowed: boolean | null = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("is_club_admin", {
          _club_id: activeClub.id,
          _user_id: user.id,
        });
        if (cancelled) return;
        if (rpcError) {
          console.warn("[usePermissions] is_club_admin rpc:", rpcError.message);
          rpcAllowed = null;
        } else {
          rpcAllowed = Boolean(rpcData);
        }
      } catch {
        if (!cancelled) rpcAllowed = null;
      }

      if (!cancelled) {
        setAdminRpcAllowed(rpcAllowed);
        setAssignmentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, activeClub?.membershipId, activeClub?.id]);

  const permissions = useMemo(
    () => effectivePermissions(legacyRole, assignments),
    [legacyRole, assignments],
  );

  const isAdmin = useMemo(
    () => isClubGeneralAdminFromAssignments(legacyRole, assignments) || adminRpcAllowed === true,
    [legacyRole, assignments, adminRpcAllowed],
  );

  // Club general admins must satisfy trainer-scoped routes (e.g. /members) even when
  // `club_role_assignments` is empty/unreadable and we only know admin via `is_club_admin` RPC.
  // Otherwise RequireTrainer redirects to /dashboard/player and DashboardContent overwrites
  // `one4team.activeRole` in localStorage, undoing the user's dashboard role switch.
  const isTrainer = useMemo(
    () => isTrainerCapability(legacyRole, assignments) || isAdmin,
    [legacyRole, assignments, isAdmin],
  );

  const teamAdminForTeamIds = useMemo(() => teamAdminTeamIds(assignments), [assignments]);

  return {
    role: legacyRole,
    assignments,
    /** True while club list / active club is resolving (avoid role-guard redirects on a stale frame). */
    activeClubLoading,
    assignmentsLoading,
    permissions,
    has: (p: Permission) => hasPermissionInSet(permissions, p),
    /** General club admin (legacy `admin` or club_admin assignment). */
    isAdmin,
    /** Training / coaching access (legacy trainer/admin or trainer/club_admin assignments). */
    isTrainer,
    /** Has at least one team-scoped team_admin assignment. */
    isTeamAdmin: teamAdminForTeamIds.length > 0,
    teamAdminTeamIds: teamAdminForTeamIds,
  };
}
