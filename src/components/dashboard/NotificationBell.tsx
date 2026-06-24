import { useState, useEffect } from "react";
import { Bell, Check, Loader2, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { formatDistanceToNow } from "date-fns";
import { getNotificationTypeMeta } from "@/lib/notification-type-meta";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};

const NotificationBell = () => {
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user || !clubId) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    const fetchNotifications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, notification_type, is_read, created_at")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!cancelled) {
        if (!error && data) setNotifications(data);
        setLoading(false);
      }
    };

    void fetchNotifications();

    const channel = supabase
      .channel(`notifications-${clubId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `club_id=eq.${clubId},user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as Notification;
          setNotifications((prev) => [row, ...prev.filter((n) => n.id !== row.id)].slice(0, 20));
        }
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
          const row = payload.new as Notification;
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        }
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
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user, clubId]);

  const markAsRead = async (id: string) => {
    if (!clubId || !user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user || !clubId || unreadCount === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const dismissNotification = async (id: string) => {
    if (!clubId || !user) return;
    await supabase
      .from("notifications")
      .delete()
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`flex gap-3 border-b border-border/40 px-4 py-3 transition-all duration-200 hover:bg-muted/20 ${
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
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void dismissNotification(n.id);
                              }}
                              className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                              aria-label={t.notifications.dismiss}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                            {!n.is_read ? (
                              <button
                                type="button"
                                onClick={() => void markAsRead(n.id)}
                                className="text-[10px] text-primary hover:underline"
                              >
                                {t.notifications.markRead}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
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
