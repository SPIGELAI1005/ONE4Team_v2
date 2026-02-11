import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import {
  Users, Calendar, Trophy, MapPin, Phone, Mail,
  Clock, ArrowRight, Star, Send, Loader2, X, ShieldQuestion,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

type Club = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
};

type InviteRequestRow = {
  id: string;
  club_id: string;
  name: string;
  email: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type TeamRowLite = {
  id: string;
  name: string;
  sport: string;
  age_group: string | null;
  coach_name: string | null;
};

type TrainingSessionRowLite = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  team_id: string | null;
  teams?: { name: string } | null;
};

type EventRowLite = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  location: string | null;
};

const sponsors = [
  { name: "SportTech Pro", tier: "Gold" },
  { name: "City Insurance AG", tier: "Gold" },
  { name: "FreshFit Drinks", tier: "Silver" },
  { name: "Local Print Shop", tier: "Bronze" },
  { name: "GreenField Garden", tier: "Bronze" },
];

const ClubPage = () => {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { toast } = useToast();

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState<TeamRowLite[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRowLite[]>([]);
  const [events, setEvents] = useState<EventRowLite[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [showSections, setShowSections] = useState(false);

  const [showRequestInvite, setShowRequestInvite] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canRequestInvite = useMemo(() => Boolean(club?.is_public), [club?.is_public]);

  useEffect(() => {
    const run = async () => {
      if (!clubSlug) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, slug, description, is_public")
        .eq("slug", clubSlug)
        .maybeSingle();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setClub(null);
      } else {
        setClub((data as unknown as Club) || null);
      }
      setLoading(false);
    };
    void run();
  }, [clubSlug, toast]);

  useEffect(() => {
    const run = async () => {
      if (!club?.id) return;
      setLoadingData(true);

      const nowIso = new Date().toISOString();
      const [teamsRes, sessionsRes, eventsRes] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, sport, age_group, coach_name")
          .eq("club_id", club.id)
          .order("name"),
        supabase
          .from("training_sessions")
          .select("id, title, location, starts_at, team_id, teams(name)")
          .eq("club_id", club.id)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(10),
        supabase
          .from("events")
          .select("id, title, description, event_type, starts_at, location")
          .eq("club_id", club.id)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(6),
      ]);

      if (teamsRes.error) toast({ title: "Error", description: teamsRes.error.message, variant: "destructive" });
      if (sessionsRes.error) toast({ title: "Error", description: sessionsRes.error.message, variant: "destructive" });
      if (eventsRes.error) toast({ title: "Error", description: eventsRes.error.message, variant: "destructive" });

      setTeams((teamsRes.data as unknown as TeamRowLite[]) || []);
      setSessions((sessionsRes.data as unknown as TrainingSessionRowLite[]) || []);
      setEvents((eventsRes.data as unknown as EventRowLite[]) || []);

      setLoadingData(false);
    };
    void run();
  }, [club?.id, toast]);

  const handleSubmitInviteRequest = async () => {
    if (!club) return;
    if (!canRequestInvite) {
      toast({ title: "Invite requests disabled", description: "This club is not accepting public invite requests." });
      return;
    }
    if (!reqName.trim() || !reqEmail.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("request_club_invite", {
        _club_id: club.id,
        _name: reqName.trim(),
        _email: reqEmail.trim().toLowerCase(),
        _message: reqMessage.trim() || null,
      });

      if (error) throw error;

      void data;
      toast({ title: "Request sent", description: "The club admins will review your request shortly." });
      setReqName("");
      setReqEmail("");
      setReqMessage("");
      setShowRequestInvite(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={club?.name || "Club"}
        subtitle={club?.description || "Invite-only onboarding"}
        back={false}
        rightSlot={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={() => setShowSections(true)}
            >
              <List className="w-4 h-4 mr-1" /> Sections
            </Button>
            <Button
              size="sm"
              className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90"
              onClick={() => setShowRequestInvite(true)}
            >
              Request Invite
            </Button>
          </div>
        }
      />

      {/* In-page navigation (desktop) */}
      <div className="hidden md:block border-b border-border bg-background/40 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-2 flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
          <a href="#teams" className="hover:text-foreground transition-colors">Teams</a>
          <a href="#schedule" className="hover:text-foreground transition-colors">Schedule</a>
          <a href="#events" className="hover:text-foreground transition-colors">Events</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
        </div>
      </div>

      {/* Sections modal (mobile + optional desktop) */}
      {showSections && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowSections(false)}>
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-bold text-foreground tracking-tight">Sections</div>
              <Button variant="ghost" size="icon" onClick={() => setShowSections(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid gap-2">
              {[
                { id: "about", label: "About" },
                { id: "teams", label: "Teams" },
                { id: "schedule", label: "Schedule" },
                { id: "events", label: "Events" },
                { id: "contact", label: "Contact" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setShowSections(false);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border/60 bg-background/40 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Hero */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-6 shadow-gold">
              <img src={logo} alt="" className="w-12 h-12" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading club…
              </div>
            ) : !club ? (
              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <ShieldQuestion className="w-5 h-5" />
                  Club not found
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
              </div>
            ) : (
              <>
                <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
                  {club.name.split(" ").slice(0, -1).join(" ") || club.name}{" "}
                  <span className="text-gradient-gold">{club.name.split(" ").slice(-1)[0]}</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-2">Invite-only club onboarding · iOS-style glass UI</p>
                <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                  {club.description || "Join our community of athletes, supporters, and friends."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    size="lg"
                    className="bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90"
                    onClick={() => setShowRequestInvite(true)}
                  >
                    Request Invite <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" className="border-border" onClick={() => navigate("/onboarding")}>
                    Create a Club
                  </Button>
                </div>
                {!canRequestInvite && (
                  <div className="mt-6 text-xs text-muted-foreground">
                    This club is private and does not accept public invite requests.
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, label: "247 Members", desc: "Active community across all age groups" },
              { icon: Trophy, label: "8 Teams", desc: "From youth to senior competitive squads" },
              { icon: Star, label: "3 Leagues", desc: "Competing at regional and district level" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-xl bg-card border border-border"
              >
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-display text-xl font-bold text-foreground mb-1">{stat.label}</h3>
                <p className="text-sm text-muted-foreground">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Teams */}
      <section id="teams" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Our <span className="text-gradient-gold">Teams</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teams.map((team, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center mb-3">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{team.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{team.sport}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{team.players} players</span>
                  <span>{team.coach}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Schedule */}
      <section id="schedule" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Training <span className="text-gradient-gold">Schedule</span>
          </h2>
          <div className="max-w-2xl mx-auto rounded-xl bg-card border border-border overflow-hidden">
            {schedule.map((s, i) => (
              <div key={i} className={`flex items-center justify-between px-5 py-4 ${i < schedule.length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-primary">{s.day}</div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.team}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {s.location}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {s.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Upcoming <span className="text-gradient-gold">Events</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {events.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{event.type}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {event.date}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1 tracking-tight">{event.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{event.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Our <span className="text-gradient-gold">Partners</span>
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {sponsors.map((s, i) => (
              <div key={i} className="px-6 py-3 rounded-lg bg-card border border-border text-center">
                <div className="text-sm font-medium text-foreground">{s.name}</div>
                <div className={`text-[10px] font-medium mt-1 ${
                  s.tier === "Gold" ? "text-primary" : s.tier === "Silver" ? "text-muted-foreground" : "text-gold-dark"
                }`}>{s.tier} Partner</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 border-t border-border">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            Get in <span className="text-gradient-gold">Touch</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: MapPin, label: "Address", value: "Riverside Sports Park\n12345 Riverside, DE" },
              { icon: Phone, label: "Phone", value: "+49 123 456 789" },
              { icon: Mail, label: "Email", value: "info@fc-riverside.de" },
            ].map((c, i) => (
              <div key={i} className="p-5 rounded-xl bg-card border border-border text-center">
                <c.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-xs text-muted-foreground mb-1">{c.label}</div>
                <div className="text-sm text-foreground whitespace-pre-line">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request Invite Modal */}
      {showRequestInvite && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRequestInvite(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-foreground tracking-tight">Request an invite</h3>
                <p className="text-xs text-muted-foreground">We’ll notify the club admins.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRequestInvite(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!club ? (
              <div className="text-sm text-muted-foreground">Club not available.</div>
            ) : !canRequestInvite ? (
              <div className="text-sm text-muted-foreground">This club is not accepting public invite requests.</div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Your name *"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  className="bg-background/60"
                  maxLength={120}
                />
                <Input
                  placeholder="Email *"
                  type="email"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  className="bg-background/60"
                  maxLength={254}
                />
                <textarea
                  placeholder="Optional message (e.g. age group / team / role)"
                  value={reqMessage}
                  onChange={(e) => setReqMessage(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  rows={4}
                  maxLength={800}
                />
                <Button
                  onClick={handleSubmitInviteRequest}
                  disabled={submitting || !reqName.trim() || !reqEmail.trim()}
                  className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Send request
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={logo} alt="" className="w-6 h-6" />
            <span className="font-display font-bold text-sm text-foreground">
              FC Riverside
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by ONE4Team · © 2026 All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClubPage;
