import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Trophy, Loader2, X, MapPin, Clock,
  Users, Target, Award, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import logo from "@/assets/logo.png";

type Team = { id: string; name: string };
type Competition = { id: string; name: string; season: string | null; competition_type: string; team_id: string | null };
type Match = {
  id: string; opponent: string; is_home: boolean; match_date: string;
  location: string | null; status: string; home_score: number | null; away_score: number | null;
  competition_id: string | null; team_id: string | null; notes: string | null;
  competitions?: { name: string } | null; teams?: { name: string } | null;
};
type MatchEvent = { id: string; match_id: string; membership_id: string | null; event_type: string; minute: number | null; notes: string | null };
type Membership = { id: string; user_id: string; profiles?: { display_name: string | null } };
type LineupPlayer = { id: string; match_id: string; membership_id: string; is_starter: boolean; jersey_number: number | null; position: string | null };

const statusColors: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-accent/10 text-accent",
};

const eventTypeLabels: Record<string, string> = {
  goal: "⚽ Goal", assist: "🅰️ Assist", yellow_card: "🟨 Yellow", red_card: "🟥 Red",
  substitution_in: "🔄 Sub In", substitution_out: "🔄 Sub Out",
};

const Matches = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { toast } = useToast();

  const [tab, setTab] = useState<"matches" | "competitions" | "standings">("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [lineup, setLineup] = useState<LineupPlayer[]>([]);
  const [lineupTab, setLineupTab] = useState<"events" | "lineup">("events");
  const [addLineupMemberId, setAddLineupMemberId] = useState("");
  const [addLineupStarter, setAddLineupStarter] = useState(true);
  const [addLineupPosition, setAddLineupPosition] = useState("");
  const [addLineupJersey, setAddLineupJersey] = useState("");

  // Match form
  const [opponent, setOpponent] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [matchDate, setMatchDate] = useState("");
  const [matchLocation, setMatchLocation] = useState("");
  const [matchTeamId, setMatchTeamId] = useState("");
  const [matchCompId, setMatchCompId] = useState("");

  // Competition form
  const [compName, setCompName] = useState("");
  const [compSeason, setCompSeason] = useState("2025/2026");
  const [compType, setCompType] = useState("league");
  const [compTeamId, setCompTeamId] = useState("");

  // Result form
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  // Match event form
  const [evType, setEvType] = useState("goal");
  const [evMemberId, setEvMemberId] = useState("");
  const [evMinute, setEvMinute] = useState("");

  useEffect(() => {
    if (!clubId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [matchRes, compRes, teamRes] = await Promise.all([
        supabase.from("matches").select("*, competitions(name), teams(name)").eq("club_id", clubId).order("match_date", { ascending: false }),
        supabase.from("competitions").select("*").eq("club_id", clubId).order("created_at", { ascending: false }),
        supabase.from("teams").select("id, name").eq("club_id", clubId),
      ]);
      setMatches((matchRes.data as unknown as Match[]) || []);
      setCompetitions((compRes.data as Competition[]) || []);
      setTeams((teamRes.data as Team[]) || []);
      setLoading(false);
    };
    fetchAll();
  }, [clubId]);

  const openMatchDetail = async (match: Match) => {
    setSelectedMatch(match);
    setHomeScore(match.home_score?.toString() || "");
    setAwayScore(match.away_score?.toString() || "");
    setLoadingDetail(true);
    setLineupTab("events");
    const [evRes, memRes, lineupRes] = await Promise.all([
      supabase.from("match_events").select("*").eq("match_id", match.id).order("minute"),
      supabase.from("club_memberships").select("id, user_id, profiles!club_memberships_user_id_fkey(display_name)").eq("club_id", clubId!) as any,
      supabase.from("match_lineups").select("*").eq("match_id", match.id),
    ]);
    setMatchEvents((evRes.data as MatchEvent[]) || []);
    setMembers((memRes.data || []) as Membership[]);
    setLineup((lineupRes.data as LineupPlayer[]) || []);
    setLoadingDetail(false);
  };

  const handleCreateMatch = async () => {
    if (!opponent.trim() || !matchDate || !clubId) return;
    const { data, error } = await supabase.from("matches").insert({
      club_id: clubId, opponent: opponent.trim(), is_home: isHome, match_date: matchDate,
      location: matchLocation || null, team_id: matchTeamId || null, competition_id: matchCompId || null,
    }).select("*, competitions(name), teams(name)").single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setMatches(prev => [data as unknown as Match, ...prev]);
    setShowAddMatch(false);
    setOpponent(""); setMatchDate(""); setMatchLocation(""); setMatchTeamId(""); setMatchCompId("");
    toast({ title: "Match scheduled" });
  };

  const handleCreateComp = async () => {
    if (!compName.trim() || !clubId) return;
    const { data, error } = await supabase.from("competitions").insert({
      club_id: clubId, name: compName.trim(), season: compSeason || null, competition_type: compType, team_id: compTeamId || null,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCompetitions(prev => [data as Competition, ...prev]);
    setShowAddComp(false);
    setCompName(""); setCompTeamId("");
    toast({ title: "Competition created" });
  };

  const handleUpdateResult = async () => {
    if (!selectedMatch) return;
    const { error } = await supabase.from("matches").update({
      home_score: homeScore ? parseInt(homeScore) : null,
      away_score: awayScore ? parseInt(awayScore) : null,
      status: "completed",
    }).eq("id", selectedMatch.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setMatches(prev => prev.map(m => m.id === selectedMatch.id ? { ...m, home_score: parseInt(homeScore) || null, away_score: parseInt(awayScore) || null, status: "completed" } : m));
    setSelectedMatch(prev => prev ? { ...prev, home_score: parseInt(homeScore) || null, away_score: parseInt(awayScore) || null, status: "completed" } : null);
    toast({ title: "Result saved" });
  };

  const handleAddMatchEvent = async () => {
    if (!selectedMatch || !evType) return;
    const { data, error } = await supabase.from("match_events").insert({
      match_id: selectedMatch.id, event_type: evType,
      membership_id: evMemberId || null, minute: evMinute ? parseInt(evMinute) : null,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setMatchEvents(prev => [...prev, data as MatchEvent]);
    setEvMemberId(""); setEvMinute("");
    toast({ title: "Event recorded" });
  };

  const handleAddToLineup = async () => {
    if (!selectedMatch || !addLineupMemberId) return;
    if (lineup.some(l => l.membership_id === addLineupMemberId)) {
      toast({ title: "Already in lineup", variant: "destructive" }); return;
    }
    const { data, error } = await supabase.from("match_lineups").insert({
      match_id: selectedMatch.id, membership_id: addLineupMemberId,
      is_starter: addLineupStarter, position: addLineupPosition || null,
      jersey_number: addLineupJersey ? parseInt(addLineupJersey) : null,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setLineup(prev => [...prev, data as LineupPlayer]);
    setAddLineupMemberId(""); setAddLineupPosition(""); setAddLineupJersey("");
    toast({ title: addLineupStarter ? "Starter added" : "Substitute added" });
  };

  const handleRemoveFromLineup = async (id: string) => {
    await supabase.from("match_lineups").delete().eq("id", id);
    setLineup(prev => prev.filter(l => l.id !== id));
  };

  const handleToggleStarter = async (player: LineupPlayer) => {
    await supabase.from("match_lineups").update({ is_starter: !player.is_starter }).eq("id", player.id);
    setLineup(prev => prev.map(l => l.id === player.id ? { ...l, is_starter: !l.is_starter } : l));
  };

  // Standings calculation
  const getStandings = () => {
    const completed = matches.filter(m => m.status === "completed");
    const stats: Record<string, { team: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }> = {};
    // Group by team
    completed.forEach(m => {
      const teamKey = m.team_id || "club";
      const teamName = m.teams?.name || "Club";
      if (!stats[teamKey]) stats[teamKey] = { team: teamName, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      const s = stats[teamKey];
      s.p++;
      const gf = m.is_home ? (m.home_score || 0) : (m.away_score || 0);
      const ga = m.is_home ? (m.away_score || 0) : (m.home_score || 0);
      s.gf += gf; s.ga += ga;
      if (gf > ga) { s.w++; s.pts += 3; }
      else if (gf === ga) { s.d++; s.pts += 1; }
      else { s.l++; }
    });
    return Object.values(stats).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  };

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Please sign in.</p></div>;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
            <img src={logo} alt="" className="w-7 h-7" />
            <h1 className="font-display font-bold text-lg text-foreground">Matches & Competitions</h1>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAddComp(true)}><Plus className="w-4 h-4 mr-1" /> Competition</Button>
            <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => setShowAddMatch(true)}><Plus className="w-4 h-4 mr-1" /> Match</Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 flex gap-1">
          {([
            { id: "matches" as const, label: "Matches", icon: Trophy },
            { id: "competitions" as const, label: "Competitions", icon: Award },
            { id: "standings" as const, label: "Standings", icon: Target },
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
        ) : tab === "matches" ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {matches.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No matches scheduled.</div>
            ) : matches.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-card border border-border p-5 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => openMatchDetail(m)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {m.is_home ? `Club vs ${m.opponent}` : `${m.opponent} vs Club`}
                    </span>
                    {m.teams?.name && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{m.teams.name}</span>}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[m.status]}`}>{m.status}</span>
                </div>
                {m.status === "completed" && (
                  <div className="text-2xl font-bold font-display text-foreground mb-2">
                    {m.home_score ?? "-"} : {m.away_score ?? "-"}
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(m.match_date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {m.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</span>}
                  {m.competitions?.name && <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {m.competitions.name}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        ) : tab === "competitions" ? (
          <div className="max-w-2xl mx-auto space-y-4">
            {competitions.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No competitions yet.</div>
            ) : competitions.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-card border border-border p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-foreground">{c.name}</h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{c.competition_type}</span>
                </div>
                {c.season && <p className="text-xs text-muted-foreground mt-1">Season: {c.season}</p>}
              </motion.div>
            ))}
          </div>
        ) : (
          /* Standings */
          <div className="max-w-2xl mx-auto">
            {(() => {
              const standings = getStandings();
              if (standings.length === 0) return <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No completed matches yet.</div>;
              return (
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left px-4 py-3">Team</th>
                      <th className="text-center px-2 py-3">P</th><th className="text-center px-2 py-3">W</th>
                      <th className="text-center px-2 py-3">D</th><th className="text-center px-2 py-3">L</th>
                      <th className="text-center px-2 py-3">GF</th><th className="text-center px-2 py-3">GA</th>
                      <th className="text-center px-2 py-3">GD</th><th className="text-center px-2 py-3 font-semibold text-primary">PTS</th>
                    </tr></thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium text-foreground">{s.team}</td>
                          <td className="text-center px-2 py-3 text-muted-foreground">{s.p}</td>
                          <td className="text-center px-2 py-3 text-muted-foreground">{s.w}</td>
                          <td className="text-center px-2 py-3 text-muted-foreground">{s.d}</td>
                          <td className="text-center px-2 py-3 text-muted-foreground">{s.l}</td>
                          <td className="text-center px-2 py-3 text-muted-foreground">{s.gf}</td>
                          <td className="text-center px-2 py-3 text-muted-foreground">{s.ga}</td>
                          <td className="text-center px-2 py-3 text-muted-foreground">{s.gf - s.ga}</td>
                          <td className="text-center px-2 py-3 font-bold text-primary">{s.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Add Match Modal */}
      {showAddMatch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddMatch(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">Schedule Match</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddMatch(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Opponent *" value={opponent} onChange={e => setOpponent(e.target.value)} className="bg-background" maxLength={200} />
              <div className="flex gap-2">
                <Button size="sm" variant={isHome ? "default" : "outline"} onClick={() => setIsHome(true)} className={isHome ? "bg-gradient-gold text-primary-foreground" : ""}>Home</Button>
                <Button size="sm" variant={!isHome ? "default" : "outline"} onClick={() => setIsHome(false)} className={!isHome ? "bg-gradient-gold text-primary-foreground" : ""}>Away</Button>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Date & Time *</label>
                <Input type="datetime-local" value={matchDate} onChange={e => setMatchDate(e.target.value)} className="bg-background" />
              </div>
              <Input placeholder="Location" value={matchLocation} onChange={e => setMatchLocation(e.target.value)} className="bg-background" />
              <select value={matchTeamId} onChange={e => setMatchTeamId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="">No team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={matchCompId} onChange={e => setMatchCompId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="">No competition</option>
                {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button onClick={handleCreateMatch} disabled={!opponent.trim() || !matchDate}
                className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">Schedule Match</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Competition Modal */}
      {showAddComp && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddComp(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">New Competition</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddComp(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Competition name *" value={compName} onChange={e => setCompName(e.target.value)} className="bg-background" maxLength={200} />
              <Input placeholder="Season (e.g. 2025/2026)" value={compSeason} onChange={e => setCompSeason(e.target.value)} className="bg-background" />
              <select value={compType} onChange={e => setCompType(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="league">League</option>
                <option value="cup">Cup</option>
                <option value="friendly">Friendly</option>
              </select>
              <select value={compTeamId} onChange={e => setCompTeamId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                <option value="">All teams</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Button onClick={handleCreateComp} disabled={!compName.trim()}
                className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">Create Competition</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedMatch(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">
                {selectedMatch.is_home ? `Club vs ${selectedMatch.opponent}` : `${selectedMatch.opponent} vs Club`}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMatch(null)}><X className="w-4 h-4" /></Button>
            </div>

            {/* Score */}
            <div className="rounded-xl bg-background border border-border p-4 mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">RESULT</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">Home</label>
                  <Input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)} className="bg-card text-center text-lg font-bold" min="0" />
                </div>
                <span className="text-xl font-bold text-muted-foreground mt-4">:</span>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">Away</label>
                  <Input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)} className="bg-card text-center text-lg font-bold" min="0" />
                </div>
                <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90 mt-4" onClick={handleUpdateResult}>Save</Button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Sub-tabs: Events / Lineup */}
                <div className="flex gap-1 mb-4 border-b border-border">
                  <button onClick={() => setLineupTab("events")}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${lineupTab === "events" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                    Match Events
                  </button>
                  <button onClick={() => setLineupTab("lineup")}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${lineupTab === "lineup" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                    Lineup ({lineup.length})
                  </button>
                </div>

                {lineupTab === "events" ? (
                  <>
                    {matchEvents.length === 0 ? (
                      <p className="text-xs text-muted-foreground mb-3">No events recorded.</p>
                    ) : (
                      <div className="space-y-1 mb-4">
                        {matchEvents.map(ev => {
                          const player = members.find(m => m.id === ev.membership_id);
                          return (
                            <div key={ev.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border text-xs">
                              <span>{eventTypeLabels[ev.event_type] || ev.event_type}</span>
                              {ev.minute != null && <span className="text-muted-foreground">{ev.minute}'</span>}
                              <span className="text-foreground">{(player as any)?.profiles?.display_name || ""}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="rounded-xl bg-background border border-border p-3 space-y-2">
                      <h5 className="text-xs font-semibold text-muted-foreground">ADD EVENT</h5>
                      <div className="flex gap-2 flex-wrap">
                        <select value={evType} onChange={e => setEvType(e.target.value)}
                          className="flex-1 min-w-[100px] h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground">
                          <option value="goal">⚽ Goal</option>
                          <option value="assist">🅰️ Assist</option>
                          <option value="yellow_card">🟨 Yellow</option>
                          <option value="red_card">🟥 Red</option>
                          <option value="substitution_in">🔄 Sub In</option>
                          <option value="substitution_out">🔄 Sub Out</option>
                        </select>
                        <select value={evMemberId} onChange={e => setEvMemberId(e.target.value)}
                          className="flex-1 min-w-[100px] h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground">
                          <option value="">Player</option>
                          {members.map(m => <option key={m.id} value={m.id}>{(m as any).profiles?.display_name || "Member"}</option>)}
                        </select>
                        <Input type="number" placeholder="Min" value={evMinute} onChange={e => setEvMinute(e.target.value)}
                          className="w-16 h-8 bg-card text-xs text-center" min="0" max="120" />
                        <Button size="sm" className="h-8 bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={handleAddMatchEvent}>+</Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Starters */}
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2">STARTING XI ({lineup.filter(l => l.is_starter).length})</h5>
                    {lineup.filter(l => l.is_starter).length === 0 ? (
                      <p className="text-xs text-muted-foreground mb-3">No starters assigned.</p>
                    ) : (
                      <div className="space-y-1 mb-4">
                        {lineup.filter(l => l.is_starter).map(l => {
                          const player = members.find(m => m.id === l.membership_id);
                          return (
                            <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border text-xs">
                              <div className="flex items-center gap-2">
                                {l.jersey_number != null && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px]">{l.jersey_number}</span>}
                                <span className="font-medium text-foreground">{(player as any)?.profiles?.display_name || "Player"}</span>
                                {l.position && <span className="text-muted-foreground">({l.position})</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleToggleStarter(l)} className="text-[10px] text-muted-foreground hover:text-foreground px-1">→ Sub</button>
                                <button onClick={() => handleRemoveFromLineup(l.id)} className="text-destructive hover:text-destructive/80 px-1"><X className="w-3 h-3" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Substitutes */}
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 mt-4">SUBSTITUTES ({lineup.filter(l => !l.is_starter).length})</h5>
                    {lineup.filter(l => !l.is_starter).length === 0 ? (
                      <p className="text-xs text-muted-foreground mb-3">No substitutes assigned.</p>
                    ) : (
                      <div className="space-y-1 mb-4">
                        {lineup.filter(l => !l.is_starter).map(l => {
                          const player = members.find(m => m.id === l.membership_id);
                          return (
                            <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border text-xs">
                              <div className="flex items-center gap-2">
                                {l.jersey_number != null && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground font-bold text-[10px]">{l.jersey_number}</span>}
                                <span className="font-medium text-foreground">{(player as any)?.profiles?.display_name || "Player"}</span>
                                {l.position && <span className="text-muted-foreground">({l.position})</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleToggleStarter(l)} className="text-[10px] text-muted-foreground hover:text-foreground px-1">→ Start</button>
                                <button onClick={() => handleRemoveFromLineup(l.id)} className="text-destructive hover:text-destructive/80 px-1"><X className="w-3 h-3" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add to lineup */}
                    <div className="rounded-xl bg-background border border-border p-3 space-y-2 mt-4">
                      <h5 className="text-xs font-semibold text-muted-foreground">ADD TO LINEUP</h5>
                      <div className="flex gap-2 flex-wrap">
                        <select value={addLineupMemberId} onChange={e => setAddLineupMemberId(e.target.value)}
                          className="flex-1 min-w-[120px] h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground">
                          <option value="">Select player</option>
                          {members.filter(m => !lineup.some(l => l.membership_id === m.id)).map(m => (
                            <option key={m.id} value={m.id}>{(m as any).profiles?.display_name || "Member"}</option>
                          ))}
                        </select>
                        <Input placeholder="Pos" value={addLineupPosition} onChange={e => setAddLineupPosition(e.target.value)}
                          className="w-16 h-8 bg-card text-xs text-center" />
                        <Input type="number" placeholder="#" value={addLineupJersey} onChange={e => setAddLineupJersey(e.target.value)}
                          className="w-14 h-8 bg-card text-xs text-center" min="1" max="99" />
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAddLineupStarter(true)}
                            className={`h-8 px-2 rounded-md text-[10px] font-medium border ${addLineupStarter ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}>
                            Starter
                          </button>
                          <button onClick={() => setAddLineupStarter(false)}
                            className={`h-8 px-2 rounded-md text-[10px] font-medium border ${!addLineupStarter ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}>
                            Sub
                          </button>
                        </div>
                        <Button size="sm" className="h-8 bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={handleAddToLineup} disabled={!addLineupMemberId}>+</Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
      {/* Mobile Nav */}
      <MobileBottomNav />
    </div>
  );
};

export default Matches;
