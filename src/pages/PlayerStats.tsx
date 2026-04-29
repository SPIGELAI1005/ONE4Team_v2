import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Loader2, Trophy, AlertTriangle, Award, Filter, Users, Calendar, MapPin, Briefcase,
  ArrowRight, LayoutGrid,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClubId } from "@/hooks/use-club-id";
import { useActiveClub } from "@/hooks/use-active-club";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useLanguage } from "@/hooks/use-language";

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

type ReportPersona = "admin" | "trainer" | "player" | "sponsor" | "member";

interface ReportSnapshot {
  membersActive: number | null;
  teamsCount: number | null;
  upcomingMatches: number | null;
  bookingsNext7d: number | null;
  trainingsNext14d: number | null;
  unresolvedPlaceholders: number | null;
  coachTeamIds: string[];
  coachTrainings14d: number | null;
  playerTeamIds: string[];
  playerSessions14d: number | null;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  if (message.includes("Could not find the table")) return true;
  if (/\brelation\b.*\bdoes not exist\b/i.test(message)) return true;
  return false;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

const PlayerStats = () => {
  const navigate = useNavigate();
  const { clubId, loading: clubLoading } = useClubId();
  const { activeClub } = useActiveClub();
  const { isAdmin, isTrainer, role } = usePermissions();
  const { t } = useLanguage();

  const membershipId = activeClub?.membershipId ?? null;

  const persona = useMemo<ReportPersona>(() => {
    const r = (role || "").toLowerCase();
    if (r === "sponsor") return "sponsor";
    if (isAdmin) return "admin";
    if (isTrainer) return "trainer";
    if (r === "player") return "player";
    return "member";
  }, [isAdmin, isTrainer, role]);

  const scopeCopy = useMemo(() => {
    if (persona === "admin") return t.reportsPage.scopeAdmin;
    if (persona === "trainer") return t.reportsPage.scopeTrainer;
    if (persona === "player") return t.reportsPage.scopePlayer;
    if (persona === "sponsor") return t.reportsPage.scopeSponsor;
    return t.reportsPage.scopeMember;
  }, [persona, t.reportsPage]);

  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"scorers" | "assists" | "cards">("scorers");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("all");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState(false);

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
      const uniqueSeasons = [...new Set(comps.map((c) => c.season).filter(Boolean))] as string[];
      setSeasons(uniqueSeasons);
    };
    void fetchFilters();
  }, [clubId]);

  useEffect(() => {
    if (!clubId || !membershipId) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;
    setSnapshotLoading(true);
    setSnapshotError(false);

    void (async () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const in7 = new Date(now.getTime() + 7 * 86400000).toISOString();
      const in14 = new Date(now.getTime() + 14 * 86400000).toISOString();
      const nowIso = now.toISOString();

      const empty: ReportSnapshot = {
        membersActive: null,
        teamsCount: null,
        upcomingMatches: null,
        bookingsNext7d: null,
        trainingsNext14d: null,
        unresolvedPlaceholders: null,
        coachTeamIds: [],
        coachTrainings14d: null,
        playerTeamIds: [],
        playerSessions14d: null,
      };

      try {
        if (persona === "admin") {
          const [memRes, teamRes, matchRes, bookRes, trainRes, phRes] = await Promise.all([
            supabase.from("club_memberships").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "active"),
            supabase.from("teams").select("id", { count: "exact", head: true }).eq("club_id", clubId),
            supabase
              .from("matches")
              .select("id", { count: "exact", head: true })
              .eq("club_id", clubId)
              .gte("match_date", today)
              .neq("status", "cancelled"),
            supabase
              .from("pitch_bookings")
              .select("id", { count: "exact", head: true })
              .eq("club_id", clubId)
              .neq("status", "cancelled")
              .gte("starts_at", nowIso)
              .lte("starts_at", in7),
            supabase
              .from("activities")
              .select("id", { count: "exact", head: true })
              .eq("club_id", clubId)
              .eq("type", "training")
              .gte("starts_at", nowIso)
              .lte("starts_at", in14),
            supabase
              .from("club_person_placeholders")
              .select("id", { count: "exact", head: true })
              .eq("club_id", clubId)
              .is("resolved_membership_id", null),
          ]);

          if (cancelled) return;

          let unresolvedPlaceholders: number | null = null;
          if (!phRes.error) unresolvedPlaceholders = phRes.count ?? 0;
          else if (!isMissingRelationError(phRes.error)) setSnapshotError(true);

          setSnapshot({
            ...empty,
            membersActive: memRes.error ? null : memRes.count ?? 0,
            teamsCount: teamRes.error ? null : teamRes.count ?? 0,
            upcomingMatches: matchRes.error ? null : matchRes.count ?? 0,
            bookingsNext7d: bookRes.error ? null : bookRes.count ?? 0,
            trainingsNext14d: trainRes.error ? null : trainRes.count ?? 0,
            unresolvedPlaceholders,
          });
          if (memRes.error || teamRes.error || matchRes.error || bookRes.error || trainRes.error) setSnapshotError(true);
          return;
        }

        if (persona === "trainer") {
          const coachRes = await supabase.from("team_coaches").select("team_id").eq("membership_id", membershipId);
          if (cancelled) return;
          if (coachRes.error) {
            setSnapshot({ ...empty, coachTeamIds: [] });
            setSnapshotError(true);
            return;
          }
          const coachTeamIds = [...new Set((coachRes.data || []).map((r) => String((r as { team_id?: string }).team_id || "")).filter(Boolean))];
          let coachTrainings14d: number | null = null;
          if (coachTeamIds.length > 0) {
            const tr = await supabase
              .from("activities")
              .select("id", { count: "exact", head: true })
              .eq("club_id", clubId)
              .eq("type", "training")
              .gte("starts_at", nowIso)
              .lte("starts_at", in14)
              .in("team_id", coachTeamIds);
            if (!cancelled) coachTrainings14d = tr.error ? null : tr.count ?? 0;
            if (tr.error) setSnapshotError(true);
          }
          if (!cancelled) {
            setSnapshot({ ...empty, coachTeamIds, coachTrainings14d });
          }
          return;
        }

        if (persona === "player") {
          const tpRes = await supabase.from("team_players").select("team_id").eq("membership_id", membershipId);
          if (cancelled) return;
          if (tpRes.error) {
            setSnapshot({ ...empty, playerTeamIds: [] });
            setSnapshotError(true);
            return;
          }
          const playerTeamIds = [...new Set((tpRes.data || []).map((r) => String((r as { team_id?: string }).team_id || "")).filter(Boolean))];
          let playerSessions14d: number | null = null;
          if (playerTeamIds.length > 0) {
            const tr = await supabase
              .from("activities")
              .select("id", { count: "exact", head: true })
              .eq("club_id", clubId)
              .gte("starts_at", nowIso)
              .lte("starts_at", in14)
              .in("team_id", playerTeamIds);
            if (!cancelled) playerSessions14d = tr.error ? null : tr.count ?? 0;
            if (tr.error) setSnapshotError(true);
          }
          if (!cancelled) setSnapshot({ ...empty, playerTeamIds, playerSessions14d });
          return;
        }

        if (!cancelled) setSnapshot(empty);
      } catch {
        if (!cancelled) {
          setSnapshot(empty);
          setSnapshotError(true);
        }
      } finally {
        if (!cancelled) setSnapshotLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId, membershipId, persona]);

  const teamsForSelect = useMemo(() => {
    if (persona === "trainer" && snapshot?.coachTeamIds && snapshot.coachTeamIds.length > 0) {
      const allowed = new Set(snapshot.coachTeamIds);
      return teams.filter((team) => allowed.has(team.id));
    }
    return teams;
  }, [persona, snapshot?.coachTeamIds, teams]);

  useEffect(() => {
    if (persona !== "trainer") return;
    if (!snapshot?.coachTeamIds?.length) return;
    if (selectedTeamId === "all") return;
    if (!snapshot.coachTeamIds.includes(selectedTeamId)) setSelectedTeamId("all");
  }, [persona, selectedTeamId, snapshot?.coachTeamIds]);

  useEffect(() => {
    if (!clubId) return;
    const fetchStats = async () => {
      setLoading(true);
      let seasonCompIds: string[] | null = null;
      if (selectedCompId === "all" && selectedSeason !== "all") {
        seasonCompIds = competitions
          .filter((competition) => competition.season === selectedSeason)
          .map((competition) => competition.id);
        if (seasonCompIds.length === 0) {
          setStats([]);
          setLoading(false);
          return;
        }
      }

      const teamFilter = selectedTeamId === "all" ? null : selectedTeamId;

      const { data, error } = await supabaseDynamic.rpc("get_player_stats_aggregate", {
        _club_id: clubId,
        _team_id: teamFilter,
        _competition_id: selectedCompId === "all" ? null : selectedCompId,
        _competition_ids: selectedCompId === "all" ? seasonCompIds : null,
      });
      if (error) {
        setStats([]);
        setLoading(false);
        return;
      }

      setStats(((data as PlayerStat[]) ?? []).map((row) => ({
        membership_id: row.membership_id,
        display_name: row.display_name || t.common.unknown,
        goals: Number(row.goals || 0),
        assists: Number(row.assists || 0),
        yellow_cards: Number(row.yellow_cards || 0),
        red_cards: Number(row.red_cards || 0),
      })));
      setLoading(false);
    };
    void fetchStats();
  }, [clubId, competitions, selectedCompId, selectedSeason, selectedTeamId, t]);

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      if (tab === "scorers") return b.goals - a.goals;
      if (tab === "assists") return b.assists - a.assists;
      return (b.yellow_cards + b.red_cards) - (a.yellow_cards + a.red_cards);
    }).filter((s) => {
      if (tab === "scorers") return s.goals > 0;
      if (tab === "assists") return s.assists > 0;
      return s.yellow_cards > 0 || s.red_cards > 0;
    });
  }, [stats, tab]);

  const displayRows = useMemo(() => {
    if (persona === "player" && membershipId) return sorted.filter((s) => s.membership_id === membershipId);
    return sorted;
  }, [membershipId, persona, sorted]);

  const tabItems = useMemo(
    () =>
      [
        { id: "scorers" as const, label: t.reportsPage.tabScorers, icon: Trophy },
        { id: "assists" as const, label: t.reportsPage.tabAssists, icon: Award },
        { id: "cards" as const, label: t.reportsPage.tabCards, icon: AlertTriangle },
      ] as const,
    [t.reportsPage.tabAssists, t.reportsPage.tabCards, t.reportsPage.tabScorers],
  );

  const emptyPerformanceCopy = useMemo(() => {
    if (persona === "player") return t.reportsPage.emptyPlayerStats;
    if (tab === "scorers") return t.reportsPage.emptyScorers;
    if (tab === "assists") return t.reportsPage.emptyAssists;
    return t.reportsPage.emptyCards;
  }, [persona, tab, t.reportsPage]);

  const showFilters = seasons.length > 0 || competitions.length > 0 || teamsForSelect.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <DashboardHeaderSlot title={t.playerStatsPage.title} subtitle={t.playerStatsPage.subtitle} />

      <div className="border-b border-border bg-card/20">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground">{scopeCopy}</p>
          {snapshotError ? <p className="mt-2 text-xs text-amber-600">{t.reportsPage.snapshotLoadError}</p> : null}
        </div>
      </div>

      {persona === "admin" && clubId ? (
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.reportsPage.sectionOverview}</CardTitle>
              <CardDescription className="text-xs">{t.reportsPage.scopeAdmin}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {snapshotLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t.reportsPage.loadingMetrics}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <Kpi label={t.reportsPage.kpiActiveMembers} value={snapshot?.membersActive ?? "—"} />
                  <Kpi label={t.reportsPage.kpiTeams} value={snapshot?.teamsCount ?? "—"} />
                  <Kpi label={t.reportsPage.kpiUpcomingMatches} value={snapshot?.upcomingMatches ?? "—"} />
                  <Kpi label={t.reportsPage.kpiBookings7d} value={snapshot?.bookingsNext7d ?? "—"} />
                  <Kpi label={t.reportsPage.kpiTrainings14d} value={snapshot?.trainingsNext14d ?? "—"} />
                  <Kpi label={t.reportsPage.kpiUnresolvedPlaceholders} value={snapshot?.unresolvedPlaceholders ?? "—"} />
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-foreground mb-2">{t.reportsPage.quickLinks}</div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link to="/members"><Users className="w-3.5 h-3.5 mr-1" />{t.reportsPage.linkMembers}<ArrowRight className="w-3 h-3 ml-1 opacity-60" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link to="/teams"><LayoutGrid className="w-3.5 h-3.5 mr-1" />{t.reportsPage.linkTeams}<ArrowRight className="w-3 h-3 ml-1 opacity-60" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link to="/matches"><Trophy className="w-3.5 h-3.5 mr-1" />{t.reportsPage.linkMatches}<ArrowRight className="w-3 h-3 ml-1 opacity-60" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link to="/activities"><Calendar className="w-3.5 h-3.5 mr-1" />{t.reportsPage.linkActivities}<ArrowRight className="w-3 h-3 ml-1 opacity-60" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link to="/training-plan-import"><MapPin className="w-3.5 h-3.5 mr-1" />{t.reportsPage.linkTrainingImport}<ArrowRight className="w-3 h-3 ml-1 opacity-60" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link to="/coach-placeholders"><Users className="w-3.5 h-3.5 mr-1" />{t.reportsPage.linkCoachPlaceholders}<ArrowRight className="w-3 h-3 ml-1 opacity-60" /></Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {persona === "trainer" && clubId ? (
        <div className="container mx-auto px-4 py-6">
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.reportsPage.sectionCoaching}</CardTitle>
              <CardDescription className="text-xs">{t.reportsPage.scopeTrainer}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshotLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t.reportsPage.loadingCoachMetrics}
                </div>
              ) : snapshot && snapshot.coachTeamIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.reportsPage.kpiNoTeams}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Kpi label={t.reportsPage.kpiCoachedTeams} value={snapshot?.coachTeamIds.length ?? 0} />
                  <Kpi label={t.reportsPage.kpiTeamTrainings14d} value={snapshot?.coachTrainings14d ?? "—"} />
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link to="/teams">{t.reportsPage.linkTeams}</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link to="/activities">{t.reportsPage.linkActivities}</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link to="/matches">{t.reportsPage.linkMatches}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {persona === "player" && clubId ? (
        <div className="container mx-auto px-4 py-6">
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.reportsPage.sectionPlayer}</CardTitle>
              <CardDescription className="text-xs">{t.reportsPage.selfStatsHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshotLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t.reportsPage.loadingPlayerSnapshot}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Kpi label={t.reportsPage.kpiYourTeams} value={snapshot?.playerTeamIds.length ?? 0} />
                  <Kpi label={t.reportsPage.kpiYourUpcomingSessions} value={snapshot?.playerSessions14d ?? "—"} />
                </div>
              )}
              {!snapshotLoading && snapshot && snapshot.playerTeamIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.reportsPage.kpiNoTeamAssignments}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link to="/activities">{t.reportsPage.linkActivities}</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link to="/matches">{t.reportsPage.linkMatches}</Link>
                </Button>
                {membershipId ? (
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link to={`/player/${membershipId}`}>{t.playerProfilePage.title}</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {persona === "sponsor" && clubId ? (
        <div className="container mx-auto px-4 py-6">
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.reportsPage.sectionPartner}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t.reportsPage.partnerIntro}</p>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to="/communication"><Briefcase className="w-3.5 h-3.5 mr-1" />{t.sidebar.messages}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      {showFilters && (
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
            {persona !== "player" && teamsForSelect.length > 0 && (
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border bg-background px-3 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.playerStatsPage.allTeams}</SelectItem>
                  {teamsForSelect.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {persona === "player" ? (
              <div className="text-xs text-muted-foreground">{t.reportsPage.selfStatsHint}</div>
            ) : null}
            {seasons.length > 0 && (
              <Select
                value={selectedSeason}
                onValueChange={(value) => {
                  setSelectedSeason(value);
                  setSelectedCompId("all");
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border bg-background px-3 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.playerStatsPage.allSeasons}</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season} value={season}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={selectedCompId}
              onValueChange={(value) => {
                setSelectedCompId(value);
                if (value !== "all") setSelectedSeason("all");
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border bg-background px-3 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.playerStatsPage.allCompetitions}</SelectItem>
                {competitions
                  .filter((competition) => selectedSeason === "all" || competition.season === selectedSeason)
                  .map((competition) => (
                    <SelectItem key={competition.id} value={competition.id}>
                      {competition.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {clubLoading || loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">{t.reportsPage.noClubFound}</div>
        ) : displayRows.length === 0 ? (
          <div className="max-w-2xl mx-auto rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">{emptyPerformanceCopy}</div>
        ) : (
          <div className="max-w-2xl mx-auto rounded-xl bg-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-center px-3 py-3 w-12">#</th>
                  <th className="text-left px-4 py-3">{t.reportsPage.columnPlayer}</th>
                  {tab === "scorers" && <th className="text-center px-4 py-3">{t.reportsPage.columnGoals}</th>}
                  {tab === "assists" && <th className="text-center px-4 py-3">{t.reportsPage.columnAssists}</th>}
                  {tab === "cards" && (
                    <>
                      <th className="text-center px-3 py-3">{t.reportsPage.columnYellow}</th>
                      <th className="text-center px-3 py-3">{t.reportsPage.columnRed}</th>
                      <th className="text-center px-3 py-3">{t.reportsPage.columnCardsTotal}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((s, i) => (
                  <motion.tr
                    key={s.membership_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/30"
                    onClick={() => {
                      void navigate(`/player/${s.membership_id}`);
                    }}
                  >
                    <td className="text-center px-3 py-3">
                      {i < 3 ? (
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            i === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
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
