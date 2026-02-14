import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";
import type { MembershipWithProfile } from "@/types/supabase";

type MatchResult = { month: string; wins: number; draws: number; losses: number };

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))"];

const AnalyticsWidgets = () => {
  const { clubId } = useClubId();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [topScorers, setTopScorers] = useState<{ name: string; goals: number }[]>([]);
  const [record, setRecord] = useState({ w: 0, d: 0, l: 0 });

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, match_date, home_score, away_score, is_home, status")
        .eq("club_id", clubId)
        .eq("status", "completed");

      if (!matches) return;

      // Monthly results
      const monthMap: Record<string, { wins: number; draws: number; losses: number }> = {};
      let w = 0, d = 0, l = 0;
      matches.forEach(m => {
        const month = new Date(m.match_date).toLocaleString("default", { month: "short" });
        if (!monthMap[month]) monthMap[month] = { wins: 0, draws: 0, losses: 0 };
        const gf = m.is_home ? (m.home_score || 0) : (m.away_score || 0);
        const ga = m.is_home ? (m.away_score || 0) : (m.home_score || 0);
        if (gf > ga) { monthMap[month].wins++; w++; }
        else if (gf === ga) { monthMap[month].draws++; d++; }
        else { monthMap[month].losses++; l++; }
      });
      setRecord({ w, d, l });
      setResults(Object.entries(monthMap).map(([month, v]) => ({ month, ...v })));

      // Top scorers
      const matchIds = matches.map(m => m.id);
      if (matchIds.length > 0) {
        const { data: events } = await supabase
          .from("match_events")
          .select("membership_id")
          .in("match_id", matchIds)
          .eq("event_type", "goal");

        if (events && events.length > 0) {
          const goalMap: Record<string, number> = {};
          events.forEach(e => { if (e.membership_id) goalMap[e.membership_id] = (goalMap[e.membership_id] || 0) + 1; });
          const topIds = Object.entries(goalMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

          const { data: membersRaw } = await supabase
            .from("club_memberships")
            .select(
              "id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_profile_fk(display_name)",
            )
            .eq("club_id", clubId);

          const members = (membersRaw ?? []) as unknown as MembershipWithProfile[];
          const nameMap: Record<string, string> = {};
          members.forEach((m) => {
            nameMap[m.id] = m.profiles?.display_name || "Unknown";
          });
          setTopScorers(topIds.map(([id, goals]) => ({ name: nameMap[id] || "Unknown", goals })));
        }
      }
    };
    fetch();
  }, [clubId]);

  const total = record.w + record.d + record.l;
  const pieData = total > 0 ? [
    { name: "Wins", value: record.w },
    { name: "Draws", value: record.d },
    { name: "Losses", value: record.l },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Win Rate Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Wins", value: record.w, icon: Trophy, color: "text-primary" },
          { label: "Draws", value: record.d, icon: Target, color: "text-muted-foreground" },
          { label: "Losses", value: record.l, icon: TrendingUp, color: "text-destructive" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl bg-card border border-border text-center">
            <stat.icon className={`w-4 h-4 mx-auto mb-2 ${stat.color}`} />
            <div className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Results Chart */}
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl bg-card border border-border p-5">
            <h3 className="font-display font-semibold text-foreground mb-4 text-sm">Monthly Results</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={results}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="wins" stackId="a" fill={CHART_COLORS[0]} radius={[0, 0, 0, 0]} />
                <Bar dataKey="draws" stackId="a" fill={CHART_COLORS[1]} />
                <Bar dataKey="losses" stackId="a" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Win Rate Pie */}
        {pieData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-xl bg-card border border-border p-5">
            <h3 className="font-display font-semibold text-foreground mb-4 text-sm">Win Rate</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-bold text-foreground">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Top Scorers */}
      {topScorers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl bg-card border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Top Scorers
          </h3>
          <div className="space-y-2">
            {topScorers.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>{i + 1}</span>
                <span className="flex-1 text-sm text-foreground">{s.name}</span>
                <span className="text-sm font-bold text-primary">{s.goals} ⚽</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalyticsWidgets;
