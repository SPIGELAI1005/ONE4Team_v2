import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** Whether the signed-in user is a general admin of the given club (server-checked). */
export function useClubAdmin(clubId: string | null | undefined) {
  const { user } = useAuth();
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clubId || !user) {
      setIsClubAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const { data, error } = await supabase.rpc("is_club_admin", {
        _club_id: clubId,
        _user_id: user.id,
      });
      if (cancelled) return;
      setIsClubAdmin(!error && Boolean(data));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId, user]);

  return { isClubAdmin, loading };
}
