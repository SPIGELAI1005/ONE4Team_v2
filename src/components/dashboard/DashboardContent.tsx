import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Calendar, Trophy, TrendingUp, Clock,
  Bot, ArrowUpRight, Activity
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

const roleConfig: Record<string, { title: string; greeting: string; kpis: { label: string; value: string; change: string; icon: React.ElementType }[] }> = {
  admin: {
    title: "Club Admin Dashboard",
    greeting: "Welcome back, Admin",
    kpis: [
      { label: "Total Members", value: "247", change: "+12", icon: Users },
      { label: "Active Teams", value: "8", change: "+1", icon: Trophy },
      { label: "Upcoming Events", value: "5", change: "", icon: Calendar },
      { label: "Revenue (MTD)", value: "€4,280", change: "+8%", icon: TrendingUp },
    ],
  },
  trainer: {
    title: "Trainer Dashboard",
    greeting: "Welcome back, Coach",
    kpis: [
      { label: "My Players", value: "32", change: "", icon: Users },
      { label: "Sessions This Week", value: "4", change: "", icon: Calendar },
      { label: "Attendance Rate", value: "87%", change: "+3%", icon: Activity },
      { label: "Next Match", value: "Sat 15:00", change: "", icon: Trophy },
    ],
  },
  player: {
    title: "Player Dashboard",
    greeting: "Welcome back, Player",
    kpis: [
      { label: "Next Training", value: "Tomorrow", change: "18:00", icon: Calendar },
      { label: "Matches Played", value: "14", change: "", icon: Trophy },
      { label: "Attendance", value: "92%", change: "+2%", icon: Activity },
      { label: "Team Rank", value: "#3", change: "", icon: TrendingUp },
    ],
  },
  sponsor: {
    title: "Sponsor Dashboard",
    greeting: "Welcome, Partner",
    kpis: [
      { label: "Active Contracts", value: "2", change: "", icon: Trophy },
      { label: "Brand Impressions", value: "12.4K", change: "+18%", icon: TrendingUp },
      { label: "Pending Invoices", value: "1", change: "", icon: Clock },
      { label: "Club Events", value: "3", change: "", icon: Calendar },
    ],
  },
};

const defaultConfig = {
  title: "Dashboard",
  greeting: "Welcome",
  kpis: [
    { label: "Notifications", value: "3", change: "", icon: Calendar },
    { label: "Upcoming", value: "2", change: "", icon: Calendar },
  ],
};

const upcomingEvents = [
  { title: "U17 Training Session", time: "Today, 18:00", type: "training" },
  { title: "FC Riverside vs FC Thunder", time: "Saturday, 15:00", type: "match" },
  { title: "Club Annual Meeting", time: "Next Monday, 19:00", type: "event" },
  { title: "Youth Tournament", time: "Feb 22, 09:00", type: "tournament" },
];

const aiSuggestions = [
  "3 players have missed 2+ sessions — consider a check-in.",
  "Training field B is available Friday 16:00–18:00.",
  "Membership renewals due for 12 members this month.",
];

const DashboardContent = () => {
  const { role } = useParams();
  const config = roleConfig[role || ""] || defaultConfig;

  return (
    <div className="flex-1 overflow-y-auto bg-background pb-20 lg:pb-0 scroll-glow">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-nav">
        <div className="px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">{config.title}</h1>
            <p className="text-[13px] text-muted-foreground">{config.greeting}</p>
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
        {/* Live Match Ticker */}
        <LiveMatchTicker />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {config.kpis.map((kpi, i) => (
            <motion.div
              key={i}
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
          {/* Upcoming events */}
          <div className="lg:col-span-2 rounded-2xl glass-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px]">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              </div>
              Upcoming
            </h2>
            <div className="space-y-1">
              {upcomingEvents.map((event, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-default"
                >
                  <div>
                    <div className="text-[13px] font-medium text-foreground">{event.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{event.time}</div>
                  </div>
                  <span className={`ios-pill ${
                    event.type === "match" ? "bg-accent/10 text-accent border-accent/20" :
                    event.type === "training" ? "bg-primary/10 text-primary border-primary/20" :
                    event.type === "tournament" ? "bg-gold-dark/10 text-gold border-gold/20" :
                    "bg-muted text-muted-foreground"
                  }`}>
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
              {aiSuggestions.map((s, i) => (
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
      </div>
    </div>
  );
};

export default DashboardContent;
