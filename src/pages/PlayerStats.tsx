import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Loader2, Trophy, AlertTriangle, Award, Filter, Users, Calendar, MapPin, Briefcase,
  ArrowRight, LayoutGrid,
} from "lucide-react";
import { format, startOfMonth, startOfWeek } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClubId } from "@/hooks/use-club-id";
import { useActiveClub } from "@/hooks/use-active-club";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useLanguage } from "@/hooks/use-language";
import {
  DASHBOARD_PAGE_INNER,
  DASHBOARD_PAGE_INNER_SM,
  DASHBOARD_PAGE_MAX_INNER,
  DASHBOARD_PAGE_ROOT,
  DASHBOARD_TABS_INNER_SCROLL,
  DASHBOARD_TABS_ROW,
} from "@/lib/dashboard-page-shell";

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

interface ClubKpiSeriesPoint {
  label: string;
  trainings: number;
  matches: number;
  events: number;
  newMembers: number;
}

interface ClubKpiBreakdown {
  teamsWithoutTrainer: number | null;
  teamsWithTrainer: number | null;
}

interface SimpleSeriesPoint {
  label: string;
  value: number;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  if (message.includes("Could not find the table")) return true;
  if (/\brelation\b.*\bdoes not exist\b/i.test(message)) return true;
  return false;
}

function normalizeActivityType(value: unknown): "training" | "match" | "event" | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v === "training" || v === "trainings" || v === "session" || v === "practice") return "training";
  if (v === "match" || v === "game") return "match";
  if (v === "event") return "event";
  return null;
}

function localDayKey(dateLike: string) {
  return format(new Date(dateLike), "yyyy-MM-dd");
}

function weekKey(dateLike: string) {
  const w = startOfWeek(new Date(dateLike), { weekStartsOn: 1 });
  return format(w, "yyyy-MM-dd");
}

function weekLabelFromKey(key: string) {
  return format(new Date(`${key}T00:00:00`), "dd.MM");
}

function monthKey(dateLike: string) {
  const m = startOfMonth(new Date(dateLike));
  return format(m, "yyyy-MM");
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

  const [clubSeries, setClubSeries] = useState<ClubKpiSeriesPoint[]>([]);
  const [clubBreakdown, setClubBreakdown] = useState<ClubKpiBreakdown>({ teamsWithoutTrainer: null, teamsWithTrainer: null });
  const [clubChartsLoading, setClubChartsLoading] = useState(false);
  const [trainingsByDow, setTrainingsByDow] = useState<SimpleSeriesPoint[]>([]);
  const [trainingsByMonth, setTrainingsByMonth] = useState<SimpleSeriesPoint[]>([]);

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
              .ilike("type", "training")
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
              .ilike("type", "training")
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

  useEffect(() => {
    if (!clubId || persona !== "admin") {
      setClubSeries([]);
      setClubBreakdown({ teamsWithoutTrainer: null, teamsWithTrainer: null });
      return;
    }

    let cancelled = false;
    setClubChartsLoading(true);

    void (async () => {
      const now = new Date();
      const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
      const weeks = 12;
      const from = new Date(thisWeek);
      from.setDate(from.getDate() - (weeks - 1) * 7);
      const fromIso = from.toISOString();

      const buckets = Array.from({ length: weeks }, (_, i) => {
        const start = new Date(from);
        start.setDate(start.getDate() + i * 7);
        return {
          key: format(start, "yyyy-MM-dd"),
          label: format(start, "dd.MM"),
          start,
          trainings: 0,
          matches: 0,
          events: 0,
          newMembers: 0,
        };
      });
      const byKey = new Map(buckets.map((b) => [b.key, b]));

      function bumpWeek(dateLike: string | null | undefined, field: keyof Pick<ClubKpiSeriesPoint, "trainings" | "matches" | "events" | "newMembers">) {
        if (!dateLike) return;
        const key = weekKey(dateLike);
        const bucket = byKey.get(key);
        if (!bucket) return;
        bucket[field] += 1;
      }

      try {
        const [trainRes, matchRes, eventRes, membersRes] = await Promise.all([
          supabase
            .from("activities")
            .select("starts_at, type")
            .eq("club_id", clubId)
            .gte("starts_at", fromIso),
          supabase
            .from("matches")
            .select("match_date, status")
            .eq("club_id", clubId)
            .gte("match_date", fromIso)
            .neq("status", "cancelled"),
          supabase
            .from("events")
            .select("starts_at, status")
            .eq("club_id", clubId)
            .gte("starts_at", fromIso)
            .neq("status", "cancelled"),
          supabase
            .from("club_memberships")
            .select("created_at, status")
            .eq("club_id", clubId)
            .gte("created_at", fromIso)
            .eq("status", "active"),
        ]);

        if (cancelled) return;

        if (!trainRes.error) {
          for (const row of trainRes.data ?? []) {
            const startsAt = String((row as { starts_at?: string }).starts_at ?? "");
            if (!startsAt) continue;
            const kind = normalizeActivityType((row as { type?: unknown }).type);
            if (kind === "training") bumpWeek(startsAt, "trainings");
            if (kind === "event") bumpWeek(startsAt, "events");
            if (kind === "match") bumpWeek(startsAt, "matches");
          }
        } else if (!isMissingRelationError(trainRes.error)) {
          setSnapshotError(true);
        }

        if (!matchRes.error) {
          for (const row of matchRes.data ?? []) bumpWeek((row as { match_date?: string }).match_date, "matches");
        } else if (!isMissingRelationError(matchRes.error)) {
          setSnapshotError(true);
        }

        if (!eventRes.error) {
          for (const row of eventRes.data ?? []) bumpWeek((row as { starts_at?: string }).starts_at, "events");
        } else if (!isMissingRelationError(eventRes.error)) {
          setSnapshotError(true);
        }

        if (!membersRes.error) {
          for (const row of membersRes.data ?? []) bumpWeek((row as { created_at?: string }).created_at, "newMembers");
        } else if (!isMissingRelationError(membersRes.error)) {
          setSnapshotError(true);
        }

        if (!cancelled) {
          const dowLabels = [
            { id: 1, label: "Mon" },
            { id: 2, label: "Tue" },
            { id: 3, label: "Wed" },
            { id: 4, label: "Thu" },
            { id: 5, label: "Fri" },
            { id: 6, label: "Sat" },
            { id: 0, label: "Sun" },
          ];
          const dowMap = new Map(dowLabels.map((d) => [d.id, { label: d.label, value: 0 }]));
          const monthMap = new Map<string, number>();

          if (!trainRes.error) {
            for (const r of trainRes.data ?? []) {
              const startsAt = String((r as { starts_at?: string }).starts_at ?? "");
              if (!startsAt) continue;
              const kind = normalizeActivityType((r as { type?: unknown }).type);
              if (kind !== "training") continue;
              const d = new Date(startsAt);
              if (Number.isNaN(d.getTime())) continue;
              const dow = d.getDay();
              const slot = dowMap.get(dow);
              if (slot) slot.value += 1;
              const mk = monthKey(startsAt);
              monthMap.set(mk, (monthMap.get(mk) ?? 0) + 1);
            }
          }

          setTrainingsByDow(Array.from(dowMap.values()));

          const months = 6;
          const monthBuckets: SimpleSeriesPoint[] = [];
          for (let i = months - 1; i >= 0; i -= 1) {
            const m = new Date(now);
            m.setMonth(m.getMonth() - i, 1);
            m.setHours(0, 0, 0, 0);
            const key = format(startOfMonth(m), "yyyy-MM");
            monthBuckets.push({ label: format(m, "MMM"), value: monthMap.get(key) ?? 0 });
          }
          setTrainingsByMonth(monthBuckets);
        }

        const [teamsRes, coachesRes] = await Promise.all([
          supabase.from("teams").select("id").eq("club_id", clubId),
          supabase.from("team_coaches").select("team_id"),
        ]);

        if (!cancelled) {
          if (!teamsRes.error) {
            const teamIds = (teamsRes.data ?? []).map((r) => String((r as { id?: string }).id || "")).filter(Boolean);
            const coachesTeamIdsRaw = !coachesRes.error
              ? (coachesRes.data ?? []).map((r) => String((r as { team_id?: string }).team_id || "")).filter(Boolean)
              : [];
            const teamIdSet = new Set(teamIds);
            const coachedTeams = new Set(coachesTeamIdsRaw.filter((id) => teamIdSet.has(id)));
            const teamsWithTrainer = coachedTeams.size;
            const teamsWithoutTrainer = Math.max(0, teamIds.length - teamsWithTrainer);
            setClubBreakdown({ teamsWithTrainer, teamsWithoutTrainer });
          } else {
            setClubBreakdown({ teamsWithTrainer: null, teamsWithoutTrainer: null });
          }
        }

        if (!cancelled) {
          setClubSeries(
            buckets.map((b) => ({
              label: b.label,
              trainings: b.trainings,
              matches: b.matches,
              events: b.events,
              newMembers: b.newMembers,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setClubSeries([]);
          setClubBreakdown({ teamsWithoutTrainer: null, teamsWithTrainer: null });
          setTrainingsByDow([]);
          setTrainingsByMonth([]);
          setSnapshotError(true);
        }
      } finally {
        if (!cancelled) setClubChartsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId, persona]);

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
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot title={t.playerStatsPage.title} subtitle={t.playerStatsPage.subtitle} />

      <div className="border-b border-border bg-card/20">
        <div className={`${DASHBOARD_PAGE_MAX_INNER} py-4`}>
          <p className="text-sm text-muted-foreground">{scopeCopy}</p>
          {snapshotError ? <p className="mt-2 text-xs text-amber-600">{t.reportsPage.snapshotLoadError}</p> : null}
        </div>
      </div>

      {persona === "admin" && clubId ? (
        <div className={`${DASHBOARD_PAGE_INNER} space-y-4`}>
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

              <div className="grid gap-3 lg:grid-cols-3">
                <Card className="border-border/60 bg-background/30 lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.reportsPage.chartActivityTitle}</CardTitle>
                    <CardDescription className="text-xs">{t.reportsPage.chartActivitySubtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[260px]">
                    {clubChartsLoading ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t.reportsPage.loadingMetrics}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clubSeries} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="trainings" name={t.reportsPage.chartLegendTrainings} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="matches" name={t.reportsPage.chartLegendMatches} fill="hsl(var(--chart-2, var(--muted-foreground)))" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="events" name={t.reportsPage.chartLegendEvents} fill="hsl(var(--chart-3, var(--muted-foreground)))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-background/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.reportsPage.chartCoverageTitle}</CardTitle>
                    <CardDescription className="text-xs">{t.reportsPage.chartCoverageSubtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[260px] flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Kpi label={t.reportsPage.kpiTeams} value={snapshot?.teamsCount ?? "—"} />
                      <Kpi label={t.reportsPage.kpiActiveMembers} value={snapshot?.membersActive ?? "—"} />
                    </div>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: t.reportsPage.teamsWithTrainer, value: clubBreakdown.teamsWithTrainer ?? 0 },
                              { name: t.reportsPage.teamsWithoutTrainer, value: clubBreakdown.teamsWithoutTrainer ?? 0 },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={38}
                            outerRadius={64}
                            paddingAngle={2}
                          >
                            <Cell fill="hsl(var(--primary))" />
                            <Cell fill="hsl(var(--muted-foreground))" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {clubBreakdown.teamsWithoutTrainer == null ? (
                        t.common.loading
                      ) : (
                        <>
                          {clubBreakdown.teamsWithTrainer} {t.reportsPage.teamsWithTrainer}
                          {" · "}
                          {clubBreakdown.teamsWithoutTrainer} {t.reportsPage.teamsWithoutTrainer}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="border-border/60 bg-background/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.reportsPage.chartTrainingsByDowTitle}</CardTitle>
                    <CardDescription className="text-xs">{t.reportsPage.chartTrainingsByDowSubtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trainingsByDow} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" name={t.reportsPage.chartLegendTrainings} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-background/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.reportsPage.chartTrainingsByMonthTitle}</CardTitle>
                    <CardDescription className="text-xs">{t.reportsPage.chartTrainingsByMonthSubtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trainingsByMonth} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" name={t.reportsPage.chartLegendTrainings} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/60 bg-background/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.reportsPage.chartNewMembersTitle}</CardTitle>
                  <CardDescription className="text-xs">{t.reportsPage.sectionOverview}</CardDescription>
                </CardHeader>
                <CardContent className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={clubSeries} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="newMembers" name={t.reportsPage.chartLegendNewMembers} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

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
        <div className={DASHBOARD_PAGE_INNER}>
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
        <div className={DASHBOARD_PAGE_INNER}>
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
        <div className={DASHBOARD_PAGE_INNER}>
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
          <div className={`${DASHBOARD_PAGE_INNER_SM} flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3`}>
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
      <div className={DASHBOARD_TABS_ROW}>
        <div className={DASHBOARD_TABS_INNER_SCROLL}>
          {tabItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={DASHBOARD_PAGE_INNER}>
        {clubLoading || loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">{t.reportsPage.noClubFound}</div>
        ) : displayRows.length === 0 ? (
          <div className="max-w-2xl mx-auto rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">{emptyPerformanceCopy}</div>
        ) : (
          <div className="mx-auto max-w-2xl min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[320px] text-sm">
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
