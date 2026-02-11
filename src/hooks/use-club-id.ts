import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export function useClubId() {
  const { user } = useAuth();
  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("club_memberships")
        .select("club_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      setClubId(data?.club_id || null);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { clubId, loading };
}
