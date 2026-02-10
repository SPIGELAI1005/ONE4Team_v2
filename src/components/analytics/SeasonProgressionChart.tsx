import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";

type DataPoint = { match: number; points: number; label: string };

const SeasonProgressionChart = () => {
  const { clubId } = useClubId();
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("match_date, home_score, away_score, is_home, status, opponent")
        .eq("club_id", clubId)
        .eq("status", "completed")
        .order("match_date", { ascending: true });

      if (!matches || matches.length === 0) return;

      let cumulative = 0;
      const points: DataPoint[] = matches.map((m, i) => {
        const gf = m.is_home ? (m.home_score || 0) : (m.away_score || 0);
        const ga = m.is_home ? (m.away_score || 0) : (m.home_score || 0);
        if (gf > ga) cumulative += 3;
        else if (gf === ga) cumulative += 1;
        return { match: i + 1, points: cumulative, label: `vs ${m.opponent}` };
      });
      setData(points);
    };
    fetch();
  }, [clubId]);

  if (data.length < 2) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-5">
      <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" /> Season Progression
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="match" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => `Match ${v}`}
            formatter={(value: number, name: string) => [value, "Points"]}
          />
          <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default SeasonProgressionChart;
