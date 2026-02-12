import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
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

type Kpi = { label: string; value: string; change: string; icon: React.ElementType };

type RoleConfig = {
  title: string;
  greeting: string;
  kpis: Kpi[];
};

const roleConfig: Record<string, RoleConfig> = {
  admin: {
    title: "Club Admin Dashboard",
    greeting: "Welcome back, Admin",
    kpis: [
      { label: "Total Members", value: "—", change: "", icon: Users },
      { label: "Active Teams", value: "—", change: "", icon: Trophy },
      { label: "Upcoming", value: "—", change: "", icon: Calendar },
      { label: "Unpaid Dues", value: "—", change: "", icon: TrendingUp },
    ],
  },
  trainer: {
    title: "Trainer Dashboard",
    greeting: "Welcome back, Coach",
    kpis: [
      { label: "My Players", value: "—", change: "", icon: Users },
      { label: "Sessions This Week", value: "—", change: "", icon: Calendar },
      { label: "Attendance Rate", value: "—", change: "", icon: Activity },
      { label: "Next Match", value: "—", change: "", icon: Trophy },
    ],
  },
  player: {
    title: "Player Dashboard",
    greeting: "Welcome back",
    kpis: [
      { label: "Next Training", value: "—", change: "", icon: Calendar },
      { label: "Matches Played", value: "—", change: "", icon: Trophy },
      { label: "Attendance", value: "—", change: "", icon: Activity },
      { label: "Team Rank", value: "—", change: "", icon: TrendingUp },
    ],
  },
  sponsor: {
    title: "Partner Dashboard",
    greeting: "Welcome",
    kpis: [
      { label: "Club Events", value: "—", change: "", icon: Calendar },
      { label: "Contacts", value: "—", change: "", icon: Users },
      { label: "Messages", value: "—", change: "", icon: Clock },
      { label: "Insights", value: "—", change: "", icon: Bot },
    ],
  },
};

const defaultConfig: RoleConfig = {
  title: "Dashboard",
  greeting: "Welcome",
  kpis: [
    { label: "Upcoming", value: "—", change: "", icon: Calendar },
    { label: "Members", value: "—", change: "", icon: Users },
  ],
};

const defaultUpcoming: UpcomingItem[] = [
  { title: "Add your first training", time: "This week", type: "training" },
  { title: "Invite your players", time: "Today", type: "members" },
];

const DashboardContent = () => {
  const { role } = useParams();
  const config = roleConfig[role || ""] || defaultConfig;
  const { activeClubId, activeClub } = useActiveClub();

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
            if (k.label === "My Players") return { ...k, value: String(membersCount) };
            if (k.label === "Total Members") return { ...k, value: String(membersCount) };
            if (k.label === "Upcoming") return { ...k, value: String(nextUpcoming.length) };
            if (k.label === "Sessions This Week") return { ...k, value: String(nextUpcoming.filter((x) => x.type === "training").length) };
            if (k.label === "Unpaid Dues") return { ...k, value: String(dueCount) };
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
  }, [activeClubId, upcoming]);

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
              <CheckCircle2 className="w-4 h-4 text-primary" /> Getting started (trainer)
            </div>
            <div className="mt-3 grid gap-2 text-[13px] text-muted-foreground">
              <div>
                1) <Link className="text-foreground hover:underline" to="/members">Invite players</Link>
              </div>
              <div>
                2) <Link className="text-foreground hover:underline" to="/activities">Schedule the week</Link>
              </div>
              <div>
                3) Track confirmations in <Link className="text-foreground hover:underline" to="/activities">Schedule</Link>
              </div>
              <div>
                4) After the session: log match events in <Link className="text-foreground hover:underline" to="/matches">Matches</Link>
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
              key={kpi.label}
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
              Upcoming
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
              <span className="text-gradient-gold">AI Insights</span>
            </h2>
            <div className="space-y-2.5 relative">
              {[
                "Use Schedule to track confirmations for this week.",
                "After each match, log events — stats update automatically.",
                "Try AI → Weekly plan for a structured session outline.",
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
          <Clock className="w-3.5 h-3.5" /> Best-effort data: if Supabase isn’t applied yet, this dashboard shows placeholders.
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
