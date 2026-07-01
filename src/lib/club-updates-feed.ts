import type { ClubNotification } from "@/hooks/use-club-notifications";
import { filterAnnouncementsForUser } from "@/lib/club-message-access";

export interface ClubAnnouncementUpdate {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  team_id: string | null;
  priority: string | null;
  image_url: string | null;
  publish_to_public_website: boolean;
  created_at: string;
}

export interface ClubUpdateFeedItem {
  feedKey: string;
  kind: "announcement" | "notification";
  title: string;
  body: string | null;
  created_at: string;
  is_read: boolean;
  notification_type: string;
  reference_id: string | null;
  notification_id: string | null;
  announcement?: ClubAnnouncementUpdate;
}

export function buildClubUpdatesFeed(
  announcements: readonly ClubAnnouncementUpdate[],
  notifications: readonly ClubNotification[],
  options: {
    userTeamIds: readonly string[];
    isAdmin: boolean;
    teamFilterId?: string | null;
    clubWideOnly?: boolean;
  },
): ClubUpdateFeedItem[] {
  const visibleAnnouncements = filterAnnouncementsForUser(announcements, options);
  const announcementIds = new Set(visibleAnnouncements.map((row) => row.id));

  const notificationByAnnouncementId = new Map<string, ClubNotification>();
  for (const notification of notifications) {
    if (notification.notification_type !== "announcement" || !notification.reference_id) continue;
    notificationByAnnouncementId.set(notification.reference_id, notification);
  }

  const announcementItems: ClubUpdateFeedItem[] = visibleAnnouncements.map((announcement) => {
    const linked = notificationByAnnouncementId.get(announcement.id);
    const excerpt = announcement.excerpt?.trim();
    return {
      feedKey: `announcement-${announcement.id}`,
      kind: "announcement",
      title: announcement.title,
      body: excerpt || announcement.content.slice(0, 240),
      created_at: announcement.created_at,
      is_read: linked?.is_read ?? false,
      notification_type: "announcement",
      reference_id: announcement.id,
      notification_id: linked?.id ?? null,
      announcement,
    };
  });

  const otherNotificationItems: ClubUpdateFeedItem[] = notifications
    .filter((notification) => notification.notification_type !== "announcement")
    .map((notification) => ({
      feedKey: `notification-${notification.id}`,
      kind: "notification",
      title: notification.title,
      body: notification.body,
      created_at: notification.created_at,
      is_read: notification.is_read,
      notification_type: notification.notification_type,
      reference_id: notification.reference_id,
      notification_id: notification.id,
    }));

  return [...announcementItems, ...otherNotificationItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 25);
}
