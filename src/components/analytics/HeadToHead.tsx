import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";

type Member = { id: string; name: string };

const HeadToHead = () => {
  const { clubId } = useClubId();
  const [members, setMembers] = useState<Member[]>([]);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [compData, setCompData] = useState<{ stat: string; p1: number; p2: number }[]>([]);

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("club_memberships")
        .select("id, profiles!club_memberships_user_id_fkey(display_name)")
        .eq("club_id", clubId) as any;
      setMembers((data || []).map((m: any) => ({ id: m.id, name: m.profiles?.display_name || "Player" })));
    };
    fetch();
  }, [clubId]);

  useEffect(() => {
    if (!player1 || !player2 || !clubId) { setCompData([]); return; }
    const fetch = async () => {
      const { data: matches } = await supabase
        .from("matches").select("id").eq("club_id", clubId).eq("status", "completed");
      const matchIds = (matches || []).map(m => m.id);
      if (matchIds.length === 0) return;

      const getStats = async (mid: string) => {
        const [evRes, lineupRes] = await Promise.all([
          supabase.from("match_events").select("event_type").eq("membership_id", mid).in("match_id", matchIds),
          supabase.from("match_lineups").select("id").eq("membership_id", mid).in("match_id", matchIds),
        ]);
        const events = evRes.data || [];
        return {
          goals: events.filter(e => e.event_type === "goal").length,
          assists: events.filter(e => e.event_type === "assist").length,
          matches: lineupRes.data?.length || 0,
          cards: events.filter(e => e.event_type === "yellow_card" || e.event_type === "red_card").length,
        };
      };

      const [s1, s2] = await Promise.all([getStats(player1), getStats(player2)]);
      const normalize = (v: number, max: number) => max > 0 ? Math.round((v / max) * 100) : 0;
      const maxGoals = Math.max(s1.goals, s2.goals, 1);
      const maxAssists = Math.max(s1.assists, s2.assists, 1);
      const maxMatches = Math.max(s1.matches, s2.matches, 1);

      setCompData([
        { stat: "Goals", p1: normalize(s1.goals, maxGoals), p2: normalize(s2.goals, maxGoals) },
        { stat: "Assists", p1: normalize(s1.assists, maxAssists), p2: normalize(s2.assists, maxAssists) },
        { stat: "Appearances", p1: normalize(s1.matches, maxMatches), p2: normalize(s2.matches, maxMatches) },
        { stat: "Discipline", p1: Math.max(0, 100 - s1.cards * 20), p2: Math.max(0, 100 - s2.cards * 20) },
      ]);
    };
    fetch();
  }, [player1, player2, clubId]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-5">
      <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" /> Head-to-Head Comparison
      </h3>
      <div className="flex gap-2 mb-4">
        <select value={player1} onChange={e => setPlayer1(e.target.value)}
          className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
          <option value="">Select Player 1</option>
          {members.filter(m => m.id !== player2).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span className="text-xs text-muted-foreground self-center">vs</span>
        <select value={player2} onChange={e => setPlayer2(e.target.value)}
          className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
          <option value="">Select Player 2</option>
          {members.filter(m => m.id !== player1).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {compData.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={compData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Radar name={members.find(m => m.id === player1)?.name || "P1"} dataKey="p1"
              stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
            <Radar name={members.find(m => m.id === player2)?.name || "P2"} dataKey="p2"
              stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {!player1 || !player2 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Select two players to compare</p>
      ) : null}
    </motion.div>
  );
};

export default HeadToHead;
