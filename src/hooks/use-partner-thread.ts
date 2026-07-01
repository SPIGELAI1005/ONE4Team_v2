import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import {
  fetchPartnerMessages,
  sendPartnerMessage,
  type PartnerMessageRow,
} from "@/lib/supplier-collaboration";

export function usePartnerThread(clubId: string | null, partnerId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PartnerMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const reload = useCallback(async () => {
    if (!clubId || !partnerId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const rows = await fetchPartnerMessages(clubId, partnerId);
    setMessages(rows);
    setLoading(false);
  }, [clubId, partnerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const send = useCallback(
    async (content: string) => {
      if (!clubId || !partnerId || !user?.id || !content.trim()) return { error: new Error("missing") };
      setSending(true);
      const result = await sendPartnerMessage(clubId, partnerId, content, user.id);
      if (!result.error) await reload();
      setSending(false);
      return result;
    },
    [clubId, partnerId, user?.id, reload],
  );

  return { messages, loading, sending, reload, send };
}
