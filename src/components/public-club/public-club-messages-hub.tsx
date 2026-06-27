import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  ChevronRight,
  Hash,
  Loader2,
  X,
} from "lucide-react";
import { Ai4TLogo } from "@/components/ai/Ai4TLogo";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useClubUpdatesFeed } from "@/hooks/use-club-updates-feed";
import { useUserTeamIds } from "@/hooks/use-user-team-ids";
import { usePermissions } from "@/hooks/use-permissions";
import { useClubAdmin } from "@/hooks/use-club-admin";
import { canManageAnnouncements } from "@/lib/club-message-moderation";
import { channelIdForMessage } from "@/lib/club-message-access";
import { getNotificationTypeMeta } from "@/lib/notification-type-meta";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { publicClubCssVars } from "@/components/public-club/club-theme-provider";
import {
  clubAi4tModalPanelClass,
  clubMessagesHubCardClass,
} from "@/lib/public-club-glass-classes";
import {
  ai4tMainTabListClass,
  ai4tMainTabTriggerClass,
} from "@/lib/ai4t-tab-classes";
import { AnnouncementDetailView } from "@/components/communication/announcement-detail-view";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type HubTab = "updates" | "channels";

type HubBanner = { variant: "success" | "error"; text: string };

const HUB_BANNER_MS = 4500;

/** Lift the Messages FAB above bottom-right toast notifications. */
const TOAST_LIFT_PX = 108;

interface PreviewMessage {
  id: string;
  content: string;
  team_id: string | null;
  created_at: string;
  channelLabel: string;
  channelId: string;
}

export function PublicClubMessagesHub() {
  const { t } = useLanguage();
  const { toasts } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    club,
    teams,
    isMember,
    checkingMembership,
    messagesCta,
    openAi4tModal,
    openCommunicationModal,
    homeTeamFilterId,
  } = usePublicClub();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HubTab>("updates");
  const [viewingAnnouncementId, setViewingAnnouncementId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previews, setPreviews] = useState<PreviewMessage[]>([]);
  const [mounted, setMounted] = useState(false);
  const [hubBanner, setHubBanner] = useState<HubBanner | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setHubBanner(null);
  }, [open]);

  useEffect(() => {
    if (!hubBanner) return;
    const id = window.setTimeout(() => setHubBanner(null), HUB_BANNER_MS);
    return () => window.clearTimeout(id);
  }, [hubBanner]);

  const clubId = club?.id ?? null;
  const { teamIds } = useUserTeamIds(clubId);
  const { isTrainer, isAdmin } = usePermissions();
  const { isClubAdmin } = useClubAdmin(clubId);

  const visible = Boolean(
    user &&
      isMember &&
      !checkingMembership &&
      club?.sectionVisibility.messages !== false,
  );

  const {
    items: updateItems,
    loading: updatesLoading,
    unreadCount,
    reload: reloadUpdates,
    markFeedItemRead,
    markAllRead,
    dismiss,
    announcements: feedAnnouncements,
  } = useClubUpdatesFeed({
    clubId,
    userTeamIds: teamIds,
    isAdmin,
    teamFilterId: homeTeamFilterId,
    enabled: visible,
  });

  useEffect(() => {
    if (!open) setViewingAnnouncementId(null);
  }, [open]);

  const viewingAnnouncement = useMemo(() => {
    const fromFeed =
      updateItems.find((item) => item.announcement?.id === viewingAnnouncementId)?.announcement ?? null;
    if (fromFeed) return fromFeed;
    return feedAnnouncements.find((row) => row.id === viewingAnnouncementId) ?? null;
  }, [feedAnnouncements, updateItems, viewingAnnouncementId]);

  const canManageAnnouncementsFlag = canManageAnnouncements(isClubAdmin);

  const handleDeleteAnnouncement = useCallback(
    async (announcementId: string) => {
      if (!canManageAnnouncementsFlag || !clubId) return;
      if (!window.confirm(t.communicationPage.confirmDeleteAnnouncement)) return;
      const linkedNotificationIds = updateItems
        .filter(
          (item) =>
            item.announcement?.id === announcementId ||
            (item.notification_type === "announcement" && item.reference_id === announcementId),
        )
        .map((item) => item.notification_id)
        .filter((id): id is string => Boolean(id));
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId)
        .eq("club_id", clubId);
      if (error) {
        setViewingAnnouncementId(null);
        setHubBanner({ variant: "error", text: error.message });
        return;
      }
      await Promise.all(linkedNotificationIds.map((id) => dismiss(id)));
      setViewingAnnouncementId(null);
      setHubBanner({ variant: "success", text: t.communicationPage.announcementDeleted });
      void reloadUpdates();
    },
    [
      canManageAnnouncementsFlag,
      clubId,
      dismiss,
      reloadUpdates,
      t.communicationPage.announcementDeleted,
      t.communicationPage.confirmDeleteAnnouncement,
      updateItems,
    ],
  );

  const handleEditAnnouncement = useCallback(
    (announcementId: string) => {
      setOpen(false);
      setViewingAnnouncementId(null);
      openCommunicationModal("announcements", announcementId, true);
    },
    [openCommunicationModal],
  );

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of teams) {
      map.set(team.id, team.name);
    }
    return map;
  }, [teams]);

  const loadPreviews = useCallback(async () => {
    if (!clubId || !user) return;
    setPreviewLoading(true);

    let rows: Array<{
      id: string;
      content: string;
      team_id: string | null;
      is_trainers_channel?: boolean;
      created_at: string;
    }>;

    const { data, error } = await supabase
      .from("messages")
      .select("id, content, team_id, is_trainers_channel, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      const fallback = await supabase
        .from("messages")
        .select("id, content, team_id, created_at")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (fallback.error) {
        setPreviews([]);
        setPreviewLoading(false);
        return;
      }
      rows = (fallback.data ?? []) as typeof rows;
    } else {
      rows = (data ?? []) as typeof rows;
    }

    const filtered = rows.filter((row) => {
      if (row.is_trainers_channel) return isTrainer || isAdmin;
      if (row.team_id === null) return true;
      if (!teamIds.includes(row.team_id) && !isAdmin) return false;
      if (homeTeamFilterId) return row.team_id === homeTeamFilterId;
      return true;
    });

    setPreviews(
      filtered.slice(0, 5).map((row) => ({
        ...row,
        channelLabel: row.is_trainers_channel
          ? t.communicationPage.trainersChannel
          : row.team_id === null
            ? t.clubPage.messagesHubClubGeneral
            : teamNameById.get(row.team_id) ?? t.clubPage.messagesHubTeamChannel,
        channelId: channelIdForMessage(row.team_id, Boolean(row.is_trainers_channel)),
      })),
    );
    setPreviewLoading(false);
  }, [
    clubId,
    homeTeamFilterId,
    isAdmin,
    isTrainer,
    teamIds,
    teamNameById,
    t.clubPage.messagesHubClubGeneral,
    t.clubPage.messagesHubTeamChannel,
    t.communicationPage.trainersChannel,
    user,
  ]);

  useEffect(() => {
    if (open && tab === "channels") void loadPreviews();
  }, [loadPreviews, open, tab]);

  useEffect(() => {
    if (open && tab === "updates") void reloadUpdates();
  }, [open, reloadUpdates, tab]);

  const openCommunication = useCallback(
    (channelId?: string) => {
      setOpen(false);
      openCommunicationModal(channelId);
    },
    [openCommunicationModal],
  );

  const handleUpdateTap = useCallback(
    (item: (typeof updateItems)[number]) => {
      if (item.kind === "announcement" && item.announcement) {
        void markFeedItemRead(item);
        setViewingAnnouncementId(item.announcement.id);
        return;
      }
      if (item.notification_type === "announcement" && item.reference_id) {
        void markFeedItemRead(item);
        setViewingAnnouncementId(item.reference_id);
        return;
      }
      if (item.notification_type === "task" && item.reference_id) {
        void markFeedItemRead(item);
        setOpen(false);
        navigate(`/tasks?id=${encodeURIComponent(item.reference_id)}`);
        return;
      }
      void markFeedItemRead(item);
      if (item.notification_type === "message") {
        openCommunication("club-general");
        return;
      }
      openCommunication();
    },
    [markFeedItemRead, navigate, openCommunication],
  );

  const draftWithAi = useCallback(() => {
    setOpen(false);
    openAi4tModal(t.clubPage.messagesHubAiPrompt);
  }, [openAi4tModal, t.clubPage.messagesHubAiPrompt]);

  const toastVisible = toasts.some((entry) => entry.open);

  if (!visible || !mounted) return null;

  return createPortal(
    <div className="text-[color:var(--club-foreground)]" style={publicClubCssVars(club)}>
      <motion.div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
        animate={{ y: toastVisible ? -TOAST_LIFT_PX : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      >
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16, scale: 0.92 }}
          animate={{ opacity: 0.7, y: 0, scale: 1 }}
          whileHover={{ opacity: 1 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setOpen(true)}
          className={cn(
            "group pointer-events-auto flex items-center gap-2.5 rounded-full px-3 py-2 sm:px-4 sm:py-2.5",
            "border-[2.5px] border-black/15 bg-white text-neutral-900",
            "shadow-[0_10px_36px_rgba(0,0,0,0.32),0_2px_10px_rgba(0,0,0,0.14)]",
            "ring-2 ring-white/90",
            "transition-[box-shadow,transform,border-color] duration-300",
            "hover:border-[#e31e24]/70 hover:shadow-[0_14px_44px_rgba(0,0,0,0.36)]",
          )}
          aria-label={t.clubPage.messagesHubOpen}
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <Ai4TLogo variant="bubble" className="h-9 w-9" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#e31e24] px-1 text-[9px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </span>
          <span className="pr-0.5 text-sm font-semibold tracking-tight transition-colors group-hover:text-[#e31e24]">
            {t.clubPage.messagesHubLabel}
          </span>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm sm:p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t.clubPage.messagesHubTitle}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex h-[min(85vh,640px)] w-full max-w-sm flex-col overflow-hidden text-neutral-900",
                clubAi4tModalPanelClass,
              )}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200/80 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="font-display text-base font-semibold text-neutral-900">
                    {t.clubPage.messagesHubTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-600">{t.clubPage.messagesHubSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                  aria-label={t.common.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
              {viewingAnnouncement ? (
                <AnnouncementDetailView
                  announcement={viewingAnnouncement}
                  embedded
                  onBack={() => setViewingAnnouncementId(null)}
                  canManage={canManageAnnouncementsFlag}
                  onEdit={
                    canManageAnnouncementsFlag
                      ? () => handleEditAnnouncement(viewingAnnouncement.id)
                      : undefined
                  }
                  onDelete={
                    canManageAnnouncementsFlag
                      ? () => void handleDeleteAnnouncement(viewingAnnouncement.id)
                      : undefined
                  }
                  labels={{
                    back: t.common.back,
                    publicSiteBadge: t.communicationPage.publicSiteBadge,
                    edit: t.communicationPage.editAnnouncement,
                    delete: t.common.delete,
                  }}
                  priorityClassName={
                    viewingAnnouncement.priority === "high" || viewingAnnouncement.priority === "urgent"
                      ? "bg-orange-100 text-orange-700"
                      : viewingAnnouncement.priority === "low"
                        ? "bg-neutral-100 text-neutral-600"
                        : "bg-neutral-100 text-neutral-700"
                  }
                />
              ) : (
                <>
              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as HubTab)}
                className="shrink-0 px-5 pb-3 sm:px-6"
              >
                <TabsList className={cn(ai4tMainTabListClass, "grid-cols-2")}>
                  <TabsTrigger value="updates" className={ai4tMainTabTriggerClass}>
                    {t.clubPage.messagesHubTabUpdates}
                  </TabsTrigger>
                  <TabsTrigger value="channels" className={ai4tMainTabTriggerClass}>
                    {t.clubPage.messagesHubTabChannels}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {tab === "updates" ? (
                  updatesLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.notifications.loading}
                    </div>
                  ) : updateItems.length === 0 ? (
                    <div className="px-2 py-8 text-center">
                      <Bell className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
                      <p className="text-sm font-semibold text-neutral-900">
                        {t.clubPage.messagesHubEmptyUpdates}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">{t.notifications.emptyHint}</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {updateItems.map((item) => {
                        const { icon: Icon, color } = getNotificationTypeMeta(item.notification_type);
                        return (
                          <li key={item.feedKey}>
                            <button
                              type="button"
                              onClick={() => handleUpdateTap(item)}
                              className={cn(
                                clubMessagesHubCardClass,
                                "flex w-full gap-3 px-3 py-2.5 text-left",
                                !item.is_read && "ring-1 ring-[color:var(--club-primary)]/30",
                              )}
                            >
                              <span className={cn("mt-0.5 shrink-0", color)}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    "block text-sm leading-snug text-neutral-900",
                                    !item.is_read && "font-semibold",
                                  )}
                                >
                                  {item.title}
                                </span>
                                {item.body ? (
                                  <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-600">
                                    {item.body}
                                  </span>
                                ) : null}
                                <span className="mt-1 block text-[10px] text-neutral-500">
                                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                </span>
                              </span>
                              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : previewLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.notifications.loading}
                  </div>
                ) : previews.length === 0 ? (
                  <div className="px-2 py-8 text-center">
                    <Hash className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
                    <p className="text-sm font-semibold text-neutral-900">
                      {t.clubPage.messagesHubEmptyChannels}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {previews.map((msg) => (
                      <li key={msg.id}>
                        <button
                          type="button"
                          onClick={() => openCommunication(msg.channelId)}
                          className={cn(clubMessagesHubCardClass, "flex w-full flex-col gap-1 px-3 py-2.5 text-left")}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-primary)]">
                            {msg.channelLabel}
                          </span>
                          <span className="line-clamp-2 text-sm text-neutral-800">{msg.content}</span>
                          <span className="text-[10px] text-neutral-500">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="shrink-0 space-y-2 border-t border-neutral-200/80 px-4 py-3">
                {hubBanner ? (
                  <p
                    role="status"
                    aria-live="polite"
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-center text-xs font-medium leading-snug",
                      hubBanner.variant === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800",
                    )}
                  >
                    {hubBanner.text}
                  </p>
                ) : null}

                {unreadCount > 0 && tab === "updates" ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-[color:var(--club-primary)] hover:underline"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {t.notifications.markAllRead}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={draftWithAi}
                  className={cn(clubMessagesHubCardClass, "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm")}
                >
                  <Ai4TLogo variant="bubble" className="h-9 w-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <BrandedText text={t.clubPage.messagesHubAiCta} />
                    <span className="mt-0.5 block text-[10px] text-neutral-600">
                      {t.clubPage.messagesHubAiHint}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    messagesCta();
                  }}
                  className="w-full rounded-full bg-[color:var(--club-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                >
                  {t.clubPage.messagesCtaSignedIn}
                </button>
              </div>
                </>
              )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
