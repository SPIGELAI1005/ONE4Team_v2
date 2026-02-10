import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Megaphone, Users, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isErrorWithMessage } from "@/types/dashboard";

const notificationTypes = [
  { value: "match", label: "Match", icon: "🏆" },
  { value: "event", label: "Event", icon: "📅" },
  { value: "announcement", label: "Announcement", icon: "📢" },
  { value: "general", label: "General", icon: "ℹ️" },
];

const AdminNotificationSender = () => {
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("announcement");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !clubId || !user) return;

    setSending(true);
    try {
      // Get all club members
      const { data: members, error: membersError } = await supabase
        .from("club_memberships")
        .select("user_id")
        .eq("club_id", clubId)
        .eq("status", "active");

      if (membersError) throw membersError;
      if (!members?.length) {
        toast({ title: "No active members found", variant: "destructive" });
        setSending(false);
        return;
      }

      // Create notifications for all members
      const notifications = members.map((m) => ({
        club_id: clubId,
        user_id: m.user_id,
        title: title.trim(),
        body: body.trim() || null,
        notification_type: type,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      setSent(true);
      toast({
        title: "Notifications sent!",
        description: `Sent to ${members.length} member${members.length > 1 ? "s" : ""}`,
      });

      // Reset after delay
      setTimeout(() => {
        setTitle("");
        setBody("");
        setType("announcement");
        setSent(false);
      }, 2000);
    } catch (err: unknown) {
      toast({
        title: "Failed to send",
        description: isErrorWithMessage(err) ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-5"
    >
      <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-primary" />
        Send Notification
      </h2>

      {sent ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center py-6 gap-2"
        >
          <CheckCircle className="w-10 h-10 text-primary" />
          <p className="text-sm font-medium text-foreground">Notification sent to all members!</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {/* Type selector */}
          <div className="flex gap-2 flex-wrap">
            {notificationTypes.map((nt) => (
              <button
                key={nt.value}
                onClick={() => setType(nt.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  type === nt.value
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {nt.icon} {nt.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <Input
            placeholder="Notification title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-muted/50 border-border text-sm"
          />

          {/* Body */}
          <Input
            placeholder="Optional message body..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="bg-muted/50 border-border text-sm"
          />

          {/* Send button */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              Sends to all active club members
            </span>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!title.trim() || sending}
              className="bg-gradient-gold text-primary-foreground hover:opacity-90"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminNotificationSender;
