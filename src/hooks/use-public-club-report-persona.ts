import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import { resolveClubReportPersona, type ClubReportPersona } from "@/lib/club-report-persona";
import { supabase } from "@/integrations/supabase/client";

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("Could not find the table") || message.includes("does not exist");
}

export function usePublicClubReportPersona(
  clubId: string | undefined,
  membershipId: string | null,
  membershipRole: string | null,
): { persona: ClubReportPersona; loading: boolean } {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ClubRoleAssignmentRow[]>([]);
  const [adminRpcAllowed, setAdminRpcAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !clubId || !membershipId) {
      setAssignments([]);
      setAdminRpcAllowed(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const { data, error } = await supabase
        .from("club_role_assignments")
        .select("*")
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      let rows: ClubRoleAssignmentRow[] = [];
      if (!error) rows = (data as ClubRoleAssignmentRow[]) ?? [];
      else if (!isMissingRelationError(error)) console.warn("[usePublicClubReportPersona]", error.message);

      setAssignments(rows);

      let rpcAllowed: boolean | null = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("is_club_admin", {
          _club_id: clubId,
          _user_id: user.id,
        });
        if (!rpcError) rpcAllowed = Boolean(rpcData);
      } catch {
        rpcAllowed = null;
      }

      if (!cancelled) {
        setAdminRpcAllowed(rpcAllowed);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId, membershipId, user?.id]);

  const persona = useMemo(
    () =>
      resolveClubReportPersona({
        legacyRole: membershipRole,
        assignments,
        isClubAdminRpc: adminRpcAllowed,
      }),
    [adminRpcAllowed, assignments, membershipRole],
  );

  return { persona, loading };
}
