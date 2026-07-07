import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Loader2, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useClubId } from "@/hooks/use-club-id";
import { useClubNotifications } from "@/hooks/use-club-notifications";
import { getNotificationTypeMeta } from "@/lib/notification-type-meta";
import { communicationChannelQuery } from "@/lib/club-message-access";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_HEADER_ICON,
  DASHBOARD_HEADER_UTILITY_BUTTON,
} from "@/lib/dashboard-page-shell";

const NotificationBell = () => {
  const { clubId } = useClubId();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllRead,
    dismiss,
  } = useClubNotifications(clubId);

  const openCommunication = (channelId?: string) => {
    const suffix = channelId ? `?${communicationChannelQuery(channelId)}` : "";
    navigate(`/communication${suffix}`);
    setOpen(false);
  };

  const handleNotificationTap = (notification: (typeof notifications)[number]) => {
    void markAsRead(notification.id);
    if (notification.notification_type === "announcement") {
      const suffix = notification.reference_id
        ? `?${communicationChannelQuery("announcements")}&announcement=${encodeURIComponent(notification.reference_id)}`
        : `?${communicationChannelQuery("announcements")}`;
      navigate(`/communication${suffix}`);
      setOpen(false);
      return;
    }
    if (notification.notification_type === "message") {
      openCommunication("club-general");
      return;
    }
    if (notification.notification_type === "task" && notification.reference_id) {
      navigate(`/tasks?id=${encodeURIComponent(notification.reference_id)}`);
      setOpen(false);
      return;
    }
    openCommunication();
  };

  const overlay =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <>
                <motion.button
                  type="button"
                  key="notifications-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-[100] bg-background/55 backdrop-blur-[2px]"
                  aria-label={t.common.close}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  key="notifications-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t.notifications.title}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={cn(
                    "fixed z-[101] box-border overflow-hidden rounded-2xl glass-heavy shadow-2xl",
                    "inset-x-4 top-[max(4.25rem,calc(env(safe-area-inset-top,0px)+3.5rem))] w-auto max-w-none",
                    "md:inset-x-auto md:left-auto md:right-5 md:top-[4.5rem] md:w-[min(24rem,calc(100vw-2.5rem))] lg:right-6 lg:w-96",
                  )}
                >
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                    <h3 className="font-display text-[13px] font-semibold text-foreground">{t.notifications.title}</h3>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => void markAllRead()}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Check className="h-3 w-3" />
                        {t.notifications.markAllRead}
                      </button>
                    ) : null}
                  </div>

                  <div className="max-h-[min(20rem,calc(100dvh-10rem))] overflow-y-auto overscroll-contain">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.notifications.loading}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-6 py-8 text-center">
                        <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden />
                        <p className="text-sm font-medium text-foreground">{t.notifications.noNotifications}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.notifications.emptyHint}</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const { icon: Icon, color } = getNotificationTypeMeta(n.notification_type);
                        return (
                          <motion.button
                            key={n.id}
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => handleNotificationTap(n)}
                            className={`flex w-full gap-3 border-b border-border/40 px-4 py-3 text-left transition-all duration-200 hover:bg-muted/20 ${
                              !n.is_read ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className={`mt-0.5 ${color}`}>
                              <Icon className="h-4 w-4" strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                                  {n.title}
                                </p>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void dismiss(n.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.stopPropagation();
                                      void dismiss(n.id);
                                    }
                                  }}
                                  className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                                  aria-label={t.notifications.dismiss}
                                >
                                  <X className="h-3 w-3" />
                                </span>
                              </div>
                              {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </span>
                                {!n.is_read ? (
                                  <span className="text-[10px] text-primary">{t.notifications.markRead}</span>
                                ) : null}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className={cn(DASHBOARD_HEADER_UTILITY_BUTTON, "relative")}
        aria-label={t.notifications.title}
        aria-expanded={open}
      >
        <Bell className={cn(DASHBOARD_HEADER_ICON, "text-muted-foreground")} strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-accent-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>
      {overlay}
    </div>
  );
};

export default NotificationBell;
