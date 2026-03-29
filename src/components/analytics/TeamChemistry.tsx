import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useClubId } from "@/hooks/use-club-id";
import type { MembershipWithProfile } from "@/types/supabase";

type Combo = { players: string[]; wins: number; total: number; rate: number };
interface TeamChemistryPairRow {
  membership_id_1: string;
  membership_id_2: string;
  wins: number;
  total: number;
  win_rate: number;
}

const TeamChemistry = () => {
  const { clubId } = useClubId();
  const [combos, setCombos] = useState<Combo[]>([]);

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      const { data: membersRaw } = await supabase
        .from("club_memberships")
        .select(
          "id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_profile_fk(display_name)",
        )
        .eq("club_id", clubId)
        .eq("status", "active")
        .limit(500);

      const members = (membersRaw ?? []) as unknown as MembershipWithProfile[];

      const nameMap: Record<string, string> = {};
      members.forEach((m) => {
        nameMap[m.id] = m.profiles?.display_name || "Player";
      });

      const { data: pairRows, error } = await supabaseDynamic.rpc("get_team_chemistry_pairs", {
        _club_id: clubId,
        _max_matches: 300,
        _min_together: 2,
        _limit: 5,
      });
      if (error) {
        setCombos([]);
        return;
      }
      const topCombos = ((pairRows as unknown as TeamChemistryPairRow[]) ?? []).map((row) => ({
        players: [
          nameMap[row.membership_id_1] || "Player",
          nameMap[row.membership_id_2] || "Player",
        ],
        wins: row.wins ?? 0,
        total: row.total ?? 0,
        rate: row.win_rate ?? 0,
      }));

      setCombos(topCombos);
    };
    fetch();
  }, [clubId]);

  if (combos.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-5">
      <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" /> Team Chemistry
      </h3>
      <div className="space-y-2">
        {combos.map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20">
            <div className="flex-1">
              <div className="text-xs font-medium text-foreground">{c.players[0]} + {c.players[1]}</div>
              <div className="text-[10px] text-muted-foreground">{c.wins}W / {c.total} together</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${c.rate}%` }} />
              </div>
              <span className="text-xs font-bold text-primary">{c.rate}%</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default TeamChemistry;
