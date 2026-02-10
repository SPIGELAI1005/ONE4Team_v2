import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";

interface PlayerRadarProps {
  membershipId: string;
  playerName?: string;
}

const PlayerRadarChart = ({ membershipId, playerName }: PlayerRadarProps) => {
  const { clubId } = useClubId();
  const [data, setData] = useState<{ stat: string; value: number; max: number }[]>([]);

  useEffect(() => {
    if (!clubId || !membershipId) return;
    const fetch = async () => {
      const { data: matches } = await supabase
        .from("matches").select("id").eq("club_id", clubId).eq("status", "completed");
      const matchIds = (matches || []).map(m => m.id);
      if (matchIds.length === 0) return;

      const [evRes, lineupRes, attendanceRes] = await Promise.all([
        supabase.from("match_events").select("event_type").eq("membership_id", membershipId).in("match_id", matchIds),
        supabase.from("match_lineups").select("id, is_starter").eq("membership_id", membershipId).in("match_id", matchIds),
        supabase.from("event_participants").select("status").eq("membership_id", membershipId),
      ]);

      const events = evRes.data || [];
      const lineups = lineupRes.data || [];
      const attendance = attendanceRes.data || [];

      const goals = events.filter(e => e.event_type === "goal").length;
      const assists = events.filter(e => e.event_type === "assist").length;
      const matchesPlayed = lineups.length;
      const starts = lineups.filter(l => l.is_starter).length;
      const attendanceRate = attendance.length > 0
        ? Math.round((attendance.filter(a => a.status === "confirmed" || a.status === "attended").length / attendance.length) * 100)
        : 0;
      const discipline = 100 - (events.filter(e => e.event_type === "yellow_card").length * 10 + events.filter(e => e.event_type === "red_card").length * 25);

      setData([
        { stat: "Goals", value: Math.min(goals * 10, 100), max: 100 },
        { stat: "Assists", value: Math.min(assists * 10, 100), max: 100 },
        { stat: "Appearances", value: Math.min(matchesPlayed * 4, 100), max: 100 },
        { stat: "Starts", value: matchesPlayed > 0 ? Math.round((starts / matchesPlayed) * 100) : 0, max: 100 },
        { stat: "Attendance", value: attendanceRate, max: 100 },
        { stat: "Discipline", value: Math.max(0, discipline), max: 100 },
      ]);
    };
    fetch();
  }, [clubId, membershipId]);

  if (data.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-5">
      <h3 className="font-display font-semibold text-foreground mb-2 text-sm flex items-center gap-2">
        <User className="w-4 h-4 text-primary" /> {playerName ? `${playerName}'s Profile` : "Player Profile"}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default PlayerRadarChart;
