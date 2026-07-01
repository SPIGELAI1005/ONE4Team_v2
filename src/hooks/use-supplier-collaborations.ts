import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import {
  fetchSupplierCollaborations,
  type SupplierCollaboration,
} from "@/lib/supplier-collaboration";

export function useSupplierCollaborations() {
  const { user } = useAuth();
  const [collaborations, setCollaborations] = useState<SupplierCollaboration[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setCollaborations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await fetchSupplierCollaborations(user.id);
    setCollaborations(rows);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const partnerIds = useMemo(() => collaborations.map((row) => row.partnerId), [collaborations]);

  return { collaborations, partnerIds, loading, reload };
}
