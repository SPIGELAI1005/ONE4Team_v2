import { useState, useEffect } from "react";
import { Bell, Check, X, Trophy, Calendar, Megaphone, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};

const typeIcons: Record<string, React.ElementType> = {
  match: Trophy,
  event: Calendar,
  announcement: Megaphone,
  general: Info,
};

const typeColors: Record<string, string> = {
  match: "text-accent",
  event: "text-primary",
  announcement: "text-gold",
  general: "text-muted-foreground",
};

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const dismissNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Demo notifications for display when no real data
  const displayNotifications =
    notifications.length > 0
      ? notifications
      : [
          {
            id: "demo-1",
            title: "U17 Match Tomorrow",
            body: "FC Riverside vs FC Thunder — Saturday at 15:00",
            notification_type: "match",
            is_read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
          {
            id: "demo-2",
            title: "Club Meeting Announced",
            body: "Annual general meeting next Monday at 19:00",
            notification_type: "announcement",
            is_read: false,
            created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          },
          {
            id: "demo-3",
            title: "Training Cancelled",
            body: "Thursday's U14 session moved to Friday 17:00",
            notification_type: "event",
            is_read: true,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          },
        ];

  const demoUnread = notifications.length > 0 ? unreadCount : 2;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
      >
        <Bell className="w-4 h-4" />
        {demoUnread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent rounded-full flex items-center justify-center text-[10px] font-bold text-accent-foreground"
          >
            {demoUnread > 9 ? "9+" : demoUnread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-xl bg-card border border-border shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-foreground">
                  Notifications
                </h3>
                {demoUnread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {displayNotifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  displayNotifications.map((n) => {
                    const Icon = typeIcons[n.notification_type] || Info;
                    const color = typeColors[n.notification_type] || "text-muted-foreground";
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors flex gap-3 ${
                          !n.is_read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className={`mt-0.5 ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                              {n.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(n.id);
                              }}
                              className="text-muted-foreground/50 hover:text-muted-foreground shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {n.body && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                            {!n.is_read && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="text-[10px] text-primary hover:underline"
                              >
                                Mark read
                              </button>
                            )}
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
