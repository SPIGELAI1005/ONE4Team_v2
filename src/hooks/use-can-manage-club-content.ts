import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";

function useClubCapabilityRpc(
  clubId: string | null | undefined,
  rpcName: "can_manage_club_public_page" | "can_manage_club_shop",
) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clubId || !user) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const { data, error } = await supabase.rpc(rpcName, {
        _club_id: clubId,
        _user_id: user.id,
      });
      if (cancelled) return;
      setAllowed(!error && Boolean(data));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId, rpcName, user]);

  return { allowed, loading };
}

/** Club admins and Team Management (server-checked). */
export function useCanManageClubPublicPage(clubId: string | null | undefined) {
  const { allowed, loading } = useClubCapabilityRpc(clubId, "can_manage_club_public_page");
  return { canManage: allowed, loading };
}

/** Club admins and Team Management (server-checked). */
export function useCanManageClubShop(clubId: string | null | undefined) {
  const { allowed, loading } = useClubCapabilityRpc(clubId, "can_manage_club_shop");
  return { canManage: allowed, loading };
}
