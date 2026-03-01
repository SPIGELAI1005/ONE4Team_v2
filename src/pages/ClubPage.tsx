import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import { Users, Calendar, Trophy, MapPin, Phone, Mail, Clock, ArrowRight, Star, Send, Loader2, X, ShieldQuestion, List, Newspaper, ShoppingBag, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/one4team-logo.png";

type Club = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  support_color: string | null;
  reference_images: string[] | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
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

type NewsRowLite = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  priority: string | null;
};

const ClubPage = () => {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamRowLite[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRowLite[]>([]);
  const [events, setEvents] = useState<EventRowLite[]>([]);
  const [news, setNews] = useState<NewsRowLite[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showRequestInvite, setShowRequestInvite] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isPreviewMode = searchParams.get("preview") === "1";

  const canRequestInvite = useMemo(() => Boolean(club?.is_public), [club?.is_public]);
  const referenceImages = useMemo(
    () => (club?.reference_images || []).filter(Boolean).slice(0, 8),
    [club?.reference_images]
  );

  useEffect(() => {
    const run = async () => {
      if (!clubSlug) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, slug, description, is_public, logo_url, cover_image_url, favicon_url, primary_color, secondary_color, tertiary_color, support_color, reference_images, address, phone, email, website")
        .eq("slug", clubSlug)
        .maybeSingle();
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        setClub(null);
      } else {
        const record = (data as Record<string, unknown> | null) ?? null;
        setClub(
          record
            ? {
                id: String(record.id),
                name: String(record.name),
                slug: String(record.slug),
                description: (record.description as string | null) ?? null,
                is_public: record.is_public !== false,
                logo_url: (record.logo_url as string | null) ?? null,
                cover_image_url: (record.cover_image_url as string | null) ?? null,
                favicon_url: (record.favicon_url as string | null) ?? null,
                primary_color: (record.primary_color as string | null) ?? null,
                secondary_color: (record.secondary_color as string | null) ?? null,
                tertiary_color: (record.tertiary_color as string | null) ?? null,
                support_color: (record.support_color as string | null) ?? null,
                reference_images: Array.isArray(record.reference_images) ? record.reference_images.map(String) : [],
                address: (record.address as string | null) ?? null,
                phone: (record.phone as string | null) ?? null,
                email: (record.email as string | null) ?? null,
                website: (record.website as string | null) ?? null,
              }
            : null
        );
      }
      setLoading(false);
    };
    void run();
  }, [clubSlug, t.common.error, toast]);

  useEffect(() => {
    if (!club?.favicon_url) return;
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (link) link.href = club.favicon_url;
  }, [club?.favicon_url]);

  useEffect(() => {
    const run = async () => {
      if (!club?.id) return;
      if (user) {
        setCheckingMembership(true);
        const { data: membership, error: membershipError } = await supabase
          .from("club_memberships")
          .select("id")
          .eq("club_id", club.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        setIsMember(!membershipError && Boolean(membership?.id));
        setCheckingMembership(false);
      } else {
        setIsMember(false);
      }

      setLoadingData(true);
      const nowIso = new Date().toISOString();
      const [teamsRes, sessionsRes, eventsRes, newsRes] = await Promise.all([
        supabase.from("teams").select("id, name, sport, age_group, coach_name").eq("club_id", club.id).order("name"),
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
        supabase
          .from("announcements")
          .select("id, title, content, created_at, priority")
          .eq("club_id", club.id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      if (teamsRes.error) toast({ title: t.common.error, description: teamsRes.error.message, variant: "destructive" });
      if (sessionsRes.error) toast({ title: t.common.error, description: sessionsRes.error.message, variant: "destructive" });
      if (eventsRes.error) toast({ title: t.common.error, description: eventsRes.error.message, variant: "destructive" });
      if (newsRes.error) toast({ title: t.common.error, description: newsRes.error.message, variant: "destructive" });

      setTeams((teamsRes.data as TeamRowLite[]) || []);
      setSessions((sessionsRes.data as TrainingSessionRowLite[]) || []);
      setEvents((eventsRes.data as EventRowLite[]) || []);
      setNews((newsRes.data as NewsRowLite[]) || []);
      setLoadingData(false);
    };
    void run();
  }, [club?.id, t.common.error, toast, user]);

  const handleOpenDashboard = () => {
    if (!club?.id) return;
    localStorage.setItem("one4team.activeClubId", club.id);
    const role = localStorage.getItem("one4team.activeRole") || "player";
    navigate(`/dashboard/${role}`);
  };

  const handleSubmitInviteRequest = async () => {
    if (!club) return;
    if (!canRequestInvite) {
      toast({ title: t.clubPage.inviteRequestsDisabled, description: t.clubPage.notAcceptingRequests });
      return;
    }
    if (!reqName.trim() || !reqEmail.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_club_invite", {
        _club_id: club.id,
        _name: reqName.trim(),
        _email: reqEmail.trim().toLowerCase(),
        _message: reqMessage.trim() || null,
      });
      if (error) throw error;
      toast({ title: t.clubPage.requestSent, description: t.clubPage.requestSentDesc });
      setReqName("");
      setReqEmail("");
      setReqMessage("");
      setShowRequestInvite(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({ title: t.common.error, description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const themeStyle = {
    "--club-primary": club?.primary_color || "#C4A052",
    "--club-secondary": club?.secondary_color || "#1E293B",
    "--club-tertiary": club?.tertiary_color || "#0F172A",
    "--club-support": club?.support_color || "#22C55E",
  } as React.CSSProperties;

  const shopCards = [
    { title: t.clubPage.shopJerseysTitle, description: t.clubPage.shopJerseysDesc },
    { title: t.clubPage.shopTrainingTitle, description: t.clubPage.shopTrainingDesc },
    { title: t.clubPage.shopFanTitle, description: t.clubPage.shopFanDesc },
  ];

  return (
    <div className="min-h-screen bg-background" style={themeStyle}>
      <AppHeader
        title={club?.name || t.common.club}
        subtitle={club?.description || t.clubPage.inviteOnlyOnboarding}
        back={false}
        rightSlot={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => setShowSections(true)}>
              <List className="w-4 h-4 mr-1" /> {t.clubPage.sections}
            </Button>
            {isMember ? (
              <Button size="sm" className="font-semibold text-white hover:brightness-110" style={{ backgroundColor: "var(--club-primary)" }} onClick={handleOpenDashboard} disabled={checkingMembership}>
                {t.clubPage.openDashboard}
              </Button>
            ) : (
              <Button size="sm" className="font-semibold text-white hover:brightness-110" style={{ backgroundColor: "var(--club-primary)" }} onClick={() => setShowRequestInvite(true)}>
                {t.clubPage.requestInvite}
              </Button>
            )}
          </div>
        }
      />

      {isPreviewMode ? (
        <div className="border-b border-primary/20 bg-primary/10">
          <div className="container mx-auto px-4 py-2 text-xs text-primary font-medium">
            {t.clubPage.previewMode} · {t.clubPage.previewModeDesc}
          </div>
        </div>
      ) : null}

      <div className="hidden md:block border-b border-border bg-background/40 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-2 flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#about" className="hover:text-foreground transition-colors">{t.clubPage.aboutSection}</a>
          <a href="#news" className="hover:text-foreground transition-colors">{t.clubPage.newsSection}</a>
          <a href="#teams" className="hover:text-foreground transition-colors">{t.clubPage.teamsSection}</a>
          <a href="#shop" className="hover:text-foreground transition-colors">{t.clubPage.shopSection}</a>
          <a href="#media" className="hover:text-foreground transition-colors">{t.clubPage.mediaSection}</a>
          <a href="#schedule" className="hover:text-foreground transition-colors">{t.clubPage.scheduleSection}</a>
          <a href="#events" className="hover:text-foreground transition-colors">{t.clubPage.eventsSection}</a>
          <a href="#contact" className="hover:text-foreground transition-colors">{t.clubPage.contactSection}</a>
        </div>
      </div>

      {showSections ? (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowSections(false)}>
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-bold text-foreground tracking-tight">{t.clubPage.sections}</div>
              <Button variant="ghost" size="icon" onClick={() => setShowSections(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid gap-2">
              {[
                { id: "about", label: t.clubPage.aboutSection },
                { id: "news", label: t.clubPage.newsSection },
                { id: "teams", label: t.clubPage.teamsSection },
                { id: "shop", label: t.clubPage.shopSection },
                { id: "media", label: t.clubPage.mediaSection },
                { id: "schedule", label: t.clubPage.scheduleSection },
                { id: "events", label: t.clubPage.eventsSection },
                { id: "contact", label: t.clubPage.contactSection },
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setShowSections(false);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border/60 bg-background/40 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{section.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}

      <section className="relative py-20 md:py-28 overflow-hidden">
        {club?.cover_image_url ? <img src={club.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,var(--club-tertiary)_0%,var(--club-secondary)_45%,transparent_100%)] opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-background" />
        <div className="container mx-auto px-4 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> {t.clubPage.loadingClub}
              </div>
            ) : !club ? (
              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <ShieldQuestion className="w-5 h-5" /> {t.clubPage.clubNotFound}
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>{t.clubPage.goHome}</Button>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 rounded-3xl mx-auto mb-6 border border-white/20 bg-white/10 backdrop-blur overflow-hidden flex items-center justify-center">
                  <img src={club.logo_url || logo} alt={club.name} className="w-full h-full object-cover" />
                </div>
                <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 text-white">{club.name}</h1>
                <p className="text-lg text-white/85 mb-2">{t.clubPage.clubOnboardingSubtitle}</p>
                <p className="text-white/80 max-w-2xl mx-auto mb-8">{club.description || t.clubPage.joinCommunity}</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {isMember ? (
                    <Button size="lg" className="font-semibold text-white hover:brightness-110" style={{ backgroundColor: "var(--club-primary)" }} onClick={handleOpenDashboard}>
                      {t.clubPage.openDashboard} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button size="lg" className="font-semibold text-white hover:brightness-110" style={{ backgroundColor: "var(--club-primary)" }} onClick={() => setShowRequestInvite(true)}>
                      {t.clubPage.requestInvite} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  <Button size="lg" variant="outline" className="border-white/40 text-white bg-white/5 hover:bg-white/10" onClick={() => navigate("/onboarding")}>
                    {t.clubPage.createAClub}
                  </Button>
                </div>
                {!canRequestInvite ? <div className="mt-6 text-xs text-white/70">{t.clubPage.privateClub}</div> : null}
              </>
            )}
          </motion.div>
        </div>
      </section>

      <section id="about" className="py-14 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Users, label: t.clubPage.membersCount, desc: t.clubPage.membersCountDesc },
              { icon: Trophy, label: t.clubPage.teamsCount, desc: t.clubPage.teamsCountDesc },
              { icon: Star, label: t.clubPage.leaguesCount, desc: t.clubPage.leaguesCountDesc },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-6 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl">
                <stat.icon className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--club-primary)" }} />
                <h3 className="font-display text-xl font-bold text-foreground mb-1">{stat.label}</h3>
                <p className="text-sm text-muted-foreground">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="news" className="py-14 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            {t.clubPage.topNews} <span className="text-gradient-gold">{t.clubPage.newsSection}</span>
          </h2>
          {loadingData ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--club-primary)" }} /></div>
          ) : !news.length ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noNewsYet}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.newsWillAppear}</div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-4">
              {news.map((item) => (
                <div key={item.id} className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1"><Newspaper className="w-3 h-3" /> {item.priority || t.clubPage.newsSection}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-4">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="teams" className="py-14 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            {t.clubPage.ourTeams} <span className="text-gradient-gold">{t.clubPage.teamsHighlight}</span>
          </h2>
          {loadingData ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--club-primary)" }} /></div>
          ) : teams.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noTeamsYet}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.teamsWillAppear}</div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.10)] hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white" style={{ backgroundColor: "var(--club-primary)" }}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1 tracking-tight truncate">{team.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{team.sport}{team.age_group ? ` · ${team.age_group}` : ""}</p>
                  {team.coach_name ? <div className="text-xs text-muted-foreground truncate">{t.clubPage.coach}: {team.coach_name}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="shop" className="py-14 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-2">
            {t.clubPage.featuredShop} <span className="text-gradient-gold">{t.clubPage.shopSection}</span>
          </h2>
          <p className="text-center text-muted-foreground text-sm max-w-2xl mx-auto mb-8">{t.clubPage.shopDesc}</p>
          <div className="grid md:grid-cols-3 gap-4">
            {shopCards.map((card) => (
              <div key={card.title} className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </div>
            ))}
          </div>
          {club?.website ? (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => window.open(club.website || "", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-1" /> {t.clubPage.openShop}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section id="media" className="py-14 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            {t.clubPage.mediaSection} <span className="text-gradient-gold">{t.clubPage.galleryHighlight}</span>
          </h2>
          {!referenceImages.length ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noGalleryYet}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.galleryWillAppear}</div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {referenceImages.map((image) => (
                <div key={image} className="aspect-[4/3] rounded-2xl border border-border/70 overflow-hidden bg-card/40">
                  <img src={image} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="schedule" className="py-14 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            {t.clubPage.trainingSchedule} <span className="text-gradient-gold">{t.clubPage.scheduleHighlight}</span>
          </h2>
          {loadingData ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--club-primary)" }} /></div>
          ) : sessions.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noUpcomingSessions}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.sessionsWillShow}</div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
              {sessions.map((session, index) => (
                <div key={session.id} className={`flex items-center justify-between px-5 py-4 ${index < sessions.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{session.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(session.starts_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      {session.location ? <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</span> : null}
                      {session.teams?.name ? <span className="inline-flex items-center gap-1"><Trophy className="w-3 h-3" /> {session.teams.name}</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="events" className="py-14 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            {t.clubPage.upcomingEvents} <span className="text-gradient-gold">{t.clubPage.eventsHighlight}</span>
          </h2>
          {loadingData ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--club-primary)" }} /></div>
          ) : events.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-2xl glass-card p-8 text-center">
              <div className="text-sm font-medium text-foreground">{t.clubPage.noUpcomingEvents}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.clubPage.eventsWillAppear}</div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {events.map((event) => (
                <div key={event.id} className="p-5 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">{event.event_type}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(event.starts_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1 tracking-tight">{event.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{event.description || ""}</p>
                  {event.location ? <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="contact" className="py-14 border-t border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            {t.clubPage.getInTouch} <span className="text-gradient-gold">{t.clubPage.touchHighlight}</span>
          </h2>
          {club?.address || club?.phone || club?.email || club?.website ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {club.address ? <div className="p-5 rounded-xl bg-card border border-border text-center"><MapPin className="w-6 h-6 text-primary mx-auto mb-2" /><div className="text-xs text-muted-foreground mb-1">{t.clubPage.address}</div><div className="text-sm text-foreground whitespace-pre-line">{club.address}</div></div> : null}
              {club.phone ? <div className="p-5 rounded-xl bg-card border border-border text-center"><Phone className="w-6 h-6 text-primary mx-auto mb-2" /><div className="text-xs text-muted-foreground mb-1">{t.clubPage.phone}</div><div className="text-sm text-foreground">{club.phone}</div></div> : null}
              {club.email ? <div className="p-5 rounded-xl bg-card border border-border text-center"><Mail className="w-6 h-6 text-primary mx-auto mb-2" /><div className="text-xs text-muted-foreground mb-1">{t.clubPage.emailLabel}</div><div className="text-sm text-foreground">{club.email}</div></div> : null}
              {club.website ? <div className="p-5 rounded-xl bg-card border border-border text-center"><ExternalLink className="w-6 h-6 text-primary mx-auto mb-2" /><div className="text-xs text-muted-foreground mb-1">{t.clubPage.website}</div><Button variant="outline" size="sm" onClick={() => window.open(club.website || "", "_blank")}>{t.clubPage.visitWebsite}</Button></div> : null}
            </div>
          ) : (
            <div className="rounded-2xl glass-card p-8 text-center text-sm text-muted-foreground">{t.clubPage.noContactDetails}</div>
          )}
        </div>
      </section>

      {showRequestInvite ? (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRequestInvite(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.98, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-foreground tracking-tight">{t.clubPage.requestAnInvite}</h3>
                <p className="text-xs text-muted-foreground">{t.clubPage.weWillNotify}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRequestInvite(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {!club ? (
              <div className="text-sm text-muted-foreground">{t.clubPage.clubNotAvailable}</div>
            ) : !canRequestInvite ? (
              <div className="text-sm text-muted-foreground">{t.clubPage.notAcceptingRequests}</div>
            ) : (
              <div className="space-y-3">
                <Input placeholder={t.clubPage.yourNameRequired} value={reqName} onChange={(event) => setReqName(event.target.value)} className="bg-background/60" maxLength={120} />
                <Input placeholder={t.clubPage.emailRequired} type="email" value={reqEmail} onChange={(event) => setReqEmail(event.target.value)} className="bg-background/60" maxLength={254} />
                <textarea
                  placeholder={t.clubPage.optionalMessage}
                  value={reqMessage}
                  onChange={(event) => setReqMessage(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  rows={4}
                  maxLength={800}
                />
                <Button onClick={handleSubmitInviteRequest} disabled={submitting || !reqName.trim() || !reqEmail.trim()} className="w-full text-white hover:brightness-110 disabled:opacity-40" style={{ backgroundColor: "var(--club-primary)" }}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.clubPage.sending}</> : <><Send className="w-4 h-4 mr-2" /> {t.clubPage.sendRequest}</>}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      ) : null}

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={club?.logo_url || logo} alt="" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-display font-bold text-sm text-foreground">{club?.name || t.common.club}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t.clubPage.poweredBy}</p>
        </div>
      </footer>
    </div>
  );
};

export default ClubPage;
