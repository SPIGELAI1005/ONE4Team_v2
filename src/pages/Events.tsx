import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Plus, CalendarDays, MapPin, Clock, Users,
  Loader2, X, Trophy, Calendar, CheckCircle2, XCircle, Mail, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import { useLanguage } from "@/hooks/use-language";
import { useActiveClub } from "@/hooks/use-active-club";
import { trackUsageEvent } from "@/lib/usage-events";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import { SommerfestHero } from "@/components/sommerfest/sommerfest-hero";
import { SommerfestEventsHub } from "@/components/sommerfest/sommerfest-events-hub";
import { ClubFootballCampAdmin } from "@/components/events/club-football-camp-admin";
import { EventsHighlightAdmin } from "@/components/events/events-highlight-admin";
import { isCampEvent, type ClubCampEventRow } from "@/lib/club-football-camp-api";
import {
  EMPTY_CLUB_EVENTS_HIGHLIGHT,
  type ClubEventsHighlightConfig,
} from "@/lib/club-events-highlight";
import { loadClubEventsHighlight } from "@/lib/club-events-highlight-api";
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
  const perms = usePermissions();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { activeClub } = useActiveClub();
  const showAllachExtras = isTsvAllachClub(activeClub);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsHighlight, setEventsHighlight] = useState<ClubEventsHighlightConfig>(EMPTY_CLUB_EVENTS_HIGHLIGHT);
  const showHighlight = eventsHighlight.enabled;
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const campEvents = useMemo(
    () => (events as ClubCampEventRow[]).filter((ev) => isCampEvent(ev)),
    [events],
  );
  const regularEvents = useMemo(() => events.filter((ev) => !isCampEvent(ev)), [events]);
  const publishedCampKeys = useMemo(
    () => new Set(campEvents.map((ev) => ev.import_key).filter(Boolean) as string[]),
    [campEvents],
  );

  function mergePublishedCamps(rows: ClubCampEventRow[]) {
    setEvents((prev) => {
      const nonCamp = prev.filter((ev) => !isCampEvent(ev));
      const otherCamps = (prev as ClubCampEventRow[]).filter(
        (ev) => isCampEvent(ev) && !rows.some((r) => r.import_key && r.import_key === ev.import_key),
      );
      return [...rows, ...otherCamps, ...nonCamp] as Event[];
    });
  }

  const [openPanels, setOpenPanels] = useState({
    participants: true,
    invite: false,
  });

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("event");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxPart, setMaxPart] = useState("");

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setEvents([]);
    setSelectedEvent(null);
    setParticipants([]);
    setMembers([]);
    setEventsHighlight(EMPTY_CLUB_EVENTS_HIGHLIGHT);
    setLoading(true);
    setLoadingDetail(false);
  }, [clubId]);

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

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void loadClubEventsHighlight(supabase, clubId, activeClub).then(({ data }) => {
      if (!cancelled) setEventsHighlight(data);
    });
    return () => {
      cancelled = true;
    };
  }, [clubId, activeClub]);

  const openEventDetail = async (event: Event) => {
    setSelectedEvent(event);
    setLoadingDetail(true);
    setOpenPanels({ participants: true, invite: false });

    const [partRes, memRes] = await Promise.all([
      supabase
        .from("event_participants")
        .select(
          "*, club_memberships!event_participants_membership_id_fkey(user_id, profiles!club_memberships_profile_fk(display_name))",
        )
        .eq("event_id", event.id),
      supabase
        .from("club_memberships")
        .select("id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_profile_fk(display_name)")
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
    if (!perms.isTrainer) {
      toast({ title: t.common.notAuthorized, description: t.eventsPage.toastNotAuthorizedCreate, variant: "destructive" });
      return;
    }
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
    if (error) { toast({ title: t.common.error, description: error.message, variant: "destructive" }); return; }
    trackUsageEvent({
      eventName: "event_created",
      clubId,
      moduleKey: "events",
      metadata: { event_type: eventType },
    });
    setEvents(prev => [data as Event, ...prev]);
    setShowAdd(false);
    setTitle(""); setDescription(""); setLocation(""); setStartsAt(""); setEndsAt(""); setMaxPart("");
    toast({ title: t.eventsPage.toastEventCreated });
  };

  const handleInvite = async (membershipId: string) => {
    if (!perms.isTrainer) {
      toast({ title: t.common.notAuthorized, description: t.eventsPage.toastNotAuthorizedInvite, variant: "destructive" });
      return;
    }
    if (!selectedEvent) return;
    const { error } = await supabase.from("event_participants").insert({
      event_id: selectedEvent.id,
      membership_id: membershipId,
      status: "invited",
    });
    if (error) { toast({ title: t.common.error, description: error.message, variant: "destructive" }); return; }
    openEventDetail(selectedEvent);
    toast({ title: t.eventsPage.toastInvitationSent });
  };

  const handleRSVP = async (participantId: string, status: string) => {
    if (!selectedEvent) return;
    const { error } = await supabase
      .from("event_participants")
      .update({ status })
      .eq("event_id", selectedEvent.id)
      .eq("id", participantId);
    if (error) { toast({ title: t.common.error, description: error.message, variant: "destructive" }); return; }
    if (selectedEvent) openEventDetail(selectedEvent);
  };

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={t.eventsPage.title}
        subtitle={t.eventsPage.subtitle}
        toolbarRevision={String(perms.isTrainer)}
        rightSlot={
          perms.isTrainer ? (
            <Button size="sm" className="bg-gradient-gold-static text-primary-foreground hover:brightness-110 shrink-0" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1" /> {t.eventsPage.newEvent}
            </Button>
          ) : null
        }
      />

      <div className={DASHBOARD_PAGE_INNER}>
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">{t.communicationPage.noClubFound}</div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            {showHighlight || perms.isAdmin ? (
              <>
                {showHighlight ? <SommerfestHero variant="events" highlight={eventsHighlight} /> : null}
                {perms.isAdmin && user && clubId ? (
                  <EventsHighlightAdmin
                    clubId={clubId}
                    userId={user.id}
                    value={eventsHighlight}
                    onSaved={setEventsHighlight}
                  />
                ) : null}
                {showAllachExtras && perms.isTrainer && user && clubId ? (
                  <ClubFootballCampAdmin
                    clubId={clubId}
                    userId={user.id}
                    publishedKeys={publishedCampKeys}
                    onPublished={mergePublishedCamps}
                  />
                ) : null}
                {showAllachExtras ? <SommerfestEventsHub campEvents={campEvents} /> : null}
              </>
            ) : null}

            {regularEvents.length > 0 ? (
              <div className="space-y-3 border-t border-border pt-4">
                {showHighlight || showAllachExtras ? (
                  <h3 className="font-display text-base font-semibold text-foreground">{t.eventsPage.title}</h3>
                ) : null}
                <div className="max-w-3xl mx-auto space-y-4">
            {regularEvents.map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-card border border-border p-5 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => openEventDetail(ev)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground">{ev.title}</h3>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    ev.event_type === "tournament" ? "bg-primary/10 text-primary" : ev.event_type === "camp" ? "bg-[#00E676]/15 text-[#14532d] dark:text-[#86efac]" : "bg-muted text-muted-foreground"
                  }`}>
                    {ev.event_type === "tournament" ? (
                      <>
                        <Trophy className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                        {t.eventsPage.badgeTournament}
                      </>
                    ) : ev.event_type === "camp" ? (
                      <>
                        <CalendarDays className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                        {t.eventsPage.typeCamp}
                      </>
                    ) : (
                      <>
                        <Calendar className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                        {t.eventsPage.badgeEvent}
                      </>
                    )}
                  </span>
                </div>
                {ev.description && <p className="text-sm text-muted-foreground mb-2">{ev.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ev.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location}</span>}
                  {ev.max_participants && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.eventsPage.maxParticipantsShort.replace("{n}", String(ev.max_participants))}</span>}
                </div>
              </motion.div>
            ))}
                </div>
              </div>
            ) : !showHighlight && !showAllachExtras ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">{t.eventsPage.emptyState}</div>
            ) : null}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="font-display font-bold text-foreground min-w-0 truncate">{t.eventsPage.modalNewTitle}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder={t.eventsPage.phTitle} value={title} onChange={e => setTitle(e.target.value)} className="bg-background" maxLength={200} />
              <textarea placeholder={t.eventsPage.phDescription} value={description} onChange={e => setDescription(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                rows={3} maxLength={2000} />
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">{t.eventsPage.typeEvent}</SelectItem>
                  <SelectItem value="tournament">{t.eventsPage.typeTournament}</SelectItem>
                  <SelectItem value="camp">{t.eventsPage.typeCamp}</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="bg-background" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Start *</label>
                  <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="bg-background" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">{t.eventsPage.labelEnd}</label>
                  <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="bg-background" />
                </div>
              </div>
              <Input placeholder={t.eventsPage.phMaxParticipants} type="number" value={maxPart} onChange={e => setMaxPart(e.target.value)} className="bg-background" />
              <Button onClick={handleCreate} disabled={!title.trim() || !startsAt}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">
                {t.eventsPage.createEvent}
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
            <div className="sticky top-0 z-10 -mx-6 px-6 pt-4 pb-3 bg-card/70 backdrop-blur-2xl border-b border-border">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-foreground truncate">{selectedEvent.title}</h3>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {new Date(selectedEvent.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {selectedEvent.location ? ` · ${selectedEvent.location}` : ""}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}><X className="w-4 h-4" /></Button>
              </div>
            </div>

            {selectedEvent.description && <p className="text-sm text-muted-foreground mt-4 mb-4">{selectedEvent.description}</p>}

            {loadingDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Participants */}
                <div className="rounded-2xl glass-card p-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setOpenPanels((p) => ({ ...p, participants: !p.participants }))}
                    className="w-full flex items-center justify-between"
                  >
                    <h4 className="text-sm font-display font-semibold text-foreground flex items-center gap-2 min-w-0">
                      <Users className="w-4 h-4 text-primary shrink-0" /> {t.eventsPage.participantsCount.replace("{count}", String(participants.length))}
                    </h4>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openPanels.participants ? "rotate-180" : ""}`} />
                  </button>

                  {openPanels.participants && (
                    <>
                      {participants.length === 0 ? (
                        <p className="text-xs text-muted-foreground mt-3">{t.eventsPage.noParticipantsYet}</p>
                      ) : (
                        <div className="space-y-2 mt-3">
                          {participants.map(p => (
                            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-background/60 border border-border/60">
                              <div className="flex items-center gap-2 min-w-0">
                                {statusIcons[p.status]}
                                <span className="text-sm text-foreground truncate">{p.profiles?.display_name || t.eventsPage.memberFallback}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground capitalize">{p.status}</span>
                                {p.status === "invited" && members.find(m => m.user_id === user?.id && m.id === p.membership_id) && (
                                  <div className="flex gap-1 ml-2">
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-primary" onClick={() => handleRSVP(p.id, "confirmed")}>{t.eventsPage.accept}</Button>
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-accent" onClick={() => handleRSVP(p.id, "declined")}>{t.eventsPage.decline}</Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Invite members */}
                <div className="rounded-2xl glass-card p-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setOpenPanels((p) => ({ ...p, invite: !p.invite }))}
                    className="w-full flex items-center justify-between"
                  >
                    <h4 className="text-sm font-display font-semibold text-foreground">Invite members</h4>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openPanels.invite ? "rotate-180" : ""}`} />
                  </button>

                  {openPanels.invite && (
                    <div className="space-y-1 max-h-52 overflow-y-auto mt-3">
                      {members
                        .filter(m => !participants.some(p => p.membership_id === m.id))
                        .map(m => (
                          <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted/30">
                            <span className="text-sm text-foreground truncate">{m.profiles?.display_name || t.eventsPage.memberFallback}</span>
                            {perms.isTrainer && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-primary shrink-0" onClick={() => handleInvite(m.id)}>
                                <Mail className="w-3 h-3 mr-1" /> {t.eventsPage.invite}
                              </Button>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Events;
