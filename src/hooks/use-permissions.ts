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
  const { activeClub } = useActiveClub();
  const { user } = useAuth();
  const legacyRole = activeClub?.role ?? null;

  const [assignments, setAssignments] = useState<ClubRoleAssignmentRow[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  useEffect(() => {
    if (!user || !activeClub?.membershipId) {
      setAssignments([]);
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

      if (error) {
        if (!isMissingRelationError(error)) {
          console.warn("[usePermissions] club_role_assignments:", error.message);
        }
        setAssignments([]);
      } else {
        setAssignments((data as ClubRoleAssignmentRow[]) ?? []);
      }
      setAssignmentsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, activeClub?.membershipId]);

  const permissions = useMemo(
    () => effectivePermissions(legacyRole, assignments),
    [legacyRole, assignments],
  );

  const isAdmin = useMemo(
    () => isClubGeneralAdminFromAssignments(legacyRole, assignments),
    [legacyRole, assignments],
  );

  const isTrainer = useMemo(
    () => isTrainerCapability(legacyRole, assignments),
    [legacyRole, assignments],
  );

  const teamAdminForTeamIds = useMemo(() => teamAdminTeamIds(assignments), [assignments]);

  return {
    role: legacyRole,
    assignments,
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
