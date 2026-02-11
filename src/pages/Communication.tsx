import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import {
  Plus, Megaphone, MessageSquare, Send, Loader2,
  AlertTriangle, X, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
// logo is rendered by AppHeader

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  author_id: string;
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  profiles?: { display_name: string | null };
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-orange-500/10 text-orange-400",
  urgent: "bg-accent/10 text-accent",
};

const Communication = () => {
  // navigation is handled by AppHeader
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();
  const perms = usePermissions();

  const [tab, setTab] = useState<"announcements" | "messages">("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Announcement form
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState("normal");

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setAnnouncements([]);
    setMessages([]);
    setLoading(true);
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    const fetchData = async () => {
      setLoading(true);
      const [annRes, msgRes] = await Promise.all([
        supabase.from("announcements").select("*").eq("club_id", clubId).order("created_at", { ascending: false }),
        supabase.from("messages").select("*, profiles!messages_sender_id_fkey(display_name)").eq("club_id", clubId).is("team_id", null).order("created_at", { ascending: true }).limit(100),
      ]);
      setAnnouncements((annRes.data as Announcement[]) || []);
      setMessages((msgRes.data as unknown as Message[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [clubId]);

  // Realtime messages
  useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel("club-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `club_id=eq.${clubId}` },
        async (payload) => {
          const { data } = await supabase.from("profiles").select("display_name").eq("user_id", payload.new.sender_id).maybeSingle();
          const msg = { ...payload.new, profiles: data } as unknown as Message;
          setMessages(prev => [...prev, msg]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clubId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !clubId || !user) return;
    const { error } = await supabase.from("messages").insert({ club_id: clubId, sender_id: user.id, content: newMessage.trim() });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewMessage("");
  };

  const handleAddAnnouncement = async () => {
    if (!perms.isAdmin) {
      toast({ title: "Not authorized", description: "Only admins can post announcements.", variant: "destructive" });
      return;
    }
    if (!annTitle.trim() || !annContent.trim() || !clubId || !user) return;
    const { data, error } = await supabase
      .from("announcements")
      .insert({ club_id: clubId, title: annTitle.trim(), content: annContent.trim(), priority: annPriority, author_id: user.id })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setAnnouncements(prev => [data as Announcement, ...prev]);
    setShowAddAnnouncement(false);
    setAnnTitle(""); setAnnContent(""); setAnnPriority("normal");
    toast({ title: "Announcement posted" });
  };

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Please sign in.</p></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Communication"
        subtitle="Announcements + Club chat"
        rightSlot={
          tab === "announcements" ? (
            <Button
              size="sm"
              className="bg-gradient-gold text-primary-foreground hover:opacity-90"
              onClick={() => setShowAddAnnouncement(true)}
              disabled={!perms.isAdmin}
            >
              <Plus className="w-4 h-4 mr-1" /> Announce
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 flex gap-1">
          {[
            { id: "announcements" as const, label: "Announcements", icon: Megaphone },
            { id: "messages" as const, label: "Club Chat", icon: MessageSquare },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">No club found.</div>
        ) : tab === "announcements" ? (
          <div className="max-w-2xl mx-auto space-y-4">
            {announcements.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No announcements yet.</div>
            ) : announcements.map((ann, i) => (
              <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl bg-card border border-border p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground">{ann.title}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityColors[ann.priority] || priorityColors.normal}`}>{ann.priority}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{ann.content}</p>
                <p className="text-xs text-muted-foreground">{new Date(ann.created_at).toLocaleString()}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-200px)]">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">No messages yet. Start the conversation!</div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      isMe ? "bg-gradient-gold text-primary-foreground rounded-br-md" : "bg-card border border-border text-foreground rounded-bl-md"
                    }`}>
                      {!isMe && <div className="text-[10px] font-medium text-primary mb-1">{msg.profiles?.display_name || "Unknown"}</div>}
                      <p>{msg.content}</p>
                      <div className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendMessage()} className="bg-card border-border" maxLength={1000} />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Announcement Modal */}
      {showAddAnnouncement && perms.isAdmin && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddAnnouncement(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">New Announcement</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddAnnouncement(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Title *" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="bg-background" maxLength={200} />
              <textarea placeholder="Content *" value={annContent} onChange={e => setAnnContent(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                rows={4} maxLength={2000} />
              <select value={annPriority} onChange={e => setAnnPriority(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="low">Low Priority</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <Button onClick={handleAddAnnouncement} disabled={!annTitle.trim() || !annContent.trim()}
                className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Post Announcement
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Communication;
