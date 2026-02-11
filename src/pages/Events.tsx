import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import {
  Plus, CalendarDays, MapPin, Clock, Users,
  Loader2, X, Trophy, CheckCircle2, XCircle, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
// logo is rendered by AppHeader
import type { EventRow, MembershipWithProfile, ParticipantWithMembershipProfile } from "@/types/supabase";

type Event = EventRow;

type Participant = {
  id: string;
  event_id: string;
  membership_id: string;
  status: string;
  profiles?: { display_name: string | null };
};

type Membership = MembershipWithProfile;

const statusIcons: Record<string, React.ReactNode> = {
  confirmed: <CheckCircle2 className="w-3 h-3 text-primary" />,
  declined: <XCircle className="w-3 h-3 text-accent" />,
  invited: <Mail className="w-3 h-3 text-primary" />,
  attended: <CheckCircle2 className="w-3 h-3 text-primary" />,
};

const Events = () => {
  // navigation is handled by AppHeader
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("event");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxPart, setMaxPart] = useState("");

  useEffect(() => {
    if (!clubId) return;
    const fetchEvents = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", clubId)
        .order("starts_at", { ascending: false });
      setEvents((data as Event[]) || []);
      setLoading(false);
    };
    fetchEvents();
  }, [clubId]);

  const openEventDetail = async (event: Event) => {
    setSelectedEvent(event);
    setLoadingDetail(true);

    const [partRes, memRes] = await Promise.all([
      supabase
        .from("event_participants")
        .select(
          "*, club_memberships!event_participants_membership_id_fkey(user_id, profiles!club_memberships_user_id_fkey(display_name))",
        )
        .eq("event_id", event.id),
      supabase
        .from("club_memberships")
        .select("id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_user_id_fkey(display_name)")
        .eq("club_id", clubId!),
    ]);

    const rawParts = (partRes.data ?? []) as unknown as ParticipantWithMembershipProfile[];
    const parts: Participant[] = rawParts.map((p) => ({
      id: p.id,
      event_id: p.event_id,
      membership_id: p.membership_id,
      status: p.status,
      profiles: p.club_memberships?.profiles ?? undefined,
    }));

    setParticipants(parts);
    setMembers(((memRes.data ?? []) as unknown as Membership[]));
    setLoadingDetail(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !startsAt || !clubId || !user) return;
    const { data, error } = await supabase
      .from("events")
      .insert({
        club_id: clubId,
        title: title.trim(),
        description: description || null,
        event_type: eventType,
        location: location || null,
        starts_at: startsAt,
        ends_at: endsAt || null,
        max_participants: maxPart ? parseInt(maxPart) : null,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setEvents(prev => [data as Event, ...prev]);
    setShowAdd(false);
    setTitle(""); setDescription(""); setLocation(""); setStartsAt(""); setEndsAt(""); setMaxPart("");
    toast({ title: "Event created" });
  };

  const handleInvite = async (membershipId: string) => {
    if (!selectedEvent) return;
    const { error } = await supabase.from("event_participants").insert({
      event_id: selectedEvent.id,
      membership_id: membershipId,
      status: "invited",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    openEventDetail(selectedEvent);
    toast({ title: "Invitation sent" });
  };

  const handleRSVP = async (participantId: string, status: string) => {
    const { error } = await supabase.from("event_participants").update({ status }).eq("id", participantId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (selectedEvent) openEventDetail(selectedEvent);
  };

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Please sign in.</p></div>;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <AppHeader
        title="Events"
        subtitle="Events & tournaments"
        rightSlot={
          <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        }
      />

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">No club found.</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {events.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No events yet. Create your first one!</div>
            ) : events.map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-card border border-border p-5 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => openEventDetail(ev)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground">{ev.title}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    ev.event_type === "tournament" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {ev.event_type === "tournament" ? "🏆 Tournament" : "📅 Event"}
                  </span>
                </div>
                {ev.description && <p className="text-sm text-muted-foreground mb-2">{ev.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ev.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location}</span>}
                  {ev.max_participants && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Max {ev.max_participants}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">New Event</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} className="bg-background" maxLength={200} />
              <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                rows={3} maxLength={2000} />
              <select value={eventType} onChange={e => setEventType(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="event">Event</option>
                <option value="tournament">Tournament</option>
              </select>
              <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="bg-background" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Start *</label>
                  <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="bg-background" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">End</label>
                  <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="bg-background" />
                </div>
              </div>
              <Input placeholder="Max participants (optional)" type="number" value={maxPart} onChange={e => setMaxPart(e.target.value)} className="bg-background" />
              <Button onClick={handleCreate} disabled={!title.trim() || !startsAt}
                className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Create Event
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Event Detail / Participants Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[95vw] sm:max-w-lg rounded-2xl bg-card border border-border p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{selectedEvent.title}</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}><X className="w-4 h-4" /></Button>
            </div>
            {selectedEvent.description && <p className="text-sm text-muted-foreground mb-4">{selectedEvent.description}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(selectedEvent.starts_at).toLocaleString()}</span>
              {selectedEvent.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedEvent.location}</span>}
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Participants */}
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Participants ({participants.length})
                </h4>
                {participants.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-4">No participants invited yet.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border">
                        <div className="flex items-center gap-2">
                          {statusIcons[p.status]}
                          <span className="text-sm text-foreground">{p.profiles?.display_name || "Member"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground capitalize">{p.status}</span>
                          {p.status === "invited" && members.find(m => m.user_id === user?.id && m.id === p.membership_id) && (
                            <div className="flex gap-1 ml-2">
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-primary" onClick={() => handleRSVP(p.id, "confirmed")}>Accept</Button>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-accent" onClick={() => handleRSVP(p.id, "declined")}>Decline</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Invite members */}
                <h4 className="text-sm font-semibold text-foreground mb-2">Invite Members</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {members
                    .filter(m => !participants.some(p => p.membership_id === m.id))
                    .map(m => (
                      <div key={m.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-muted/50">
                        <span className="text-sm text-foreground">{m.profiles?.display_name || "Member"}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-primary" onClick={() => handleInvite(m.id)}>
                          <Mail className="w-3 h-3 mr-1" /> Invite
                        </Button>
                      </div>
                    ))}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
      {/* Mobile Nav */}
      <MobileBottomNav />
    </div>
  );
};

export default Events;
