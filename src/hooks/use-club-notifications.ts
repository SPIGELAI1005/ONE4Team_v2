import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export interface ClubNotification {
  id: string;
  title: string;
  body: string | null;
  notification_type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_LIMIT = 25;

export function useClubNotifications(clubId: string | null) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ClubNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const reload = useCallback(async () => {
    if (!user || !clubId) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, notification_type, reference_id, is_read, created_at")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATION_LIMIT);

    if (error) {
      setNotifications([]);
      setLoading(false);
      return error;
    }

    if (data) {
      setNotifications(data as ClubNotification[]);
    }
    setLoading(false);
    return null;
  }, [clubId, user]);

  useEffect(() => {
    if (!user || !clubId) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void reload().then((result) => {
      if (cancelled || result) return;

      channel = supabase
      .channel(`club-notifications-${clubId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `club_id=eq.${clubId},user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as ClubNotification;
          setNotifications((prev) =>
            [row, ...prev.filter((n) => n.id !== row.id)].slice(0, NOTIFICATION_LIMIT),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `club_id=eq.${clubId},user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as ClubNotification;
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `club_id=eq.${clubId},user_id=eq.${user.id}`,
        },
        (payload) => {
          const id = String((payload.old as { id?: string }).id ?? "");
          if (id) setNotifications((prev) => prev.filter((n) => n.id !== id));
        },
      )
      .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [clubId, reload, user]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!clubId || !user) return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("id", id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    },
    [clubId, user],
  );

  const markAllRead = useCallback(async () => {
    if (!clubId || !user || unreadCount === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [clubId, unreadCount, user]);

  const dismiss = useCallback(
    async (id: string) => {
      if (!clubId || !user) return;
      await supabase
        .from("notifications")
        .delete()
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("id", id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    [clubId, user],
  );

  return {
    notifications,
    loading,
    unreadCount,
    reload,
    markAsRead,
    markAllRead,
    dismiss,
  };
}
