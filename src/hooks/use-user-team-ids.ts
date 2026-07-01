import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

/** Team UUIDs the signed-in user belongs to via `team_players` → `club_memberships`. */
export function useUserTeamIds(clubId: string | null) {
  const { user } = useAuth();
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!clubId || !user) {
      setTeamIds([]);
      return;
    }
    setLoading(true);
    const { data: membership, error: membershipError } = await supabase
      .from("club_memberships")
      .select("id")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError || !membership?.id) {
      setTeamIds([]);
      setLoading(false);
      return;
    }

    const [playerRes, coachRes] = await Promise.all([
      supabase.from("team_players").select("team_id").eq("membership_id", membership.id),
      supabase.from("team_coaches").select("team_id").eq("membership_id", membership.id),
    ]);

    if (playerRes.error && coachRes.error) {
      setTeamIds([]);
    } else {
      const ids = [...(playerRes.data ?? []), ...(coachRes.data ?? [])]
        .map((row) => String((row as { team_id: string }).team_id))
        .filter(Boolean);
      setTeamIds(Array.from(new Set(ids)));
    }
    setLoading(false);
  }, [clubId, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { teamIds, loading, reload };
}
