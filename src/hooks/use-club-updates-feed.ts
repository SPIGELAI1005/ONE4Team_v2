import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { useClubNotifications } from "@/hooks/use-club-notifications";
import {
  buildClubUpdatesFeed,
  type ClubAnnouncementUpdate,
  type ClubUpdateFeedItem,
} from "@/lib/club-updates-feed";
import { supabase } from "@/integrations/supabase/client";

const ANNOUNCEMENT_LIMIT = 20;

export function useClubUpdatesFeed(options: {
  clubId: string | null;
  userTeamIds: readonly string[];
  isAdmin: boolean;
  teamFilterId?: string | null;
  enabled?: boolean;
}) {
  const { clubId, userTeamIds, isAdmin, teamFilterId, enabled = true } = options;
  const { user } = useAuth();
  const {
    notifications,
    loading: notificationsLoading,
    reload: reloadNotifications,
    markAsRead,
    markAllRead,
    dismiss,
  } = useClubNotifications(clubId);

  const [announcements, setAnnouncements] = useState<ClubAnnouncementUpdate[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  const reloadAnnouncements = useCallback(async () => {
    if (!user || !clubId) {
      setAnnouncements([]);
      return;
    }
    setAnnouncementsLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id, title, content, excerpt, team_id, priority, image_url, publish_to_public_website, created_at",
      )
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(ANNOUNCEMENT_LIMIT);

    if (error) {
      setAnnouncements([]);
    } else {
      setAnnouncements((data ?? []) as ClubAnnouncementUpdate[]);
    }
    setAnnouncementsLoading(false);
  }, [clubId, user]);

  const reload = useCallback(async () => {
    await Promise.all([reloadNotifications(), reloadAnnouncements()]);
  }, [reloadAnnouncements, reloadNotifications]);

  useEffect(() => {
    if (!enabled || !user || !clubId) {
      setAnnouncements([]);
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void reloadAnnouncements().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`club-announcement-updates-${clubId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "announcements",
            filter: `club_id=eq.${clubId}`,
          },
          (payload) => {
            const row = payload.new as ClubAnnouncementUpdate;
            setAnnouncements((previous) =>
              [row, ...previous.filter((item) => item.id !== row.id)].slice(0, ANNOUNCEMENT_LIMIT),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "announcements",
            filter: `club_id=eq.${clubId}`,
          },
          (payload) => {
            const id = String((payload.old as { id?: string }).id ?? "");
            if (!id) return;
            setAnnouncements((previous) => previous.filter((item) => item.id !== id));
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [clubId, enabled, reloadAnnouncements, user]);

  useEffect(() => {
    if (enabled && user && clubId) {
      void reloadNotifications();
    }
  }, [clubId, enabled, reloadNotifications, user]);

  const items = useMemo(
    () =>
      buildClubUpdatesFeed(announcements, notifications, {
        userTeamIds,
        isAdmin,
        teamFilterId,
      }),
    [announcements, isAdmin, notifications, teamFilterId, userTeamIds],
  );

  const unreadCount = items.filter((item) => !item.is_read).length;
  const loading = notificationsLoading || announcementsLoading;

  const markFeedItemRead = useCallback(
    async (item: ClubUpdateFeedItem) => {
      if (item.notification_id) {
        await markAsRead(item.notification_id);
      }
    },
    [markAsRead],
  );

  return {
    items,
    announcements,
    loading,
    unreadCount,
    reload,
    markFeedItemRead,
    markAllRead,
    dismiss,
  };
}
