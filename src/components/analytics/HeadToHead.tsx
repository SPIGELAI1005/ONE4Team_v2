import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useClubId } from "@/hooks/use-club-id";
import type { MembershipOption } from "@/types/analytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Member = MembershipOption;
const MAX_HEAD_TO_HEAD_MATCHES = 300;
interface HeadToHeadStatRow {
  membership_id: string;
  goals: number;
  assists: number;
  appearances: number;
  cards: number;
}

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
        .select(
          "id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_profile_fk(display_name)",
        )
        .eq("club_id", clubId)
        .eq("status", "active")
        .limit(500);

      const members = (data ?? []) as unknown as Array<{ id: string; profiles?: { display_name: string | null } | null }>;
      setMembers(members.map((m) => ({ id: m.id, name: m.profiles?.display_name || "Player" })));
    };
    fetch();
  }, [clubId]);

  useEffect(() => {
    if (!player1 || !player2 || !clubId) { setCompData([]); return; }
    const fetch = async () => {
      const { data, error } = await supabaseDynamic.rpc("get_head_to_head_stats", {
        _club_id: clubId,
        _membership_ids: [player1, player2],
        _max_matches: MAX_HEAD_TO_HEAD_MATCHES,
      });
      if (error) { setCompData([]); return; }

      const rows = ((data as unknown as HeadToHeadStatRow[]) ?? []);
      const byMembershipId = new Map(rows.map((row) => [row.membership_id, row]));
      const s1 = byMembershipId.get(player1) ?? { membership_id: player1, goals: 0, assists: 0, appearances: 0, cards: 0 };
      const s2 = byMembershipId.get(player2) ?? { membership_id: player2, goals: 0, assists: 0, appearances: 0, cards: 0 };

      const normalize = (v: number, max: number) => max > 0 ? Math.round((v / max) * 100) : 0;
      const maxGoals = Math.max(s1.goals, s2.goals, 1);
      const maxAssists = Math.max(s1.assists, s2.assists, 1);
      const maxMatches = Math.max(s1.appearances, s2.appearances, 1);

      setCompData([
        { stat: "Goals", p1: normalize(s1.goals, maxGoals), p2: normalize(s2.goals, maxGoals) },
        { stat: "Assists", p1: normalize(s1.assists, maxAssists), p2: normalize(s2.assists, maxAssists) },
        { stat: "Appearances", p1: normalize(s1.appearances, maxMatches), p2: normalize(s2.appearances, maxMatches) },
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
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={player1 || "__none"} onValueChange={(value) => setPlayer1(value === "__none" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border bg-background px-2 text-xs">
            <SelectValue placeholder="Select Player 1" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Select Player 1</SelectItem>
            {members.filter(m => m.id !== player2).map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center text-center sm:text-left">vs</span>
        <Select value={player2 || "__none"} onValueChange={(value) => setPlayer2(value === "__none" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border bg-background px-2 text-xs">
            <SelectValue placeholder="Select Player 2" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Select Player 2</SelectItem>
            {members.filter(m => m.id !== player1).map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
