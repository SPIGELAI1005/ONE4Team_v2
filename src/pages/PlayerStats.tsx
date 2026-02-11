import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Trophy, Target, AlertTriangle, Award, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import logo from "@/assets/logo.png";
import type { MembershipWithProfile } from "@/types/supabase";

type PlayerStat = {
  membership_id: string;
  display_name: string;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

type Competition = { id: string; name: string; season: string | null };
type Team = { id: string; name: string };

const PlayerStats = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const isMobile = useIsMobile();

  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"scorers" | "assists" | "cards">("scorers");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("all");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  // Fetch competitions and teams for filter
  useEffect(() => {
    if (!clubId) return;
    const fetchFilters = async () => {
      const [compRes, teamRes] = await Promise.all([
        supabase.from("competitions").select("id, name, season").eq("club_id", clubId).order("created_at", { ascending: false }),
        supabase.from("teams").select("id, name").eq("club_id", clubId).order("name"),
      ]);
      const comps = (compRes.data as Competition[]) || [];
      setCompetitions(comps);
      setTeams((teamRes.data as Team[]) || []);
      const uniqueSeasons = [...new Set(comps.map(c => c.season).filter(Boolean))] as string[];
      setSeasons(uniqueSeasons);
    };
    fetchFilters();
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    const fetchStats = async () => {
      setLoading(true);

      // Build match query with filters
      let matchQuery = supabase.from("matches").select("id, competition_id").eq("club_id", clubId);

      // Team filter
      if (selectedTeamId !== "all") {
        matchQuery = matchQuery.eq("team_id", selectedTeamId);
      }

      if (selectedCompId !== "all") {
        matchQuery = matchQuery.eq("competition_id", selectedCompId);
      } else if (selectedSeason !== "all") {
        // Filter by season: get competition IDs for this season
        const seasonCompIds = competitions
          .filter(c => c.season === selectedSeason)
          .map(c => c.id);
        if (seasonCompIds.length > 0) {
          matchQuery = matchQuery.in("competition_id", seasonCompIds);
        } else {
          setStats([]);
          setLoading(false);
          return;
        }
      }

      const { data: matches } = await matchQuery;

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

      const { data: membersRaw } = await supabase
        .from("club_memberships")
        .select(
          "id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_user_id_fkey(display_name)",
        )
        .eq("club_id", clubId);

      const members = (membersRaw ?? []) as unknown as MembershipWithProfile[];
      const memberMap: Record<string, string> = {};
      members.forEach((m) => {
        memberMap[m.id] = m.profiles?.display_name || "Unknown";
      });

      const agg: Record<string, PlayerStat> = {};
      const eventsTyped = (events ?? []) as Array<{ membership_id: string | null; event_type: string }>;
      eventsTyped.forEach((ev) => {
        if (!ev.membership_id) return;
        if (!agg[ev.membership_id]) {
          agg[ev.membership_id] = {
            membership_id: ev.membership_id,
            display_name: memberMap[ev.membership_id] || "Unknown",
            goals: 0,
            assists: 0,
            yellow_cards: 0,
            red_cards: 0,
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
  }, [clubId, selectedCompId, selectedSeason, selectedTeamId, competitions]);

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

      {/* Filters */}
      {(seasons.length > 0 || competitions.length > 0 || teams.length > 0) && (
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
            {teams.length > 0 && (
              <select
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
                className="w-full sm:w-auto h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="all">All Teams</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            {seasons.length > 0 && (
              <select
                value={selectedSeason}
                onChange={e => { setSelectedSeason(e.target.value); setSelectedCompId("all"); }}
                className="w-full sm:w-auto h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="all">All Seasons</option>
                {seasons.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select
              value={selectedCompId}
              onChange={e => { setSelectedCompId(e.target.value); if (e.target.value !== "all") setSelectedSeason("all"); }}
              className="w-full sm:w-auto h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground"
            >
              <option value="all">All Competitions</option>
              {competitions
                .filter(c => selectedSeason === "all" || c.season === selectedSeason)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

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
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate(`/player/${s.membership_id}`)}>
                    <td className="text-center px-3 py-3">
                      {i < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          i === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
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
      <MobileBottomNav />
    </div>
  );
};

export default PlayerStats;
