import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  Bot,
  ArrowUpRight,
  Activity,
  CheckCircle2,
} from "lucide-react";
import AnalyticsWidgets from "@/components/dashboard/AnalyticsWidgets";
import AchievementBadges from "@/components/dashboard/AchievementBadges";
import NotificationBell from "@/components/dashboard/NotificationBell";
import ClubSwitcher from "@/components/dashboard/ClubSwitcher";
import LiveMatchTicker from "@/components/dashboard/LiveMatchTicker";
import AdminNotificationSender from "@/components/dashboard/AdminNotificationSender";
import SeasonProgressionChart from "@/components/analytics/SeasonProgressionChart";
import TeamChemistry from "@/components/analytics/TeamChemistry";
import HeadToHead from "@/components/analytics/HeadToHead";
import NaturalLanguageStats from "@/components/ai/NaturalLanguageStats";
import SeasonAwards from "@/components/analytics/SeasonAwards";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClub } from "@/hooks/use-active-club";

type UpcomingItem = {
  title: string;
  time: string;
  type: string;
};

type Kpi = { id: string; label: string; value: string; change: string; icon: React.ElementType };

type RoleConfig = {
  title: string;
  greeting: string;
  kpis: Kpi[];
};

const DashboardContent = () => {
  const { role } = useParams();
  const { t } = useLanguage();
  const { activeClubId, activeClub } = useActiveClub();

  const roleConfig: Record<string, RoleConfig> = useMemo(
    () => ({
      admin: {
        title: t.dashboard.clubAdminDashboard,
        greeting: t.dashboard.welcomeBackAdmin,
        kpis: [
          { id: "totalMembers", label: t.dashboard.totalMembers, value: "—", change: "", icon: Users },
          { id: "activeTeams", label: t.dashboard.activeTeams, value: "—", change: "", icon: Trophy },
          { id: "upcoming", label: t.dashboard.upcoming, value: "—", change: "", icon: Calendar },
          { id: "unpaidDues", label: t.dashboard.unpaidDues, value: "—", change: "", icon: TrendingUp },
        ],
      },
      trainer: {
        title: t.dashboard.trainerDashboard,
        greeting: t.dashboard.welcomeBackCoach,
        kpis: [
          { id: "myPlayers", label: t.dashboard.myPlayers, value: "—", change: "", icon: Users },
          { id: "sessionsThisWeek", label: t.dashboard.sessionsThisWeek, value: "—", change: "", icon: Calendar },
          { id: "attendanceRate", label: t.dashboard.attendanceRate, value: "—", change: "", icon: Activity },
          { id: "nextMatch", label: t.dashboard.nextMatch, value: "—", change: "", icon: Trophy },
        ],
      },
      player: {
        title: t.dashboard.playerDashboard,
        greeting: t.dashboard.welcomeBack,
        kpis: [
          { id: "nextTraining", label: t.dashboard.nextTraining, value: "—", change: "", icon: Calendar },
          { id: "matchesPlayed", label: t.dashboard.matchesPlayed, value: "—", change: "", icon: Trophy },
          { id: "attendance", label: t.dashboard.attendance, value: "—", change: "", icon: Activity },
          { id: "teamRank", label: t.dashboard.teamRank, value: "—", change: "", icon: TrendingUp },
        ],
      },
      sponsor: {
        title: t.dashboard.partnerDashboard,
        greeting: t.dashboard.welcome,
        kpis: [
          { id: "clubEvents", label: t.dashboard.clubEvents, value: "—", change: "", icon: Calendar },
          { id: "contacts", label: t.dashboard.contacts, value: "—", change: "", icon: Users },
          { id: "messages", label: t.dashboard.messages, value: "—", change: "", icon: Clock },
          { id: "insights", label: t.dashboard.insights, value: "—", change: "", icon: Bot },
        ],
      },
    }),
    [t]
  );

  const defaultConfig: RoleConfig = useMemo(
    () => ({
      title: t.dashboard.dashboardTitle,
      greeting: t.dashboard.welcome,
      kpis: [
        { id: "upcoming", label: t.dashboard.upcoming, value: "—", change: "", icon: Calendar },
        { id: "totalMembers", label: t.dashboard.totalMembers, value: "—", change: "", icon: Users },
      ],
    }),
    [t]
  );

  const defaultUpcoming: UpcomingItem[] = useMemo(
    () => [
      { title: t.dashboard.addFirstTraining, time: t.common.thisWeek, type: "training" },
      { title: t.dashboard.invitePlayers, time: t.common.today, type: "members" },
    ],
    [t]
  );

  const config = roleConfig[role || ""] || defaultConfig;

  const [kpis, setKpis] = useState<Kpi[]>(config.kpis);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>(defaultUpcoming);

  // Route-driven profile (A): persist selected role so AppHeader can reflect it on every page.
  useEffect(() => {
    if (!role) return;
    localStorage.setItem("one4team.activeRole", role);
  }, [role]);

  useEffect(() => {
    // reset on role change
    setKpis(config.kpis);
  }, [config.kpis]);

  useEffect(() => {
    if (!activeClubId) {
      setUpcoming(defaultUpcoming);
      return;
    }

    const run = async () => {
      // Best-effort. If Supabase isn't applied yet, pages should still render.
      try {
        const now = new Date();
        const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [{ data: acts }, { data: members }, { data: dues }] = await Promise.all([
          supabase
            .from("activities")
            .select("title, type, starts_at")
            .eq("club_id", activeClubId)
            .gte("starts_at", now.toISOString())
            .lt("starts_at", to.toISOString())
            .order("starts_at", { ascending: true })
            .limit(6),
          supabase
            .from("club_memberships")
            .select("id")
            .eq("club_id", activeClubId)
            .eq("status", "active")
            .limit(1000),
          supabase
            .from("membership_dues")
            .select("id")
            .eq("club_id", activeClubId)
            .eq("status", "due")
            .limit(1000),
        ]);

        const nextUpcoming: UpcomingItem[] = (acts ?? []).map((a) => ({
          title: (a as { title: string }).title,
          type: (a as { type: string }).type,
          time: new Date((a as { starts_at: string }).starts_at).toLocaleString([], {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            day: "numeric",
          }),
        }));

        setUpcoming(nextUpcoming.length ? nextUpcoming : defaultUpcoming);

        const membersCount = (members ?? []).length;
        const dueCount = (dues ?? []).length;

        // Only fill the KPIs we can compute cheaply.
        setKpis((prev) =>
          prev.map((k) => {
            if (k.id === "myPlayers") return { ...k, value: String(membersCount) };
            if (k.id === "totalMembers") return { ...k, value: String(membersCount) };
            if (k.id === "upcoming") return { ...k, value: String(nextUpcoming.length) };
            if (k.id === "sessionsThisWeek") return { ...k, value: String(nextUpcoming.filter((x) => x.type === "training").length) };
            if (k.id === "unpaidDues") return { ...k, value: String(dueCount) };
            return k;
          })
        );
      } catch {
        // keep placeholders
      }
    };

    void run();
  }, [activeClubId]);

  const showGettingStarted = useMemo(() => {
    // Keep it simple: if no club or no upcoming, show.
    if (!activeClubId) return true;
    return upcoming.length === 0 || upcoming === defaultUpcoming;
  }, [activeClubId, upcoming, defaultUpcoming]);

  return (
    <div className="flex-1 overflow-y-auto bg-background pb-20 lg:pb-0 scroll-glow">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-nav">
        <div className="px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">{config.title}</h1>
            <p className="text-[13px] text-muted-foreground">
              {config.greeting}{activeClub?.name ? ` · ${activeClub.name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <ClubSwitcher />
            <NotificationBell />
            <div className="w-9 h-9 rounded-2xl bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shadow-gold">
              {(role || "U")[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 lg:p-8 space-y-5">
        {showGettingStarted && (role === "trainer" || role === "admin") && (
          <div className="rounded-2xl glass-card p-5">
            <div className="font-display font-semibold text-foreground text-[15px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> {t.dashboard.gettingStarted}
            </div>
            <div className="mt-3 grid gap-2 text-[13px] text-muted-foreground">
              <div>
                1) <Link className="text-foreground hover:underline" to="/members">{t.dashboard.invitePlayersLink}</Link>
              </div>
              <div>
                2) <Link className="text-foreground hover:underline" to="/activities">{t.dashboard.scheduleTheWeek}</Link>
              </div>
              <div>
                3) {t.dashboard.trackConfirmations} <Link className="text-foreground hover:underline" to="/activities">{t.dashboard.schedule}</Link>
              </div>
              <div>
                4) {t.dashboard.afterSession} <Link className="text-foreground hover:underline" to="/matches">{t.dashboard.matches}</Link>
              </div>
            </div>
          </div>
        )}

        {/* Live Match Ticker */}
        <LiveMatchTicker />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
              className="p-4 rounded-2xl glass-card haptic-press cursor-default"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                </div>
                {kpi.change && (
                  <span className="text-[11px] font-medium text-primary flex items-center gap-0.5 ios-pill bg-primary/8 border-primary/20">
                    <ArrowUpRight className="w-3 h-3" />
                    {kpi.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-display font-bold text-foreground tracking-tight">{kpi.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Analytics Charts */}
        <AnalyticsWidgets />

        {/* Season Progression */}
        <SeasonProgressionChart />

        {/* Team Chemistry */}
        <TeamChemistry />

        {/* Head-to-Head Comparison */}
        <HeadToHead />

        {/* Achievement Badges */}
        <AchievementBadges />

        {/* Natural Language Stats Query */}
        <NaturalLanguageStats />

        {/* Season Awards */}
        <SeasonAwards />

        {/* Admin Notification Sender - only for admin role */}
        {role === "admin" && <AdminNotificationSender />}

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Upcoming */}
          <div className="lg:col-span-2 rounded-2xl glass-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px]">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              </div>
              {t.dashboard.upcoming}
            </h2>
            <div className="space-y-1">
              {upcoming.map((event, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-default"
                >
                  <div>
                    <div className="text-[13px] font-medium text-foreground">{event.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{event.time}</div>
                  </div>
                  <span
                    className={`ios-pill ${
                      event.type === "match"
                        ? "bg-accent/10 text-accent border-accent/20"
                        : event.type === "training"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {event.type}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="rounded-2xl glass-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px] relative">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-gradient-gold">{t.dashboard.aiInsights}</span>
            </h2>
            <div className="space-y-2.5 relative">
              {[
                t.dashboard.aiTip1,
                t.dashboard.aiTip2,
                t.dashboard.aiTip3,
              ].map((s, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  className="text-[13px] text-muted-foreground p-3 rounded-xl bg-primary/5 border border-primary/8 leading-relaxed cursor-default"
                >
                  {s}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {t.dashboard.bestEffort}
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
