import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useClubId } from "@/hooks/use-club-id";

interface PlayerRadarProps {
  membershipId: string;
  playerName?: string;
}

interface PlayerRadarStatsRow {
  completed_matches_count: number | null;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  starts: number | null;
  attendance_total: number | null;
  attendance_confirmed: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
}

const PlayerRadarChart = ({ membershipId, playerName }: PlayerRadarProps) => {
  const { clubId } = useClubId();
  const [data, setData] = useState<{ stat: string; value: number; max: number }[]>([]);

  useEffect(() => {
    if (!clubId || !membershipId) return;
    const fetchRadar = async () => {
      const { data: raw, error } = await supabaseDynamic.rpc("get_player_radar_stats", {
        _club_id: clubId,
        _membership_id: membershipId,
      });

      if (error) {
        setData([]);
        return;
      }

      const row = (Array.isArray(raw) ? raw[0] : raw) as PlayerRadarStatsRow | undefined;
      const completed = row?.completed_matches_count ?? 0;
      if (completed === 0 || !row) {
        setData([]);
        return;
      }

      const goals = row.goals ?? 0;
      const assists = row.assists ?? 0;
      const matchesPlayed = row.appearances ?? 0;
      const starts = row.starts ?? 0;
      const attendance = row.attendance_total ?? 0;
      const attendanceRate = attendance > 0
        ? Math.round(((row.attendance_confirmed ?? 0) / attendance) * 100)
        : 0;
      const discipline = 100 - ((row.yellow_cards ?? 0) * 10 + (row.red_cards ?? 0) * 25);

      setData([
        { stat: "Goals", value: Math.min(goals * 10, 100), max: 100 },
        { stat: "Assists", value: Math.min(assists * 10, 100), max: 100 },
        { stat: "Appearances", value: Math.min(matchesPlayed * 4, 100), max: 100 },
        { stat: "Starts", value: matchesPlayed > 0 ? Math.round((starts / matchesPlayed) * 100) : 0, max: 100 },
        { stat: "Attendance", value: attendanceRate, max: 100 },
        { stat: "Discipline", value: Math.max(0, discipline), max: 100 },
      ]);
    };
    void fetchRadar();
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
