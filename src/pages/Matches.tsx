import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Plus, Trophy, Loader2, X, MapPin, Clock,
  Users, Target, Award, AlertTriangle, ChevronDown, ExternalLink, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_INNER_SM, DASHBOARD_PAGE_ROOT, DASHBOARD_TYPE_MICRO } from "@/lib/dashboard-page-shell";
import { DashboardIosSegmentTabs } from "@/components/dashboard/DashboardIosSegmentTabs";
import { DashboardToolbarActions } from "@/components/dashboard/DashboardToolbarActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabaseErrorMessage, isTransientSupabaseMessage } from "@/lib/supabase-error-message";
import { useLanguage } from "@/hooks/use-language";
import { useActiveClub } from "@/hooks/use-active-club";
import { trackUsageEvent } from "@/lib/usage-events";
import { useMembershipId } from "@/hooks/use-membership-id";
import { useModuleDataScope } from "@/hooks/use-module-data-scope";
import {
  canCreateMatches,
  canManageMatch,
  canManageMatchForTeam,
  canManageSommerfestSchedule,
  isSommerfestLinkedMatch,
  manageableTeamIds,
  type MatchManagementAccessInput,
} from "@/lib/match-management-access";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import { resolveCanonicalYouthTeamName } from "@/lib/youth-team-label";
import { SommerfestHero } from "@/components/sommerfest/sommerfest-hero";
import { SommerfestMatchSchedule } from "@/components/sommerfest/sommerfest-match-schedule";
import { EventsHighlightAdmin } from "@/components/events/events-highlight-admin";
import {
  EMPTY_CLUB_EVENTS_HIGHLIGHT,
  type ClubEventsHighlightConfig,
} from "@/lib/club-events-highlight";
import { loadClubEventsHighlight } from "@/lib/club-events-highlight-api";
import {
  COMPETITION_TYPE_FILTERS,
  computeMatchStandings,
  filterCompetitionsByType,
  type CompetitionTypeFilter,
  type MatchStandingRow,
} from "@/lib/match-standings";
import { SOMMERFEST_MATCHES, type SommerfestMatch } from "@/lib/tsv-allach-sommerfest-2026";
import { resolveShowcaseTeamId } from "@/lib/tsv-allach-public-matches";
import {
  extractSommerfestMatchIdFromNotes,
  isSommerfestTemplateOnlyMatch,
  sommerfestDatetimeLocalToIso,
  sommerfestIsoToDatetimeLocal,
  sommerfestMatchImportKey,
  sommerfestMatchToInsertRow,
  sommerfestTemplateToDashboardMatch,
  SOMMERFEST_MATCH_IMPORT_KEY_PREFIX,
} from "@/lib/tsv-allach-sommerfest-match-sync";
import {
  publishSommerfestTournament,
  publicTournamentPath,
  SOMMERFEST_COMPETITION_NAME,
} from "@/lib/tsv-allach-sommerfest-competition";
// logo is rendered by AppHeader
import LineupExport from "@/components/matches/LineupExport";
import { OpponentLogoField } from "@/components/matches/OpponentLogoField";
import MatchVoting from "@/components/matches/MatchVoting";
import MatchTimeline from "@/components/matches/MatchTimeline";
import FormStreak from "@/components/matches/FormStreak";
import AIMatchAnalysis from "@/components/ai/AIMatchAnalysis";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { cn } from "@/lib/utils";
import type { MembershipWithProfile } from "@/types/supabase";

type Team = { id: string; name: string };
type Competition = { id: string; name: string; season: string | null; competition_type: string; team_id: string | null };
type Match = {
  id: string; opponent: string; is_home: boolean; match_date: string;
  location: string | null; status: string; home_score: number | null; away_score: number | null;
  competition_id: string | null; team_id: string | null; notes: string | null;
  opponent_logo_url?: string | null;
  competitions?: { name: string } | null; teams?: { name: string } | null;
  sommerfestTemplateId?: string;
  isSommerfestTemplateOnly?: boolean;
};
type MatchEvent = { id: string; match_id: string; membership_id: string | null; event_type: string; minute: number | null; notes: string | null };
type Membership = MembershipWithProfile;
type LineupPlayer = { id: string; match_id: string; membership_id: string; is_starter: boolean; jersey_number: number | null; position: string | null };
const MATCHES_PAGE_SIZE = 20;
/** Safety cap for roster fetch when opening match detail (lineup/scoring). See ops/FAN_OUT_AUDIT.md. */
const MATCH_DETAIL_ROSTER_FETCH_CAP = 800;

/** PostgREST `or` filter: rows strictly before (match_date, id) in desc sort order. */
function matchesKeysetOrFilter(match_date: string, id: string) {
  const q = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `match_date.lt.${q(match_date)},and(match_date.eq.${q(match_date)},id.lt.${id})`;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-accent/10 text-accent",
};

const MATCH_STATUS_OPTIONS = ["scheduled", "in_progress", "completed", "cancelled"] as const;

/** Shared field styling in the match detail editor (aligns datetime-local with selects on mobile). */
const MATCH_DETAIL_FIELD_CLASS =
  "box-border h-10 w-full min-w-0 max-w-full rounded-xl border-border bg-card px-3 text-sm [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left";

const eventTypeLabels: Record<string, string> = {
  goal: "⚽ Goal", assist: "🅰️ Assist", yellow_card: "🟨 Yellow", red_card: "🟥 Red",
  substitution_in: "🔄 Sub In", substitution_out: "🔄 Sub Out",
};

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function matchDatetimeLocalValue(match: Pick<Match, "match_date" | "notes" | "sommerfestTemplateId">): string {
  if (isSommerfestLinkedMatch(match)) return sommerfestIsoToDatetimeLocal(match.match_date);
  return toDatetimeLocalValue(match.match_date);
}

function matchDateForPersist(
  match: Pick<Match, "notes" | "sommerfestTemplateId">,
  editValue: string,
): string {
  if (isSommerfestLinkedMatch(match)) return sommerfestDatetimeLocalToIso(editValue);
  return editValue;
}

function formatMatchHeadline(match: Pick<Match, "opponent" | "is_home" | "team_id" | "teams">, teams: Team[]) {
  const clubTeam =
    match.teams?.name ?? (match.team_id ? teams.find((team) => team.id === match.team_id)?.name : null) ?? "Club";
  const opponent = resolveCanonicalYouthTeamName(teams, match.opponent);
  return match.is_home ? `${clubTeam} vs ${opponent}` : `${opponent} vs ${clubTeam}`;
}

const Matches = () => {
  // navigation is handled by AppHeader
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const perms = usePermissions();
  const matchDataScope = useModuleDataScope("matches");
  const { membershipId } = useMembershipId();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { activeClub } = useActiveClub();
  const showAllachExtras = isTsvAllachClub(activeClub);
  const showSommerfest = showAllachExtras;

  const [tab, setTab] = useState<"matches" | "competitions" | "standings">("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesTotalCount, setMatchesTotalCount] = useState(0);
  const matchPageKeysetRef = useRef<Record<number, { match_date: string; id: string }>>({});
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [coachedTeamIds, setCoachedTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesListError, setMatchesListError] = useState<string | null>(null);
  const [matchesRetryTick, setMatchesRetryTick] = useState(0);
  const [sommerfestDbMatches, setSommerfestDbMatches] = useState<Map<string, Match>>(new Map());
  const [openingSommerfestId, setOpeningSommerfestId] = useState<string | null>(null);
  const [publishingSommerfest, setPublishingSommerfest] = useState(false);
  const [eventsHighlight, setEventsHighlight] = useState<ClubEventsHighlightConfig>(EMPTY_CLUB_EVENTS_HIGHLIGHT);
  const showHighlight = eventsHighlight.enabled;

  // Modals
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [lineup, setLineup] = useState<LineupPlayer[]>([]);
  const [lineupTab, setLineupTab] = useState<"events" | "lineup">("events");

  // Reset page state on club switch to prevent cross-club flashes
  useEffect(() => {
    setMatches([]);
    setMatchesPage(1);
    setMatchesTotalCount(0);
    setCompetitions([]);
    setTeams([]);
    setSelectedMatch(null);
    setMatchEvents([]);
    setMembers([]);
    setLineup([]);
    setSommerfestDbMatches(new Map());
    setOpeningSommerfestId(null);
    setEventsHighlight(EMPTY_CLUB_EVENTS_HIGHLIGHT);
    setLoading(true);
    setLoadingDetail(false);
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    void loadClubEventsHighlight(supabase, clubId, activeClub).then(({ data }) => {
      if (!cancelled) setEventsHighlight(data);
    });
    return () => {
      cancelled = true;
    };
  }, [clubId, activeClub]);

  const [openPanels, setOpenPanels] = useState({
    details: true,
    score: true,
    timeline: false,
    voting: false,
    ai: true,
  });
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
  const [opponentLogoUrl, setOpponentLogoUrl] = useState<string | null>(null);

  // Competition form
  const [compName, setCompName] = useState("");
  const [compSeason, setCompSeason] = useState("2025/2026");
  const [compType, setCompType] = useState("league");
  const [competitionTypeFilter, setCompetitionTypeFilter] = useState<CompetitionTypeFilter>("all");
  const [standingCompetitionId, setStandingCompetitionId] = useState<string>("__all");
  const [standingMatches, setStandingMatches] = useState<Match[]>([]);
  const [standingLoading, setStandingLoading] = useState(false);
  const [compTeamId, setCompTeamId] = useState("");

  // Result form
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  // Edit match form
  const [editOpponent, setEditOpponent] = useState("");
  const [editIsHome, setEditIsHome] = useState(true);
  const [editMatchDate, setEditMatchDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [editCompId, setEditCompId] = useState("");
  const [editStatus, setEditStatus] = useState("scheduled");
  const [editOpponentLogoUrl, setEditOpponentLogoUrl] = useState<string | null>(null);
  const [savingMatch, setSavingMatch] = useState(false);

  // Match event form
  const [evType, setEvType] = useState("goal");
  const [evMemberId, setEvMemberId] = useState("");
  const [evMinute, setEvMinute] = useState("");

  const filteredCompetitions = useMemo(
    () => filterCompetitionsByType(competitions, competitionTypeFilter),
    [competitions, competitionTypeFilter],
  );

  const competitionTypeLabel = useCallback(
    (type: string) => {
      if (type === "league") return t.matchesPage.typeLeague;
      if (type === "cup") return t.matchesPage.typeCup;
      if (type === "tournament") return t.matchesPage.typeTournament;
      if (type === "friendly") return t.matchesPage.typeFriendly;
      return type;
    },
    [t.matchesPage],
  );

  const competitionScopeLabel = useCallback(
    (teamId: string | null) => {
      if (!teamId) return t.matchesPage.scopeAllTeams;
      return teams.find((team) => team.id === teamId)?.name || t.matchesPage.scopeAllTeams;
    },
    [t.matchesPage.scopeAllTeams, teams],
  );

  const standings = useMemo(
    (): MatchStandingRow[] =>
      computeMatchStandings(standingMatches, {
        clubLabel: t.matchesPage.clubStandingLabel,
      }),
    [standingMatches, t.matchesPage.clubStandingLabel],
  );
  const matchAccess = useMemo(
    (): MatchManagementAccessInput => ({
      legacyRole: perms.role,
      assignments: perms.assignments,
      isAdmin: perms.isAdmin,
      hasMatchesWrite: perms.has("matches:write"),
      coachedTeamIds,
    }),
    [coachedTeamIds, perms],
  );

  const canManageMatches = useMemo(() => canCreateMatches(matchAccess), [matchAccess]);
  const canEditSommerfestSchedule = useMemo(
    () => canManageSommerfestSchedule(matchAccess),
    [matchAccess],
  );
  const sommerfestCompetitionId = useMemo(
    () => competitions.find((competition) => competition.name === SOMMERFEST_COMPETITION_NAME)?.id ?? null,
    [competitions],
  );
  const sommerfestPublishedCount = sommerfestDbMatches.size;
  const sommerfestFullyPublished = sommerfestPublishedCount >= SOMMERFEST_MATCHES.length;
  const publicTournamentUrl = activeClub?.slug
    ? publicTournamentPath(`/club/${activeClub.slug}`, "")
    : null;
  const manageableTeams = useMemo(() => {
    const ids = manageableTeamIds(matchAccess);
    if (ids === "all") return teams;
    return teams.filter((team) => ids.includes(team.id));
  }, [matchAccess, teams]);

  const canManageSelectedMatch = useMemo(() => {
    if (!selectedMatch) return false;
    return canManageMatch(matchAccess, selectedMatch);
  }, [matchAccess, selectedMatch]);

  const selectedMatchTeams = useMemo(() => {
    if (!selectedMatch) return manageableTeams;
    const templateId =
      selectedMatch.sommerfestTemplateId ?? extractSommerfestMatchIdFromNotes(selectedMatch.notes);
    if (templateId) return teams;
    return manageableTeams;
  }, [manageableTeams, selectedMatch, teams]);

  useEffect(() => {
    if (!membershipId) {
      setCoachedTeamIds([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("team_coaches")
        .select("team_id")
        .eq("membership_id", membershipId);
      if (cancelled) return;
      if (error) {
        setCoachedTeamIds([]);
        return;
      }
      setCoachedTeamIds(
        [...new Set((data ?? []).map((row) => String((row as { team_id?: string }).team_id ?? "")).filter(Boolean))],
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [membershipId]);

  const denyUnlessCanManageMatch = (match: Match | null | undefined, description: string) => {
    if (canManageMatch(matchAccess, match)) return true;
    toast({ title: t.common.notAuthorized, description, variant: "destructive" });
    return false;
  };

  const denyUnlessCanManageTeam = (teamId: string | null | undefined, description: string) => {
    if (canManageMatchForTeam(matchAccess, teamId)) return true;
    toast({ title: t.common.notAuthorized, description, variant: "destructive" });
    return false;
  };

  useEffect(() => {
    if (!clubId) return;
    const fetchAll = async () => {
      setLoading(true);
      setMatchesListError(null);
      if (matchesPage === 1) {
        matchPageKeysetRef.current = {};
      } else {
        const before = matchPageKeysetRef.current[matchesPage - 1];
        if (!before) {
          setMatchesPage(1);
          setLoading(false);
          return;
        }
      }

      let matchQuery = supabase
        .from("matches")
        .select(
          "id, opponent, is_home, match_date, location, status, home_score, away_score, competition_id, team_id, notes, opponent_logo_url, competitions(name), teams(name)",
          { count: "exact" },
        )
        .eq("club_id", clubId)
        .order("match_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(MATCHES_PAGE_SIZE);
      if (matchesPage > 1) {
        const before = matchPageKeysetRef.current[matchesPage - 1];
        if (before) matchQuery = matchQuery.or(matchesKeysetOrFilter(before.match_date, before.id));
      }
      if (matchDataScope.teamIds !== "all" && matchDataScope.teamIds.length > 0) {
        matchQuery = matchQuery.in("team_id", matchDataScope.teamIds);
      }

      const [matchRes, compRes, teamRes] = await Promise.all([
        matchQuery,
        supabase.from("competitions").select("*").eq("club_id", clubId).order("created_at", { ascending: false }),
        supabase.from("teams").select("id, name").eq("club_id", clubId),
      ]);
      const firstErr = matchRes.error || compRes.error || teamRes.error;
      if (firstErr) {
        setMatchesListError(supabaseErrorMessage(firstErr));
        setMatches([]);
        setMatchesTotalCount(0);
        setCompetitions([]);
        setTeams([]);
        setLoading(false);
        return;
      }
      const matchRows = (matchRes.data as unknown as Match[]) || [];
      if (matchRows.length > 0) {
        const oldest = matchRows[matchRows.length - 1];
        if (oldest?.match_date && oldest?.id) {
          matchPageKeysetRef.current[matchesPage] = { match_date: oldest.match_date, id: oldest.id };
        }
      }
      setMatches(matchRows);
      setMatchesTotalCount(matchRes.count ?? 0);
      setCompetitions((compRes.data as Competition[]) || []);
      const allTeams = (teamRes.data as Team[]) || [];
      setTeams(
        matchDataScope.teamIds === "all"
          ? allTeams
          : allTeams.filter((team) => matchDataScope.teamIds.includes(team.id)),
      );
      setLoading(false);
    };
    void fetchAll();
  }, [clubId, matchesPage, matchesRetryTick, matchDataScope.teamIds]);

  useEffect(() => {
    if (!clubId || !showSommerfest) {
      setSommerfestDbMatches(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "id, opponent, is_home, match_date, location, status, home_score, away_score, competition_id, team_id, notes, opponent_logo_url, competitions(name), teams(name)",
        )
        .eq("club_id", clubId)
        .like("notes", `${SOMMERFEST_MATCH_IMPORT_KEY_PREFIX}%`);
      if (cancelled || error) return;
      const map = new Map<string, Match>();
      for (const row of (data as unknown as Match[]) ?? []) {
        const templateId = extractSommerfestMatchIdFromNotes(row.notes);
        if (templateId) map.set(templateId, row);
      }
      setSommerfestDbMatches(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, showSommerfest, matchesRetryTick]);

  useEffect(() => {
    if (!clubId || tab !== "standings") {
      return;
    }
    let cancelled = false;
    setStandingLoading(true);
    void (async () => {
      let query = supabase
        .from("matches")
        .select(
          "id, opponent, is_home, match_date, location, status, home_score, away_score, competition_id, team_id, notes, opponent_logo_url, competitions(name), teams(name)",
        )
        .eq("club_id", clubId)
        .eq("status", "completed")
        .order("match_date", { ascending: false });
      if (standingCompetitionId !== "__all") {
        query = query.eq("competition_id", standingCompetitionId);
      }
      if (matchDataScope.teamIds.length > 0) {
        query = query.in("team_id", matchDataScope.teamIds);
      }
      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setStandingMatches([]);
        setStandingLoading(false);
        return;
      }
      setStandingMatches((data as unknown as Match[]) ?? []);
      setStandingLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, tab, standingCompetitionId, matchDataScope.teamIds, matchesRetryTick]);

  const upsertSommerfestDbMatch = async (template: SommerfestMatch): Promise<Match | null> => {
    if (!clubId) return null;

    const importKey = sommerfestMatchImportKey(template.id);

    const { data: existing } = await supabase
      .from("matches")
      .select("id, opponent, is_home, match_date, location, status, home_score, away_score, competition_id, team_id, notes, opponent_logo_url, competitions(name), teams(name)")
      .eq("club_id", clubId)
      .eq("notes", importKey)
      .maybeSingle();

    if (existing) {
      const match = existing as unknown as Match;
      setSommerfestDbMatches((prev) => new Map(prev).set(template.id, match));
      return match;
    }

    if (!canEditSommerfestSchedule) return null;

    const { data, error } = await supabase
      .from("matches")
      .insert(
        sommerfestMatchToInsertRow(clubId, template, teams, sommerfestCompetitionId, {
          publishPublic: Boolean(sommerfestCompetitionId),
        }),
      )
      .select("id, opponent, is_home, match_date, location, status, home_score, away_score, competition_id, team_id, notes, opponent_logo_url, competitions(name), teams(name)")
      .single();

    if (error || !data) {
      toast({ title: t.common.error, description: error?.message ?? t.matchesPage.toastSommerfestSyncFailed, variant: "destructive" });
      return null;
    }

    const match = data as unknown as Match;
    setSommerfestDbMatches((prev) => new Map(prev).set(template.id, match));
    return match;
  };

  const openSommerfestMatch = async (template: SommerfestMatch) => {
    setOpeningSommerfestId(template.id);
    try {
      const dbMatch = await upsertSommerfestDbMatch(template);
      const viewMatch = sommerfestTemplateToDashboardMatch(template, teams, dbMatch ?? undefined) as Match;
      await openMatchDetail(viewMatch);
    } finally {
      setOpeningSommerfestId(null);
    }
  };

  const handlePublishSommerfestTournament = async () => {
    if (!clubId || !canEditSommerfestSchedule) return;
    setPublishingSommerfest(true);
    try {
      const { matches: published } = await publishSommerfestTournament(supabase, clubId, teams);
      const map = new Map<string, Match>();
      for (const row of published) {
        const templateId = extractSommerfestMatchIdFromNotes(row.notes);
        if (templateId) map.set(templateId, row as unknown as Match);
      }
      setSommerfestDbMatches(map);
      const { data: compData } = await supabase.from("competitions").select("*").eq("club_id", clubId);
      if (compData) setCompetitions(compData as Competition[]);
      setMatchesRetryTick((tick) => tick + 1);
      toast({ title: t.sommerfest2026.publishTournamentDone });
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setPublishingSommerfest(false);
    }
  };

  const handleSommerfestQuickStatus = async (status: "in_progress" | "completed") => {
    if (!selectedMatch || !clubId) return;
    if (!denyUnlessCanManageMatch(selectedMatch, t.matchesPage.toastTrainerOnlyResults)) return;

    let matchId = selectedMatch.id;
    if (isSommerfestTemplateOnlyMatch(selectedMatch)) {
      const templateId =
        selectedMatch.sommerfestTemplateId ?? extractSommerfestMatchIdFromNotes(selectedMatch.notes);
      const template = SOMMERFEST_MATCHES.find((row) => row.id === templateId);
      if (!template) return;
      const persisted = await upsertSommerfestDbMatch(template);
      if (!persisted) return;
      matchId = persisted.id;
    }

    const { data, error } = await supabase
      .from("matches")
      .update({ status })
      .eq("id", matchId)
      .eq("club_id", clubId)
      .select("*, competitions(name), teams(name)")
      .single();

    if (error || !data) {
      toast({ title: t.common.error, description: error?.message ?? t.matchesPage.toastSommerfestSyncFailed, variant: "destructive" });
      return;
    }

    const updated = data as unknown as Match;
    setEditStatus(status);
    setSelectedMatch(updated);
    const templateId = extractSommerfestMatchIdFromNotes(updated.notes);
    if (templateId) {
      setSommerfestDbMatches((prev) => new Map(prev).set(templateId, updated));
    }
    setMatches((prev) => prev.map((match) => (match.id === updated.id ? updated : match)));
  };

  const openMatchDetail = async (match: Match) => {
    setSelectedMatch(match);
    setHomeScore(match.home_score?.toString() || "");
    setAwayScore(match.away_score?.toString() || "");
    setEditOpponent(match.opponent);
    setEditIsHome(match.is_home);
    setEditMatchDate(matchDatetimeLocalValue(match));
    setEditLocation(match.location ?? "");
    setEditTeamId(match.team_id ?? "");
    setEditCompId(match.competition_id ?? "");
    setEditStatus(match.status);
    setEditOpponentLogoUrl(match.opponent_logo_url ?? null);
    setLoadingDetail(true);
    setLineupTab("events");
    setOpenPanels({ details: true, score: true, timeline: false, voting: false, ai: true });

    if (isSommerfestTemplateOnlyMatch(match)) {
      setMatchEvents([]);
      setMembers([]);
      setLineup([]);
      setLoadingDetail(false);
      return;
    }

    const [evRes, memRes, lineupRes] = await Promise.all([
      supabase.from("match_events").select("*").eq("match_id", match.id).order("minute"),
      supabase
        .from("club_memberships")
        .select("id, user_id, club_id, role, status, team, age_group, position, created_at, updated_at, profiles!club_memberships_profile_fk(display_name)")
        .eq("club_id", clubId!)
        .eq("status", "active")
        .limit(MATCH_DETAIL_ROSTER_FETCH_CAP),
      supabase.from("match_lineups").select("*").eq("match_id", match.id),
    ]);
    setMatchEvents((evRes.data as MatchEvent[]) || []);
    setMembers(((memRes.data ?? []) as unknown as Membership[]));
    setLineup((lineupRes.data as LineupPlayer[]) || []);
    setLoadingDetail(false);
  };

  const applyPersistedMatchUpdate = (updated: Match) => {
    const templateId = extractSommerfestMatchIdFromNotes(updated.notes);
    if (templateId) {
      setSommerfestDbMatches((prev) => new Map(prev).set(templateId, updated));
    }
    setMatches((prev) => {
      const exists = prev.some((match) => match.id === updated.id);
      if (!exists) return prev;
      return prev.map((match) => (match.id === updated.id ? updated : match));
    });
    setSelectedMatch((current) => {
      if (!current) return current;
      if (current.id !== updated.id && current.sommerfestTemplateId !== templateId) return current;
      return {
        ...updated,
        sommerfestTemplateId: current.sommerfestTemplateId ?? templateId ?? undefined,
        isSommerfestTemplateOnly: false,
      };
    });
    setEditOpponentLogoUrl(updated.opponent_logo_url ?? null);
    setEditMatchDate(matchDatetimeLocalValue(updated));
  };

  const resolveSelectedMatchId = async (): Promise<string | null> => {
    if (!selectedMatch || !clubId) return null;
    if (!isSommerfestTemplateOnlyMatch(selectedMatch)) return selectedMatch.id;
    const templateId =
      selectedMatch.sommerfestTemplateId ?? extractSommerfestMatchIdFromNotes(selectedMatch.notes);
    const template = SOMMERFEST_MATCHES.find((row) => row.id === templateId);
    if (!template) return null;
    const persisted = await upsertSommerfestDbMatch(template);
    return persisted?.id ?? null;
  };

  const persistOpponentLogoForSelectedMatch = async (url: string | null): Promise<boolean> => {
    if (!selectedMatch || !clubId || !canManageSelectedMatch) return false;
    const matchId = await resolveSelectedMatchId();
    if (!matchId) return false;

    const { data, error } = await supabase
      .from("matches")
      .update({ opponent_logo_url: url })
      .eq("club_id", clubId)
      .eq("id", matchId)
      .select("*, competitions(name), teams(name)")
      .single();

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return false;
    }

    applyPersistedMatchUpdate(data as unknown as Match);
    return true;
  };

  const handleEditOpponentLogoChange = async (url: string | null) => {
    setEditOpponentLogoUrl(url);
    const saved = await persistOpponentLogoForSelectedMatch(url);
    if (saved) {
      toast({ title: t.matchesPage.opponentLogoSaved });
    }
  };

  const handleCreateMatch = async () => {
    const teamId = matchTeamId || null;
    if (!denyUnlessCanManageTeam(teamId, t.matchesPage.toastTrainerOnlyMatches)) return;
    if (!opponent.trim() || !matchDate || !clubId) return;
    const { data, error } = await supabase.from("matches").insert({
      club_id: clubId, opponent: opponent.trim(), is_home: isHome, match_date: matchDate,
      location: matchLocation || null, team_id: teamId, competition_id: matchCompId || null,
      opponent_logo_url: opponentLogoUrl,
    }).select("*, competitions(name), teams(name)").single();
    if (error) { toast({ title: t.common.error, description: error.message, variant: "destructive" }); return; }
    trackUsageEvent({
      eventName: "match_created",
      clubId,
      moduleKey: "matches",
      metadata: { has_team: Boolean(teamId) },
    });
    setMatchesTotalCount((previous) => previous + 1);
    if (matchesPage === 1) {
      setMatches(prev => [data as unknown as Match, ...prev].slice(0, MATCHES_PAGE_SIZE));
    }
    setShowAddMatch(false);
    setOpponent(""); setMatchDate(""); setMatchLocation(""); setMatchTeamId(""); setMatchCompId(""); setOpponentLogoUrl(null);
    toast({ title: t.matchesPage.toastMatchScheduled });
  };

  const matchesTotalPages = Math.max(1, Math.ceil(matchesTotalCount / MATCHES_PAGE_SIZE));

  const handleCreateComp = async () => {
    if (!perms.isTrainer) {
      toast({ title: t.common.notAuthorized, description: t.matchesPage.toastTrainerOnlyCompetitions, variant: "destructive" });
      return;
    }
    if (!compName.trim() || !clubId) return;
    const { data, error } = await supabase.from("competitions").insert({
      club_id: clubId, name: compName.trim(), season: compSeason || null, competition_type: compType, team_id: compTeamId || null,
    }).select().single();
    if (error) { toast({ title: t.common.error, description: error.message, variant: "destructive" }); return; }
    setCompetitions(prev => [data as Competition, ...prev]);
    setShowAddComp(false);
    setCompName(""); setCompTeamId("");
    toast({ title: t.matchesPage.toastCompetitionCreated });
  };

  const handleUpdateResult = async () => {
    if (!selectedMatch) return;
    if (!denyUnlessCanManageMatch(selectedMatch, t.matchesPage.toastTrainerOnlyResults)) return;
    if (!clubId) return;

    let matchId = selectedMatch.id;
    if (isSommerfestTemplateOnlyMatch(selectedMatch)) {
      const templateId =
        selectedMatch.sommerfestTemplateId ?? extractSommerfestMatchIdFromNotes(selectedMatch.notes);
      const template = SOMMERFEST_MATCHES.find((row) => row.id === templateId);
      if (!template) return;
      const persisted = await upsertSommerfestDbMatch(template);
      if (!persisted) return;
      matchId = persisted.id;
      setSelectedMatch(persisted);
    }

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: homeScore ? parseInt(homeScore) : null,
        away_score: awayScore ? parseInt(awayScore) : null,
        status: "completed",
      })
      .eq("club_id", clubId)
      .eq("id", matchId);
    if (error) { toast({ title: t.common.error, description: error.message, variant: "destructive" }); return; }
    const updated = {
      ...selectedMatch,
      id: matchId,
      home_score: parseInt(homeScore) || null,
      away_score: parseInt(awayScore) || null,
      status: "completed",
      isSommerfestTemplateOnly: false,
    };
    setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
    setSelectedMatch(updated);
    toast({ title: t.matchesPage.toastResultSaved });
  };

  const handleUpdateMatch = async () => {
    if (!selectedMatch || savingMatch) return;
    if (!denyUnlessCanManageMatch(selectedMatch, t.matchesPage.toastTrainerOnlyEdit)) return;
    const nextTeamId = editTeamId || null;
    if (
      !isSommerfestLinkedMatch(selectedMatch) &&
      !denyUnlessCanManageTeam(nextTeamId, t.matchesPage.toastTrainerOnlyEdit)
    ) {
      return;
    }
    if (!editOpponent.trim() || !editMatchDate || !clubId) return;

    setSavingMatch(true);
    try {
      const matchId = await resolveSelectedMatchId();
      if (!matchId) return;

      const { data, error } = await supabase
        .from("matches")
        .update({
          opponent: editOpponent.trim(),
          is_home: editIsHome,
          match_date: matchDateForPersist(selectedMatch, editMatchDate),
          location: editLocation.trim() || null,
          team_id: nextTeamId,
          competition_id: editCompId || null,
          status: editStatus,
          opponent_logo_url: editOpponentLogoUrl,
        })
        .eq("club_id", clubId)
        .eq("id", matchId)
        .select("*, competitions(name), teams(name)")
        .single();

      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        return;
      }

      applyPersistedMatchUpdate(data as unknown as Match);
      toast({ title: t.matchesPage.toastMatchUpdated });
      setSelectedMatch(null);
    } finally {
      setSavingMatch(false);
    }
  };

  const handleAddMatchEvent = async () => {
    if (!selectedMatch || !evType || isSommerfestTemplateOnlyMatch(selectedMatch)) return;
    if (!denyUnlessCanManageMatch(selectedMatch, t.matchesPage.toastTrainerOnlyTimeline)) return;
    const { data, error } = await supabase.from("match_events").insert({
      match_id: selectedMatch.id, event_type: evType,
      membership_id: evMemberId || null, minute: evMinute ? parseInt(evMinute) : null,
    }).select().single();
    if (error) { toast({ title: t.common.error, description: error.message, variant: "destructive" }); return; }
    setMatchEvents(prev => [...prev, data as MatchEvent]);
    setEvMemberId(""); setEvMinute("");
    toast({ title: t.matchesPage.toastEventRecorded });
  };

  const handleAddToLineup = async () => {
    if (!selectedMatch || !addLineupMemberId || isSommerfestTemplateOnlyMatch(selectedMatch)) return;
    if (!denyUnlessCanManageMatch(selectedMatch, t.matchesPage.toastTrainerOnlyLineups)) return;
    if (lineup.some(l => l.membership_id === addLineupMemberId)) {
      toast({ title: t.matchesPage.toastAlreadyInLineup, variant: "destructive" }); return;
    }
    const { data, error } = await supabase.from("match_lineups").insert({
      match_id: selectedMatch.id, membership_id: addLineupMemberId,
      is_starter: addLineupStarter, position: addLineupPosition || null,
      jersey_number: addLineupJersey ? parseInt(addLineupJersey) : null,
    }).select().single();
    if (error) { toast({ title: t.common.error, description: error.message, variant: "destructive" }); return; }
    setLineup(prev => [...prev, data as LineupPlayer]);
    setAddLineupMemberId(""); setAddLineupPosition(""); setAddLineupJersey("");
    toast({ title: addLineupStarter ? t.matchesPage.toastStarterAdded : t.matchesPage.toastSubstituteAdded });
  };

  const handleRemoveFromLineup = async (id: string) => {
    if (!selectedMatch) return;
    if (!denyUnlessCanManageMatch(selectedMatch, t.matchesPage.toastTrainerOnlyLineups)) return;
    await supabase
      .from("match_lineups")
      .delete()
      .eq("match_id", selectedMatch.id)
      .eq("id", id);
    setLineup(prev => prev.filter(l => l.id !== id));
  };

  const handleToggleStarter = async (player: LineupPlayer) => {
    if (!selectedMatch) return;
    if (!denyUnlessCanManageMatch(selectedMatch, t.matchesPage.toastTrainerOnlyLineups)) return;
    await supabase
      .from("match_lineups")
      .update({ is_starter: !player.is_starter })
      .eq("match_id", selectedMatch.id)
      .eq("id", player.id);
    setLineup(prev => prev.map(l => l.id === player.id ? { ...l, is_starter: !l.is_starter } : l));
  };

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={t.matchesPage.title}
        subtitle={t.matchesPage.subtitle}
        toolbarRevision={String(canManageMatches)}
        rightSlot={
          canManageMatches ? (
            <DashboardToolbarActions
              maxVisibleMobile={2}
              actions={[
                {
                  id: "competition",
                  label: t.matchesPage.btnCompetition,
                  icon: Plus,
                  variant: "outline",
                  onClick: () => setShowAddComp(true),
                },
                {
                  id: "match",
                  label: t.matchesPage.btnMatch,
                  icon: Plus,
                  variant: "gold",
                  onClick: () => {
                    setOpponentLogoUrl(null);
                    setShowAddMatch(true);
                  },
                },
              ]}
            />
          ) : null
        }
      />

      <div className={DASHBOARD_PAGE_INNER_SM}>
        <DashboardIosSegmentTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "matches", label: t.matchesPage.tabMatches, icon: Trophy },
            { id: "competitions", label: t.matchesPage.tabCompetitions, icon: Award },
            { id: "standings", label: t.matchesPage.tabStandings, icon: Target },
          ]}
        />
      </div>

      <div className={DASHBOARD_PAGE_INNER}>
        {(clubLoading || loading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !clubId ? (
          <div className="text-center py-20 text-muted-foreground">{t.communicationPage.noClubFound}</div>
        ) : tab === "matches" ? (
          <div className="mx-auto max-w-4xl space-y-6">
            {showHighlight || showSommerfest || perms.isAdmin ? (
              <>
                {showHighlight ? <SommerfestHero variant="matches" highlight={eventsHighlight} /> : null}
                {perms.isAdmin && user && clubId ? (
                  <EventsHighlightAdmin
                    clubId={clubId}
                    userId={user.id}
                    value={eventsHighlight}
                    onSaved={setEventsHighlight}
                  />
                ) : null}
                {showSommerfest ? (
                <>
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">{t.sommerfest2026.scheduleTitle}</h2>
                      <p className="text-sm text-muted-foreground">{t.sommerfest2026.scheduleSubtitle}</p>
                    </div>
                    {canEditSommerfestSchedule ? (
                      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                          disabled={publishingSommerfest}
                          onClick={() => void handlePublishSommerfestTournament()}
                        >
                          {publishingSommerfest ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Radio className="mr-2 h-4 w-4" />
                          )}
                          {t.sommerfest2026.publishTournamentForFans}
                        </Button>
                        {publicTournamentUrl ? (
                          <a
                            href={publicTournamentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t.sommerfest2026.publicTournamentLink}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {canEditSommerfestSchedule ? (
                    <p className="text-xs text-muted-foreground">
                      {t.sommerfest2026.publishTournamentHint}
                      {sommerfestFullyPublished
                        ? ` · ${sommerfestPublishedCount}/${SOMMERFEST_MATCHES.length} ${t.sommerfest2026.matchPlural}`
                        : sommerfestPublishedCount > 0
                          ? ` · ${sommerfestPublishedCount}/${SOMMERFEST_MATCHES.length} ${t.sommerfest2026.matchPlural}`
                          : ""}
                    </p>
                  ) : null}
                  <SommerfestMatchSchedule
                    teams={teams}
                    dbMatches={sommerfestDbMatches}
                    interactive
                    onMatchClick={(template) => void openSommerfestMatch(template)}
                  />
                  {openingSommerfestId ? (
                    <p className="text-xs text-muted-foreground">{t.matchesPage.openingSommerfestMatch}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t.matchesPage.sommerfestClickHint}</p>
                  )}
                </div>
                <div className="border-t border-border pt-2">
                  <h3 className="mb-3 font-display text-base font-semibold text-foreground">
                    {t.sommerfest2026.regularMatchesTitle}
                  </h3>
                </div>
                </>
                ) : null}
              </>
            ) : null}
            <div className="max-w-3xl mx-auto space-y-4">
            {matchesListError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t.common.error}</AlertTitle>
                <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">
                    {matchesListError}
                    {isTransientSupabaseMessage(matchesListError) ? " You can try again in a moment." : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 w-fit border-destructive/40"
                    onClick={() => {
                      setMatchesListError(null);
                      setMatchesRetryTick((n) => n + 1);
                    }}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <div className="rounded-xl bg-card border border-border px-3 py-2 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {matchesTotalCount === 0
                  ? "Showing 0 matches"
                  : `Showing ${(matchesPage - 1) * MATCHES_PAGE_SIZE + 1}-${Math.min(matchesPage * MATCHES_PAGE_SIZE, matchesTotalCount)} of ${matchesTotalCount}`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={matchesPage <= 1}
                  onClick={() => setMatchesPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">{matchesPage}/{matchesTotalPages}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={matchesPage >= matchesTotalPages}
                  onClick={() => setMatchesPage((current) => Math.min(matchesTotalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
            {/* Form Streak */}
            {matches.length > 0 && (
             <div className="rounded-2xl glass-card p-4">
                <FormStreak matches={matches} count={10} />
              </div>
            )}
            {matches.length === 0 ? (
              <div className="rounded-2xl glass-card p-8 text-center text-muted-foreground text-[13px]">No matches scheduled.</div>
            ) : matches.map((m, i) => (
               <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                className="rounded-2xl glass-card p-5 cursor-pointer hover:border-primary/20 transition-all duration-200 haptic-press"
                onClick={() => openMatchDetail(m)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatMatchHeadline(m, teams)}
                    </span>
                    {m.teams?.name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {resolveCanonicalYouthTeamName(teams, m.teams.name)}
                      </span>
                    )}
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
          </div>
        ) : tab === "competitions" ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex flex-wrap gap-2">
              {COMPETITION_TYPE_FILTERS.map((filter) => {
                const label =
                  filter === "all"
                    ? t.matchesPage.filterAllTypes
                    : competitionTypeLabel(filter);
                const active = competitionTypeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setCompetitionTypeFilter(filter)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border bg-card/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {filteredCompetitions.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {competitions.length === 0
                  ? t.matchesPage.emptyCompetitions
                  : t.matchesPage.emptyCompetitionsFilter}
              </div>
            ) : (
              filteredCompetitions.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-foreground">{c.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{competitionScopeLabel(c.team_id)}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        c.competition_type === "tournament"
                          ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {competitionTypeLabel(c.competition_type)}
                    </span>
                  </div>
                  {c.season ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.matchesPage.seasonLabel.replace("{season}", c.season)}
                    </p>
                  ) : null}
                </motion.div>
              ))
            )}
          </div>
        ) : (
          /* Standings */
          <div className="mx-auto max-w-2xl space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] text-muted-foreground">
                {t.matchesPage.standingsCompetition}
              </label>
              <Select value={standingCompetitionId} onValueChange={setStandingCompetitionId}>
                <SelectTrigger className="h-10 w-full rounded-xl border-border bg-card px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">{t.matchesPage.standingsAllCompetitions}</SelectItem>
                  {competitions.map((competition) => (
                    <SelectItem key={competition.id} value={competition.id}>
                      {competition.name}
                      {competition.competition_type
                        ? ` · ${competitionTypeLabel(competition.competition_type)}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {standingLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : standings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {t.matchesPage.standingsEmpty}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-left">{t.matchesPage.standingsColTeam}</th>
                      <th className="px-2 py-3 text-center">{t.matchesPage.standingsColP}</th>
                      <th className="px-2 py-3 text-center">{t.matchesPage.standingsColW}</th>
                      <th className="px-2 py-3 text-center">{t.matchesPage.standingsColD}</th>
                      <th className="px-2 py-3 text-center">{t.matchesPage.standingsColL}</th>
                      <th className="px-2 py-3 text-center">{t.matchesPage.standingsColGF}</th>
                      <th className="px-2 py-3 text-center">{t.matchesPage.standingsColGA}</th>
                      <th className="px-2 py-3 text-center">{t.matchesPage.standingsColGD}</th>
                      <th className="px-2 py-3 text-center font-semibold text-primary">
                        {t.matchesPage.standingsColPts}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr key={s.key} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{s.team}</td>
                        <td className="px-2 py-3 text-center text-muted-foreground">{s.p}</td>
                        <td className="px-2 py-3 text-center text-muted-foreground">{s.w}</td>
                        <td className="px-2 py-3 text-center text-muted-foreground">{s.d}</td>
                        <td className="px-2 py-3 text-center text-muted-foreground">{s.l}</td>
                        <td className="px-2 py-3 text-center text-muted-foreground">{s.gf}</td>
                        <td className="px-2 py-3 text-center text-muted-foreground">{s.ga}</td>
                        <td className="px-2 py-3 text-center text-muted-foreground">{s.gd}</td>
                        <td className="px-2 py-3 text-center font-bold text-primary">{s.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Match Modal */}
      {showAddMatch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddMatch(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">Schedule Match</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddMatch(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder={t.matchesPage.phOpponent} value={opponent} onChange={e => setOpponent(e.target.value)} className="bg-background" maxLength={200} />
              {clubId ? (
                <OpponentLogoField clubId={clubId} value={opponentLogoUrl} onChange={setOpponentLogoUrl} />
              ) : null}
              <div className="flex gap-2">
                <Button size="sm" variant={isHome ? "default" : "outline"} onClick={() => setIsHome(true)} className={isHome ? "bg-gradient-gold-static text-primary-foreground" : ""}>Home</Button>
                <Button size="sm" variant={!isHome ? "default" : "outline"} onClick={() => setIsHome(false)} className={!isHome ? "bg-gradient-gold-static text-primary-foreground" : ""}>Away</Button>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Date & Time *</label>
                <Input type="datetime-local" value={matchDate} onChange={e => setMatchDate(e.target.value)} className="bg-background" />
              </div>
              <Input placeholder="Location" value={matchLocation} onChange={e => setMatchLocation(e.target.value)} className="bg-background" />
              <Select value={matchTeamId || "__none"} onValueChange={(value) => setMatchTeamId(value === "__none" ? "" : value)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No team</SelectItem>
                  {manageableTeams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={matchCompId || "__none"} onValueChange={(value) => setMatchCompId(value === "__none" ? "" : value)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No competition</SelectItem>
                  {competitions.map((competition) => <SelectItem key={competition.id} value={competition.id}>{competition.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateMatch} disabled={!opponent.trim() || !matchDate}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">Schedule Match</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Competition Modal */}
      {showAddComp && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddComp(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-card border border-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">{t.matchesPage.modalNewCompetition}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddComp(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder={t.matchesPage.phCompetitionName} value={compName} onChange={e => setCompName(e.target.value)} className="bg-background" maxLength={200} />
              <Input placeholder={t.matchesPage.phSeason} value={compSeason} onChange={e => setCompSeason(e.target.value)} className="bg-background" />
              <Select value={compType} onValueChange={setCompType}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="league">{t.matchesPage.typeLeague}</SelectItem>
                  <SelectItem value="cup">{t.matchesPage.typeCup}</SelectItem>
                  <SelectItem value="tournament">{t.matchesPage.typeTournament}</SelectItem>
                  <SelectItem value="friendly">{t.matchesPage.typeFriendly}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={compTeamId || "__all"} onValueChange={(value) => setCompTeamId(value === "__all" ? "" : value)}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border bg-background px-3 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">{t.matchesPage.scopeAllTeams}</SelectItem>
                  {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateComp} disabled={!compName.trim()}
                className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110">{t.matchesPage.createCompetition}</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedMatch(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex w-full max-w-[95vw] flex-col overflow-hidden rounded-2xl border border-border bg-card sm:max-w-lg max-h-[90vh]"
            onClick={e => e.stopPropagation()}>
            <div className="shrink-0 border-b border-border px-6 pb-4 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-foreground">
                    {formatMatchHeadline(selectedMatch, teams)}
                  </h3>
                  <div className={`mt-1 ${DASHBOARD_TYPE_MICRO} leading-relaxed`}>
                    {new Date(selectedMatch.match_date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {selectedMatch.location ? ` · ${selectedMatch.location}` : ""}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedMatch(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {canManageSelectedMatch && isSommerfestLinkedMatch(selectedMatch) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedMatch.status !== "in_progress" && selectedMatch.status !== "completed" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-700 dark:text-red-300"
                      onClick={() => void handleSommerfestQuickStatus("in_progress")}
                    >
                      <Radio className="mr-2 h-4 w-4" />
                      {t.sommerfest2026.btnKickOff}
                    </Button>
                  ) : null}
                  {selectedMatch.status === "in_progress" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSommerfestQuickStatus("completed")}
                    >
                      {t.sommerfest2026.btnFullTime}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {canManageSelectedMatch ? (
              <div className="rounded-2xl glass-card p-4 mb-4">
                <button
                  type="button"
                  onClick={() => setOpenPanels((p) => ({ ...p, details: !p.details }))}
                  className="w-full flex items-center justify-between"
                >
                  <h4 className="text-xs font-semibold text-muted-foreground">{t.matchesPage.sectionMatchDetails}</h4>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openPanels.details ? "rotate-180" : ""}`} />
                </button>

                {openPanels.details && (
                  <div className="mt-3 min-w-0 space-y-3">
                    <Input
                      placeholder={t.matchesPage.phOpponent}
                      value={editOpponent}
                      onChange={(e) => setEditOpponent(e.target.value)}
                      className={MATCH_DETAIL_FIELD_CLASS}
                      maxLength={200}
                    />
                    {clubId ? (
                      <OpponentLogoField
                        clubId={clubId}
                        value={editOpponentLogoUrl}
                        onChange={(url) => void handleEditOpponentLogoChange(url)}
                      />
                    ) : null}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={editIsHome ? "default" : "outline"}
                        onClick={() => setEditIsHome(true)}
                        className={editIsHome ? "bg-gradient-gold-static text-primary-foreground" : ""}
                      >
                        {t.matchesPage.homeVenue}
                      </Button>
                      <Button
                        size="sm"
                        variant={!editIsHome ? "default" : "outline"}
                        onClick={() => setEditIsHome(false)}
                        className={!editIsHome ? "bg-gradient-gold-static text-primary-foreground" : ""}
                      >
                        {t.matchesPage.awayVenue}
                      </Button>
                    </div>
                    <div className="w-full min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block">{t.matchesPage.labelDateTime}</label>
                      <Input
                        type="datetime-local"
                        value={editMatchDate}
                        onChange={(e) => setEditMatchDate(e.target.value)}
                        className={MATCH_DETAIL_FIELD_CLASS}
                      />
                    </div>
                    <Input
                      placeholder={t.matchesPage.phLocation}
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className={MATCH_DETAIL_FIELD_CLASS}
                    />
                    <Select value={editTeamId || "__none"} onValueChange={(value) => setEditTeamId(value === "__none" ? "" : value)}>
                      <SelectTrigger className={MATCH_DETAIL_FIELD_CLASS}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">{t.matchesPage.noTeam}</SelectItem>
                        {selectedMatchTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={editCompId || "__none"} onValueChange={(value) => setEditCompId(value === "__none" ? "" : value)}>
                      <SelectTrigger className={MATCH_DETAIL_FIELD_CLASS}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">{t.matchesPage.noCompetition}</SelectItem>
                        {competitions.map((competition) => (
                          <SelectItem key={competition.id} value={competition.id}>
                            {competition.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="w-full min-w-0">
                      <label className="mb-1.5 block text-[10px] text-muted-foreground">
                        {t.matchesPage.labelStatus}
                      </label>
                      <div
                        role="group"
                        aria-label={t.matchesPage.labelStatus}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                      >
                        {MATCH_STATUS_OPTIONS.map((status) => {
                          const selected = editStatus === status;
                          const label =
                            status === "scheduled"
                              ? t.matchesPage.statusScheduled
                              : status === "in_progress"
                                ? t.matchesPage.statusInProgress
                                : status === "completed"
                                  ? t.matchesPage.statusCompleted
                                  : t.matchesPage.statusCancelled;
                          return (
                            <Button
                              key={status}
                              type="button"
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              aria-pressed={selected}
                              onClick={() => setEditStatus(status)}
                              className={`h-10 min-h-10 touch-manipulation px-2 text-xs leading-tight sm:text-sm ${
                                selected ? "bg-gradient-gold-static text-primary-foreground hover:brightness-110" : ""
                              }`}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-gold-static text-primary-foreground hover:brightness-110"
                      onClick={() => void handleUpdateMatch()}
                      disabled={!editOpponent.trim() || !editMatchDate || savingMatch}
                    >
                      {savingMatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t.matchesPage.btnSaveMatch}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Score */}
            <div className="rounded-2xl glass-card p-4 mb-4">
              <button
                type="button"
                onClick={() => setOpenPanels((p) => ({ ...p, score: !p.score }))}
                className="w-full flex items-center justify-between"
              >
                <h4 className="text-xs font-semibold text-muted-foreground">RESULT</h4>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openPanels.score ? "rotate-180" : ""}`} />
              </button>

              {openPanels.score && (
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">Home</label>
                  <Input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)} className="bg-card text-center text-lg font-bold" min="0" disabled={!canManageSelectedMatch} />
                </div>
                <span className="text-xl font-bold text-muted-foreground hidden sm:inline mt-4">:</span>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">Away</label>
                  <Input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)} className="bg-card text-center text-lg font-bold" min="0" disabled={!canManageSelectedMatch} />
                </div>
                {canManageSelectedMatch ? (
                  <Button size="sm" className="bg-gradient-gold-static text-primary-foreground hover:brightness-110 sm:mt-4 w-full sm:w-auto" onClick={handleUpdateResult}>Save</Button>
                ) : null}
              </div>
              )}
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Sub-tabs: Events / Lineup */}
                <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
                  <button onClick={() => setLineupTab("events")}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${lineupTab === "events" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                    Match Events
                  </button>
                  <button onClick={() => setLineupTab("lineup")}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${lineupTab === "lineup" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                    Lineup ({lineup.length})
                  </button>
                  {lineupTab === "lineup" && lineup.length > 0 && (
                    <div className="ml-auto flex items-center pb-2">
                      <LineupExport
                        matchTitle={formatMatchHeadline(selectedMatch, teams)}
                        matchDate={selectedMatch.match_date}
                        location={selectedMatch.location}
                        starters={lineup.filter(l => l.is_starter)}
                        substitutes={lineup.filter(l => !l.is_starter)}
                        getMemberName={(mid) => {
                          const player = members.find(m => m.id === mid);
                          return player?.profiles?.display_name || "Player";
                        }}
                      />
                    </div>
                  )}
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
                              <span className="text-foreground">{player?.profiles?.display_name || ""}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="rounded-xl bg-background border border-border p-3 space-y-2">
                      <h5 className="text-xs font-semibold text-muted-foreground">ADD EVENT</h5>
                      {canManageSelectedMatch ? (
                      <div className="flex gap-2 flex-wrap">
                        <Select value={evType} onValueChange={setEvType}>
                          <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border bg-card px-2 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="goal">⚽ Goal</SelectItem>
                            <SelectItem value="assist">🅰️ Assist</SelectItem>
                            <SelectItem value="yellow_card">🟨 Yellow</SelectItem>
                            <SelectItem value="red_card">🟥 Red</SelectItem>
                            <SelectItem value="substitution_in">🔄 Sub In</SelectItem>
                            <SelectItem value="substitution_out">🔄 Sub Out</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={evMemberId || "__none"} onValueChange={(value) => setEvMemberId(value === "__none" ? "" : value)}>
                          <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border bg-card px-2 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Player</SelectItem>
                            {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.profiles?.display_name || "Member"}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" placeholder="Min" value={evMinute} onChange={e => setEvMinute(e.target.value)}
                          className="w-16 h-8 bg-card text-xs text-center" min="0" max="120" />
                        <Button size="sm" className="h-8 bg-gradient-gold-static text-primary-foreground hover:brightness-110" onClick={handleAddMatchEvent}>+</Button>
                      </div>
                      ) : (
                        <p className={DASHBOARD_TYPE_MICRO}>{t.matchesPage.readOnlyMatchHint}</p>
                      )}
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
                                <span className="font-medium text-foreground">{player?.profiles?.display_name || "Player"}</span>
                                {l.position && <span className="text-muted-foreground">({l.position})</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                {canManageSelectedMatch ? (
                                  <>
                                    <button onClick={() => handleToggleStarter(l)} className="text-[10px] text-muted-foreground hover:text-foreground px-1">→ Sub</button>
                                    <button onClick={() => handleRemoveFromLineup(l.id)} className="text-destructive hover:text-destructive/80 px-1"><X className="w-3 h-3" /></button>
                                  </>
                                ) : null}
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
                                <span className="font-medium text-foreground">{player?.profiles?.display_name || "Player"}</span>
                                {l.position && <span className="text-muted-foreground">({l.position})</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                {canManageSelectedMatch ? (
                                  <>
                                    <button onClick={() => handleToggleStarter(l)} className="text-[10px] text-muted-foreground hover:text-foreground px-1">→ Start</button>
                                    <button onClick={() => handleRemoveFromLineup(l.id)} className="text-destructive hover:text-destructive/80 px-1"><X className="w-3 h-3" /></button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add to lineup */}
                    {canManageSelectedMatch ? (
                    <div className="rounded-xl bg-background border border-border p-3 space-y-2 mt-4">
                      <h5 className="text-xs font-semibold text-muted-foreground">ADD TO LINEUP</h5>
                      <div className="flex gap-2 flex-wrap">
                        <Select value={addLineupMemberId || "__none"} onValueChange={(value) => setAddLineupMemberId(value === "__none" ? "" : value)}>
                          <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl border-border bg-card px-2 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Select player</SelectItem>
                            {members.filter((member) => !lineup.some((lineupMember) => lineupMember.membership_id === member.id)).map((member) => (
                              <SelectItem key={member.id} value={member.id}>{member.profiles?.display_name || "Member"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input placeholder={t.matchesPage.phPosition} value={addLineupPosition} onChange={e => setAddLineupPosition(e.target.value)}
                          className="w-16 h-8 bg-card text-xs text-center" />
                        <Input type="number" placeholder={t.matchesPage.phJersey} value={addLineupJersey} onChange={e => setAddLineupJersey(e.target.value)}
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
                        <Button size="sm" className="h-8 bg-gradient-gold-static text-primary-foreground hover:brightness-110" onClick={handleAddToLineup} disabled={!addLineupMemberId}>+</Button>
                      </div>
                    </div>
                    ) : null}
                  </>
                )}

                {/* Match Timeline */}
                <div className="rounded-2xl glass-card p-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setOpenPanels((p) => ({ ...p, timeline: !p.timeline }))}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="text-sm font-display font-semibold text-foreground">Timeline</div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openPanels.timeline ? "rotate-180" : ""}`} />
                  </button>
                  {openPanels.timeline && (
                    <div className="mt-3">
                      <MatchTimeline events={matchEvents} getMemberName={(mid) => {
                        const player = members.find(m => m.id === mid);
                        return player?.profiles?.display_name || "Player";
                      }} />
                    </div>
                  )}
                </div>

                {/* Player of the Match Voting */}
                <div className="rounded-2xl glass-card p-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setOpenPanels((p) => ({ ...p, voting: !p.voting }))}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="text-sm font-display font-semibold text-foreground">Player of the match</div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openPanels.voting ? "rotate-180" : ""}`} />
                  </button>
                  {openPanels.voting && (
                    <div className="mt-3">
                      <MatchVoting matchId={selectedMatch.id} matchStatus={selectedMatch.status} members={members} />
                    </div>
                  )}
                </div>

                {/* AI Match Analysis */}
                <div className="rounded-2xl glass-card p-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setOpenPanels((p) => ({ ...p, ai: !p.ai }))}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="text-sm font-display font-semibold text-foreground">
                      <BrandedText text={t.matchesPage.sectionAi4TAnalysis} />
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openPanels.ai ? "rotate-180" : ""}`} />
                  </button>
                  {openPanels.ai && (
                    <div className="mt-3">
                      <AIMatchAnalysis
                        clubId={clubId!}
                        matchId={selectedMatch.id}
                        matchData={{
                          opponent: selectedMatch.opponent, is_home: selectedMatch.is_home,
                          date: selectedMatch.match_date, home_score: selectedMatch.home_score,
                          away_score: selectedMatch.away_score,
                          events: matchEvents.map(e => ({
                            type: e.event_type, minute: e.minute,
                            player: members.find(m => m.id === e.membership_id)?.profiles?.display_name || null,
                          })),
                        }}
                        matchStatus={selectedMatch.status}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Matches;
