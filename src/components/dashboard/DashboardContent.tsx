import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Calendar, Trophy, TrendingUp, Clock, Bell,
  Bot, ArrowUpRight, Activity
} from "lucide-react";

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
    { label: "Notifications", value: "3", change: "", icon: Bell },
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
    <div className="flex-1 overflow-y-auto bg-background pb-20 lg:pb-0">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">{config.title}</h1>
            <p className="text-sm text-muted-foreground">{config.greeting}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm">
              {(role || "U")[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {config.kpis.map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-5 rounded-xl bg-card border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <kpi.icon className="w-4 h-4 text-primary" />
                {kpi.change && (
                  <span className="text-xs font-medium text-primary flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" />
                    {kpi.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-display font-bold text-foreground">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming events */}
          <div className="lg:col-span-2 rounded-xl bg-card border border-border p-5">
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Upcoming
            </h2>
            <div className="space-y-3">
              {upcomingEvents.map((event, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-foreground">{event.title}</div>
                    <div className="text-xs text-muted-foreground">{event.time}</div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    event.type === "match" ? "bg-accent/10 text-accent" :
                    event.type === "training" ? "bg-primary/10 text-primary" :
                    event.type === "tournament" ? "bg-gold-dark/10 text-gold" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {event.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="rounded-xl bg-card border border-primary/20 p-5 shadow-gold">
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-gradient-gold">AI Insights</span>
            </h2>
            <div className="space-y-3">
              {aiSuggestions.map((s, i) => (
                <div key={i} className="text-sm text-muted-foreground p-3 rounded-lg bg-gradient-gold-subtle border border-primary/10">
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
