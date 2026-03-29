import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useClubId } from "@/hooks/use-club-id";
import { useToast } from "@/hooks/use-toast";

interface AwardResult {
  type: string;
  name: string;
  icon: string;
  winner: string;
  membershipId: string;
  value: string;
}

interface SeasonAwardWinnersRow {
  completed_matches_count: number | null;
  golden_boot_membership_id: string | null;
  golden_boot_display_name: string | null;
  golden_boot_goals: number | null;
  playmaker_membership_id: string | null;
  playmaker_display_name: string | null;
  playmaker_assists: number | null;
  reliable_membership_id: string | null;
  reliable_display_name: string | null;
  reliable_appearances: number | null;
}

const SeasonAwards = () => {
  const { clubId } = useClubId();
  const { toast } = useToast();
  const [awards, setAwards] = useState<AwardResult[]>([]);
  const [generated, setGenerated] = useState(false);

  const generateAwards = async () => {
    if (!clubId) return;

    const { data, error } = await supabaseDynamic.rpc("get_season_award_winners", {
      _club_id: clubId,
    });

    if (error) {
      toast({ title: "Could not load awards", description: error.message, variant: "destructive" });
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as SeasonAwardWinnersRow | undefined;
    const completed = row?.completed_matches_count ?? 0;
    if (completed === 0) {
      toast({ title: "No completed matches to generate awards from" });
      return;
    }

    const results: AwardResult[] = [];

    if (row?.golden_boot_membership_id && (row.golden_boot_goals ?? 0) > 0) {
      results.push({
        type: "golden_boot",
        name: "Golden Boot",
        icon: "⚽",
        winner: row.golden_boot_display_name || "Player",
        membershipId: row.golden_boot_membership_id,
        value: `${row.golden_boot_goals} goals`,
      });
    }

    if (row?.playmaker_membership_id && (row.playmaker_assists ?? 0) > 0) {
      results.push({
        type: "playmaker",
        name: "Master Playmaker",
        icon: "🅰️",
        winner: row.playmaker_display_name || "Player",
        membershipId: row.playmaker_membership_id,
        value: `${row.playmaker_assists} assists`,
      });
    }

    if (row?.reliable_membership_id) {
      results.push({
        type: "mr_reliable",
        name: "Mr. Reliable",
        icon: "💪",
        winner: row.reliable_display_name || "Player",
        membershipId: row.reliable_membership_id,
        value: `${row.reliable_appearances ?? 0} appearances`,
      });
    }

    setAwards(results);
    setGenerated(true);
  };

  if (!generated) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-card border border-primary/20 p-5 text-center">
        <Trophy className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground mb-2 text-sm">Season Awards Ceremony</h3>
        <p className="text-xs text-muted-foreground mb-4">Generate end-of-season awards based on performance data</p>
        <Button onClick={generateAwards} className="bg-gradient-gold-static text-primary-foreground hover:brightness-110" size="sm">
          <Award className="w-4 h-4 mr-1" /> Generate Awards
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-primary/20 p-5">
      <h3 className="font-display font-semibold text-foreground mb-4 text-sm flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" /> Season Awards 🏆
      </h3>
      <div className="space-y-3">
        {awards.map((a, i) => (
          <motion.div key={a.type} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-gold-subtle border border-primary/10">
            <span className="text-2xl">{a.icon}</span>
            <div className="flex-1">
              <div className="text-xs font-bold text-primary">{a.name}</div>
              <div className="text-sm font-semibold text-foreground">{a.winner}</div>
            </div>
            <span className="text-xs text-muted-foreground">{a.value}</span>
          </motion.div>
        ))}
        {awards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">Not enough data to generate awards.</p>
        )}
      </div>
    </motion.div>
  );
};

export default SeasonAwards;
