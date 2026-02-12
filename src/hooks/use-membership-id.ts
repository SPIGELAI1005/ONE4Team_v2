import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";

export function useMembershipId() {
  const { user } = useAuth();
  const { clubId } = useClubId();
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!user || !clubId) {
        setMembershipId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("club_memberships")
        .select("id")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        setMembershipId(null);
        setLoading(false);
        return;
      }

      setMembershipId(data?.id ?? null);
      setLoading(false);
    };

    void run();
  }, [user, clubId]);

  return { membershipId, loading };
}
