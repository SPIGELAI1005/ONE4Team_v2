import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Loader2, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useClubId } from "@/hooks/use-club-id";
import { useClubNotifications } from "@/hooks/use-club-notifications";
import { getNotificationTypeMeta } from "@/lib/notification-type-meta";
import { communicationChannelQuery } from "@/lib/club-message-access";

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

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl glass-card text-muted-foreground transition-all duration-200 hover:text-foreground"
        aria-label={t.notifications.title}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl glass-heavy sm:w-96"
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

              <div className="max-h-80 overflow-y-auto">
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
