import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Trophy, Target, AlertTriangle, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/logo.png";

type PlayerStat = {
  membership_id: string;
  display_name: string;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

const PlayerStats = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const isMobile = useIsMobile();

  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"scorers" | "assists" | "cards">("scorers");

  useEffect(() => {
    if (!clubId) return;
    const fetchStats = async () => {
      setLoading(true);
      // Get all match events for this club's matches
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .eq("club_id", clubId);

      if (!matches || matches.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      const matchIds = matches.map(m => m.id);
      const { data: events } = await supabase
        .from("match_events")
        .select("membership_id, event_type")
        .in("match_id", matchIds);

      // Get members for names
      const { data: members } = await supabase
        .from("club_memberships")
        .select("id, profiles!club_memberships_user_id_fkey(display_name)")
        .eq("club_id", clubId) as any;

      const memberMap: Record<string, string> = {};
      (members || []).forEach((m: any) => {
        memberMap[m.id] = m.profiles?.display_name || "Unknown";
      });

      // Aggregate
      const agg: Record<string, PlayerStat> = {};
      (events || []).forEach((ev: any) => {
        if (!ev.membership_id) return;
        if (!agg[ev.membership_id]) {
          agg[ev.membership_id] = {
            membership_id: ev.membership_id,
            display_name: memberMap[ev.membership_id] || "Unknown",
            goals: 0, assists: 0, yellow_cards: 0, red_cards: 0,
          };
        }
        const s = agg[ev.membership_id];
        if (ev.event_type === "goal") s.goals++;
        else if (ev.event_type === "assist") s.assists++;
        else if (ev.event_type === "yellow_card") s.yellow_cards++;
        else if (ev.event_type === "red_card") s.red_cards++;
      });

      setStats(Object.values(agg));
      setLoading(false);
    };
    fetchStats();
  }, [clubId]);

  const sorted = [...stats].sort((a, b) => {
    if (tab === "scorers") return b.goals - a.goals;
    if (tab === "assists") return b.assists - a.assists;
    return (b.yellow_cards + b.red_cards) - (a.yellow_cards + a.red_cards);
  }).filter(s => {
    if (tab === "scorers") return s.goals > 0;
    if (tab === "assists") return s.assists > 0;
    return s.yellow_cards > 0 || s.red_cards > 0;
  });

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Please sign in.</p></div>;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <img src={logo} alt="" className="w-7 h-7" />
          <h1 className="font-display font-bold text-lg text-foreground">Player Statistics</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 flex gap-1">
          {([
            { id: "scorers" as const, label: "Top Scorers", icon: Trophy },
            { id: "assists" as const, label: "Most Assists", icon: Award },
            { id: "cards" as const, label: "Cards", icon: AlertTriangle },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">No club found.</div>
        ) : sorted.length === 0 ? (
          <div className="max-w-2xl mx-auto rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">
            No {tab === "scorers" ? "goals" : tab === "assists" ? "assists" : "cards"} recorded yet.
          </div>
        ) : (
          <div className="max-w-2xl mx-auto rounded-xl bg-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-center px-3 py-3 w-12">#</th>
                  <th className="text-left px-4 py-3">Player</th>
                  {tab === "scorers" && <th className="text-center px-4 py-3">⚽ Goals</th>}
                  {tab === "assists" && <th className="text-center px-4 py-3">🅰️ Assists</th>}
                  {tab === "cards" && (
                    <>
                      <th className="text-center px-3 py-3">🟨</th>
                      <th className="text-center px-3 py-3">🟥</th>
                      <th className="text-center px-3 py-3">Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => (
                  <motion.tr key={s.membership_id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0">
                    <td className="text-center px-3 py-3">
                      {i < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          i === 0 ? "bg-primary/20 text-primary" : i === 1 ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
                        }`}>{i + 1}</span>
                      ) : (
                        <span className="text-muted-foreground">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{s.display_name}</td>
                    {tab === "scorers" && <td className="text-center px-4 py-3 font-bold text-primary">{s.goals}</td>}
                    {tab === "assists" && <td className="text-center px-4 py-3 font-bold text-primary">{s.assists}</td>}
                    {tab === "cards" && (
                      <>
                        <td className="text-center px-3 py-3 text-muted-foreground">{s.yellow_cards}</td>
                        <td className="text-center px-3 py-3 text-muted-foreground">{s.red_cards}</td>
                        <td className="text-center px-3 py-3 font-bold text-primary">{s.yellow_cards + s.red_cards}</td>
                      </>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerStats;
