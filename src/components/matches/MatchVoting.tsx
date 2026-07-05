import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
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
  const [submitting, setSubmitting] = useState(false);

  const refreshVotes = async (membershipId: string | null) => {
    const { data: votes } = await supabase
      .from("match_votes")
      .select("voter_membership_id, voted_for_membership_id")
      .eq("match_id", matchId);

    if (membershipId) {
      const myV = (votes || []).find((v) => v.voter_membership_id === membershipId);
      setMyVote(myV?.voted_for_membership_id || null);
    } else {
      setMyVote(null);
    }

    const tally: Record<string, number> = {};
    (votes || []).forEach((v) => {
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
  };

  useEffect(() => {
    if (!clubId || !user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: mem } = await supabase
        .from("club_memberships")
        .select("id")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .maybeSingle();
      const membershipId = mem?.id || null;
      setMyMembershipId(membershipId);
      await refreshVotes(membershipId);
      setLoading(false);
    };
    void fetch();
  }, [clubId, user, matchId, members]);

  const handleRemoveVote = async () => {
    if (!myMembershipId || !myVote || submitting) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("match_votes")
      .delete()
      .eq("match_id", matchId)
      .eq("voter_membership_id", myMembershipId);

    setSubmitting(false);
    if (error) {
      toast({ title: "Could not remove vote", description: error.message, variant: "destructive" });
      return;
    }

    setMyVote(null);
    await refreshVotes(myMembershipId);
    toast({ title: "Vote removed" });
  };

  const handleVote = async (votedForId: string) => {
    if (!myMembershipId || !clubId || submitting) return;
    if (votedForId === myMembershipId) {
      toast({ title: "Can't vote for yourself", variant: "destructive" });
      return;
    }
    if (myVote === votedForId) {
      await handleRemoveVote();
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("match_votes").upsert(
      {
        match_id: matchId,
        voter_membership_id: myMembershipId,
        voted_for_membership_id: votedForId,
        club_id: clubId,
      },
      { onConflict: "match_id,voter_membership_id" },
    );
    setSubmitting(false);

    if (error) {
      toast({ title: "Vote failed", description: error.message, variant: "destructive" });
      return;
    }

    setMyVote(votedForId);
    await refreshVotes(myMembershipId);
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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            {myVote ? "Change your vote or remove it:" : "Cast your vote:"}
          </p>
          {myVote ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => void handleRemoveVote()}
              className="h-7 rounded-lg border-destructive/30 px-2.5 text-[10px] text-muted-foreground hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="mr-1 h-3 w-3" />
              Remove vote
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {members.filter(m => m.id !== myMembershipId).slice(0, 20).map(m => (
            <button
              key={m.id}
              type="button"
              disabled={submitting}
              onClick={() => void handleVote(m.id)}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                myVote === m.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {m.profiles?.display_name || "Player"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchVoting;
