import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClubId } from "@/hooks/use-club-id";
import { useToast } from "@/hooks/use-toast";
import type { MembershipWithProfile } from "@/types/supabase";

type VoteResult = { membership_id: string; name: string; votes: number };

interface MatchVotingProps {
  matchId: string;
  matchStatus: string;
  members: MembershipWithProfile[];
}

const MatchVoting = ({ matchId, matchStatus, members }: MatchVotingProps) => {
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { toast } = useToast();
  const [myVote, setMyVote] = useState<string | null>(null);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [myMembershipId, setMyMembershipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId || !user) return;
    const fetch = async () => {
      // Get my membership
      const { data: mem } = await supabase
        .from("club_memberships").select("id").eq("club_id", clubId).eq("user_id", user.id).maybeSingle();
      setMyMembershipId(mem?.id || null);

      // Get votes
      const { data: votes } = await supabase
        .from("match_votes").select("voter_membership_id, voted_for_membership_id").eq("match_id", matchId);

      if (votes && mem) {
        const myV = votes.find(v => v.voter_membership_id === mem.id);
        setMyVote(myV?.voted_for_membership_id || null);
      }

      // Tally
      const tally: Record<string, number> = {};
      (votes || []).forEach(v => {
        tally[v.voted_for_membership_id] = (tally[v.voted_for_membership_id] || 0) + 1;
      });

      const nameMap: Record<string, string> = {};
      members.forEach((m) => {
        nameMap[m.id] = m.profiles?.display_name || "Player";
      });

      const sorted = Object.entries(tally)
        .map(([mid, count]) => ({ membership_id: mid, name: nameMap[mid] || "Player", votes: count }))
        .sort((a, b) => b.votes - a.votes);
      setResults(sorted);
      setLoading(false);
    };
    fetch();
  }, [clubId, user, matchId, members]);

  const handleVote = async (votedForId: string) => {
    if (!myMembershipId || !clubId || votedForId === myMembershipId) {
      toast({ title: "Can't vote for yourself", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("match_votes").upsert({
      match_id: matchId,
      voter_membership_id: myMembershipId,
      voted_for_membership_id: votedForId,
      club_id: clubId,
    }, { onConflict: "match_id,voter_membership_id" });

    if (error) { toast({ title: "Vote failed", description: error.message, variant: "destructive" }); return; }
    setMyVote(votedForId);

    // Update results locally
    setResults(prev => {
      const updated = [...prev];
      const oldVote = prev.find(r => r.membership_id === myVote);
      if (oldVote) oldVote.votes = Math.max(0, oldVote.votes - 1);
      const newVote = updated.find(r => r.membership_id === votedForId);
      if (newVote) { newVote.votes++; }
      else {
        const name = members.find(m => m.id === votedForId);
        updated.push({
          membership_id: votedForId,
          name: name?.profiles?.display_name || "Player",
          votes: 1,
        });
      }
      return updated.filter(r => r.votes > 0).sort((a, b) => b.votes - a.votes);
    });
    toast({ title: "Vote recorded! ⭐" });
  };

  if (matchStatus !== "completed") return null;
  if (loading) return null;

  const podiumIcons = ["🥇", "🥈", "🥉"];

  return (
    <div className="rounded-xl bg-background border border-border p-4 mt-4">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Star className="w-3.5 h-3.5 text-primary" /> PLAYER OF THE MATCH
      </h4>

      {/* Results podium */}
      {results.length > 0 && (
        <div className="space-y-2 mb-4">
          {results.slice(0, 5).map((r, i) => (
            <motion.div key={r.membership_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                i === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted/30"
              }`}>
              <span className="text-lg">{podiumIcons[i] || `#${i + 1}`}</span>
              <span className="flex-1 text-sm font-medium text-foreground">{r.name}</span>
              <span className="text-sm font-bold text-primary">{r.votes} vote{r.votes !== 1 ? "s" : ""}</span>
              {myVote === r.membership_id && <Check className="w-3.5 h-3.5 text-primary" />}
            </motion.div>
          ))}
        </div>
      )}

      {/* Vote buttons */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground mb-2">
          {myVote ? "Change your vote:" : "Cast your vote:"}
        </p>
        <div className="flex flex-wrap gap-1">
          {members.filter(m => m.id !== myMembershipId).slice(0, 20).map(m => (
            <button key={m.id} onClick={() => handleVote(m.id)}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                myVote === m.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}>
              {m.profiles?.display_name || "Player"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchVoting;
