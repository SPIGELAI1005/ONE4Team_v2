import { Pencil } from "lucide-react";
import { EventsFeedAdmin } from "@/components/events/events-feed-admin";
import { EventsHighlightAdmin } from "@/components/events/events-highlight-admin";
import { useCanManageClubPublicPage } from "@/hooks/use-can-manage-club-content";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import type { ClubEventsFeedConfig } from "@/lib/club-events-feed";
import type { ClubEventsHighlightConfig } from "@/lib/club-events-highlight";

interface EventsPageContentAdminProps {
  clubId: string;
  userId: string;
  club?: { name?: string | null; slug?: string | null } | null;
  eventsHighlight: ClubEventsHighlightConfig;
  onHighlightSaved: (next: ClubEventsHighlightConfig) => void;
  eventsFeed: ClubEventsFeedConfig;
  onFeedSaved: (next: ClubEventsFeedConfig) => void;
  feedLoading?: boolean;
}

/** Hero + timeline editors for `/events` and `/matches` (Team Management server-checked). */
export function EventsPageContentAdmin({
  clubId,
  userId,
  club = null,
  eventsHighlight,
  onHighlightSaved,
  eventsFeed,
  onFeedSaved,
  feedLoading = false,
}: EventsPageContentAdminProps) {
  const { t } = useLanguage();
  const copy = t.eventsPage.pageAdmin;
  const perms = usePermissions();
  const { canManage: canManageClubPage, loading: pageManageLoading } = useCanManageClubPublicPage(clubId);
  const showAllachExtras = isTsvAllachClub(club);

  const canEditHighlight = canManageClubPage || perms.isAdmin;
  const canEditFeed = showAllachExtras && (canManageClubPage || perms.isTrainer || perms.isAdmin);

  if (!canEditHighlight && !canEditFeed) {
    if (pageManageLoading) return null;
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-3 sm:p-4"
      data-testid="events-page-content-admin"
    >
      <div className="mb-3 flex items-start gap-2">
        <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">{copy.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {canEditHighlight ? (
          <EventsHighlightAdmin
            clubId={clubId}
            userId={userId}
            value={eventsHighlight}
            onSaved={onHighlightSaved}
            embedded
          />
        ) : null}
        {canEditFeed ? (
          <EventsFeedAdmin
            clubId={clubId}
            userId={userId}
            value={eventsFeed}
            onSaved={onFeedSaved}
            feedLoading={feedLoading}
            embedded
          />
        ) : null}
      </div>
    </section>
  );
}
