import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useAuth } from "@/contexts/useAuth";
import { useActiveClub } from "@/hooks/use-active-club";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { trackEvent } from "@/lib/telemetry";
import {
  CLUB_PUBLIC_PAGE_ROW_SELECT,
  getClubPageDraftConfig,
  mergeClubRowWithPublicPageConfig,
  mergeRowWithEffectivePublished,
  parseClubPublicPageConfig,
} from "@/lib/club-public-page-config";
import {
  redactEventForPrivacy,
  redactMatchScoresForPrivacy,
  redactSessionLocationForPrivacy,
  redactSessionTimesForPrivacy,
} from "@/lib/public-club-privacy";
import {
  isMissingRelationError,
  mapClubRow,
  type PublicClubRecord,
  type PublicPartnerLite,
  type TeamRowLite,
  type TrainingSessionRowLite,
  type EventRowLite,
  type NewsRowLite,
  type PublicMatchLite,
  type ShopProductLite,
} from "@/lib/public-club-models";

interface PublicClubContextValue {
  clubSlug: string;
  searchSuffix: string;
  club: PublicClubRecord | null;
  loading: boolean;
  loadingData: boolean;
  teams: TeamRowLite[];
  /** Count of coaches with `show_on_public_website` per team (public microsite only). */
  publicCoachCountByTeamId: Record<string, number>;
  sessions: TrainingSessionRowLite[];
  events: EventRowLite[];
  news: NewsRowLite[];
  shopProducts: ShopProductLite[];
  publicMatches: PublicMatchLite[];
  /** Upcoming matches (`match_date` in the future), sorted ascending. */
  publicMatchesUpcoming: PublicMatchLite[];
  publicPartners: PublicPartnerLite[];
  memberCount: number;
  user: ReturnType<typeof useAuth>["user"];
  isMember: boolean;
  checkingMembership: boolean;
  isPreviewMode: boolean;
  isDraftPreviewMode: boolean;
  draftPreviewBlocked: boolean;
  /** True only for club admins viewing `?draft=1` with draft loaded (never for anonymous or non-admin visitors). */
  showAdminDraftEmptyHints: boolean;
  canRequestInvite: boolean;
  showRequestInvite: boolean;
  setShowRequestInvite: (v: boolean) => void;
  reqName: string;
  setReqName: (v: string) => void;
  reqEmail: string;
  setReqEmail: (v: string) => void;
  reqMessage: string;
  setReqMessage: (v: string) => void;
  submitting: boolean;
  submitInviteRequest: () => Promise<void>;
  openDashboardOrAuth: () => void;
  goToAuthWithReturn: (path: string) => void;
  messagesCta: () => void;
  one4aiCta: () => void;
  documentsCta: () => void;
  reportsCta: () => void;
  liveScoresCta: () => void;
  reloadClub: (options?: { quiet?: boolean }) => Promise<void>;
  basePath: string;
}

const PublicClubContext = createContext<PublicClubContextValue | null>(null);

export function usePublicClub() {
  const ctx = useContext(PublicClubContext);
  if (!ctx) throw new Error("usePublicClub must be used within PublicClubProvider");
  return ctx;
}

export function PublicClubProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { clubSlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeClubId, activeClub } = useActiveClub();
  const { t } = useLanguage();

  const isPreviewMode = searchParams.get("preview") === "1";
  const isDraftPreviewMode = searchParams.get("draft") === "1";
  const searchSuffix = `${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const [club, setClub] = useState<PublicClubRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftPreviewBlocked, setDraftPreviewBlocked] = useState(false);
  const [teams, setTeams] = useState<TeamRowLite[]>([]);
  const [publicCoachCountByTeamId, setPublicCoachCountByTeamId] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState<TrainingSessionRowLite[]>([]);
  const [events, setEvents] = useState<EventRowLite[]>([]);
  const [news, setNews] = useState<NewsRowLite[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProductLite[]>([]);
  const [publicMatches, setPublicMatches] = useState<PublicMatchLite[]>([]);
  const [publicMatchesUpcoming, setPublicMatchesUpcoming] = useState<PublicMatchLite[]>([]);
  const [publicPartners, setPublicPartners] = useState<PublicPartnerLite[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [showRequestInvite, setShowRequestInvite] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const basePath = `/club/${clubSlug}`;
  const canRequestInvite = Boolean(club?.is_public && club?.micrositePrivacy.allowJoinRequestsPublic);
  const showAdminDraftEmptyHints = isDraftPreviewMode && !draftPreviewBlocked;

  const loadClub = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!clubSlug) return;
      setLoading(true);
      setDraftPreviewBlocked(false);
      const first = await supabase.from("clubs").select(CLUB_PUBLIC_PAGE_ROW_SELECT).eq("slug", clubSlug).maybeSingle();
      let record = first.data ? mergeRowWithEffectivePublished(first.data as unknown as Record<string, unknown>) : null;
      let loadError = first.error;

      if (!loadError && !record && isPreviewMode && user && activeClubId && activeClub?.slug === clubSlug) {
        const second = await supabase.from("clubs").select(CLUB_PUBLIC_PAGE_ROW_SELECT).eq("id", activeClubId).maybeSingle();
        loadError = second.error;
        record = second.data ? mergeRowWithEffectivePublished(second.data as unknown as Record<string, unknown>) : null;
      }

      if (loadError) {
        if (!options?.quiet) toast({ title: t.common.error, description: loadError.message, variant: "destructive" });
        setClub(null);
      } else if (record) {
        let displayRecord = record;
        let homepageCfg = parseClubPublicPageConfig(record.public_page_published_config);
        if (isDraftPreviewMode) {
          if (!user) {
            setDraftPreviewBlocked(true);
            if (!options?.quiet) {
              toast({
                title: t.clubPage.draftPreviewSignInTitle,
                description: t.clubPage.draftPreviewSignInDesc,
                variant: "destructive",
              });
            }
          } else {
            const { data: isAdmin, error: adminErr } = await supabase.rpc("is_club_admin", {
              _club_id: String(record.id),
              _user_id: user.id,
            });
            if (adminErr || !isAdmin) {
              setDraftPreviewBlocked(true);
              if (!options?.quiet) {
                toast({
                  title: t.clubPage.draftPreviewDeniedTitle,
                  description: t.clubPage.draftPreviewDeniedDesc,
                  variant: "destructive",
                });
              }
            } else {
              const { data: draftConfig } = await getClubPageDraftConfig(supabase, String(record.id));
              if (draftConfig) {
                displayRecord = mergeClubRowWithPublicPageConfig(displayRecord, draftConfig);
                homepageCfg = draftConfig;
              }
            }
          }
        }
        setClub(mapClubRow(displayRecord, { homepageConfig: homepageCfg }));
      } else {
        setClub(null);
      }
      setLoading(false);
    },
    [
      activeClub?.slug,
      activeClubId,
      clubSlug,
      isDraftPreviewMode,
      isPreviewMode,
      t.clubPage.draftPreviewDeniedDesc,
      t.clubPage.draftPreviewDeniedTitle,
      t.clubPage.draftPreviewSignInDesc,
      t.clubPage.draftPreviewSignInTitle,
      t.common.error,
      toast,
      user,
    ]
  );

  useEffect(() => {
    void loadClub();
  }, [loadClub]);

  useEffect(() => {
    if (!isPreviewMode || !clubSlug) return;
    const refresh = () => void loadClub({ quiet: true });
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [isPreviewMode, clubSlug, loadClub]);

  useEffect(() => {
    if (!club?.id) return;
    const run = async () => {
      if (user) {
        setCheckingMembership(true);
        const { data: membership, error: membershipError } = await supabase
          .from("club_memberships")
          .select("id")
          .eq("club_id", club.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        setIsMember(!membershipError && Boolean(membership?.id));
        setCheckingMembership(false);
      } else {
        setIsMember(false);
      }

      setLoadingData(true);
      const nowIso = new Date().toISOString();
      const sessionsPastIso = new Date(Date.now() - 2 * 86400000).toISOString();
      const catalogPastIso = new Date(Date.now() - 400 * 86400000).toISOString();
      const futureIso = new Date(Date.now() + 100 * 86400000).toISOString();

      let teamsRes = await supabase
        .from("teams")
        .select(
          "id, name, sport, age_group, coach_name, public_website_visible, public_description, public_training_schedule_visible, public_documents_visible, public_document_links"
        )
        .eq("club_id", club.id)
        .order("name");
      if (teamsRes.error && String(teamsRes.error.message ?? "").includes("public_website_visible")) {
        teamsRes = await supabase.from("teams").select("id, name, sport, age_group, coach_name").eq("club_id", club.id).order("name");
      }
      const rawTeamRows = (teamsRes.data as TeamRowLite[]) || [];
      const visibleTeams = rawTeamRows.filter((tm) => tm.public_website_visible !== false);

      const teamIds = visibleTeams.map((tm) => tm.id);
      const coachCountMap: Record<string, number> = {};
      if (teamIds.length && !teamsRes.error) {
        const coachRes = await supabase.from("team_coaches").select("team_id").eq("show_on_public_website", true).in("team_id", teamIds);
        if (!coachRes.error && coachRes.data?.length) {
          for (const row of coachRes.data as { team_id: string }[]) {
            const tid = String(row.team_id);
            coachCountMap[tid] = (coachCountMap[tid] || 0) + 1;
          }
        }
      }

      const [sessionsRes, activityTrainingsRes, eventsRes, newsRes, membersCountRes, shopRes, matchesRes, matchesUpRes, partnersRes] =
        await Promise.all([
        supabase
          .from("training_sessions")
          .select("id, title, location, starts_at, ends_at, team_id, publish_to_public_schedule, teams(name)")
          .eq("club_id", club.id)
          .gte("starts_at", sessionsPastIso)
          .lte("starts_at", futureIso)
          .order("starts_at", { ascending: true })
          .limit(160),
        supabase
          .from("activities")
          .select("id, title, location, starts_at, ends_at, team_id, publish_to_public_schedule, teams(name)")
          .eq("club_id", club.id)
          .eq("type", "training")
          .gte("starts_at", sessionsPastIso)
          .lte("starts_at", futureIso)
          .order("starts_at", { ascending: true })
          .limit(160),
        supabase
          .from("events")
          .select(
            "id, title, event_type, starts_at, ends_at, location, publish_to_public_schedule, image_url, public_summary, public_registration_enabled, registration_external_url, public_event_detail_enabled"
          )
          .eq("club_id", club.id)
          .gte("starts_at", catalogPastIso)
          .lte("starts_at", futureIso)
          .order("starts_at", { ascending: true })
          .limit(200),
        supabase
          .from("announcements")
          .select(
            "id, title, content, created_at, priority, publish_to_public_website, public_news_category, image_url, excerpt"
          )
          .eq("club_id", club.id)
          .eq("publish_to_public_website", true)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("club_memberships")
          .select("id", { count: "exact", head: true })
          .eq("club_id", club.id)
          .eq("status", "active"),
        supabaseDynamic
          .from("shop_products")
          .select("id, name, description, price_eur, image_url, image_urls, stock, is_active")
          .eq("club_id", club.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("matches")
          .select(
            "id, opponent, is_home, match_date, location, status, home_score, away_score, team_id, publish_to_public_schedule, opponent_logo_url, public_match_detail_enabled, competitions(name)"
          )
          .eq("club_id", club.id)
          .gte("match_date", catalogPastIso)
          .lte("match_date", futureIso)
          .order("match_date", { ascending: false })
          .limit(180),
        supabase
          .from("matches")
          .select(
            "id, opponent, is_home, match_date, location, status, home_score, away_score, team_id, publish_to_public_schedule, opponent_logo_url, public_match_detail_enabled, competitions(name)"
          )
          .eq("club_id", club.id)
          .gte("match_date", catalogPastIso)
          .lte("match_date", futureIso)
          .order("match_date", { ascending: true })
          .limit(180),
        supabase
          .from("partners")
          .select("id, name, partner_type, website, show_on_public_club_page")
          .eq("club_id", club.id)
          .eq("show_on_public_club_page", true)
          .order("name")
          .limit(24),
      ]);

      if (teamsRes.error) toast({ title: t.common.error, description: teamsRes.error.message, variant: "destructive" });
      if (sessionsRes.error && !isMissingRelationError(sessionsRes.error)) {
        toast({ title: t.common.error, description: sessionsRes.error.message, variant: "destructive" });
      }
      if (activityTrainingsRes.error)
        toast({ title: t.common.error, description: activityTrainingsRes.error.message, variant: "destructive" });
      if (eventsRes.error) {
        const evMsg = String(eventsRes.error.message ?? "");
        const missingEventCols =
          evMsg.includes("publish_to_public_schedule") ||
          evMsg.includes("public_summary") ||
          evMsg.includes("image_url") ||
          evMsg.includes("public_registration") ||
          evMsg.includes("registration_external") ||
          evMsg.includes("public_event_detail");
        if (!missingEventCols && !isMissingRelationError(eventsRes.error)) {
          toast({ title: t.common.error, description: eventsRes.error.message, variant: "destructive" });
        }
      }
      if (newsRes.error) {
        const msg = String(newsRes.error.message ?? "");
        const missingNewsColumns =
          msg.includes("publish_to_public_website") ||
          msg.includes("public_news_category") ||
          msg.includes("image_url") ||
          msg.includes("excerpt");
        if (!missingNewsColumns && !isMissingRelationError(newsRes.error)) {
          toast({ title: t.common.error, description: newsRes.error.message, variant: "destructive" });
        }
      }
      if (matchesRes.error) {
        const mMsg = String(matchesRes.error.message ?? "");
        const missingMatchCols =
          mMsg.includes("publish_to_public_schedule") ||
          mMsg.includes("opponent_logo_url") ||
          mMsg.includes("public_match_detail");
        if (!missingMatchCols && !isMissingRelationError(matchesRes.error)) {
          toast({ title: t.common.error, description: matchesRes.error.message, variant: "destructive" });
        }
      }
      if (matchesUpRes.error && !isMissingRelationError(matchesUpRes.error)) {
        const m2 = String(matchesUpRes.error.message ?? "");
        const missingUp =
          m2.includes("publish_to_public_schedule") ||
          m2.includes("opponent_logo_url") ||
          m2.includes("public_match_detail");
        if (!missingUp) {
          toast({ title: t.common.error, description: matchesUpRes.error.message, variant: "destructive" });
        }
      }
      if (partnersRes.error && !String(partnersRes.error.message ?? "").includes("show_on_public_club_page")) {
        toast({ title: t.common.error, description: partnersRes.error.message, variant: "destructive" });
      }

      const pv = club.micrositePrivacy;
      const teamsForUi = (teamsRes.error ? rawTeamRows : visibleTeams).map((tm) => ({
        ...tm,
        coach_name: pv.showCoachNamesPublic ? tm.coach_name : null,
      })) as TeamRowLite[];
      setTeams(teamsForUi);
      setPublicCoachCountByTeamId(coachCountMap);

      let sessionRows = sessionsRes.error && isMissingRelationError(sessionsRes.error) ? [] : (sessionsRes.data as TrainingSessionRowLite[]) || [];
      if (sessionsRes.error && String(sessionsRes.error.message ?? "").includes("publish_to_public_schedule")) {
        const rS = await supabase
          .from("training_sessions")
          .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
          .eq("club_id", club.id)
          .gte("starts_at", sessionsPastIso)
          .lte("starts_at", futureIso)
          .order("starts_at", { ascending: true })
          .limit(160);
        if (!rS.error) sessionRows = (rS.data as TrainingSessionRowLite[]) || [];
      }

      let activityRows = (activityTrainingsRes.data as TrainingSessionRowLite[]) || [];
      if (activityTrainingsRes.error && String(activityTrainingsRes.error.message ?? "").includes("publish_to_public_schedule")) {
        const rA = await supabase
          .from("activities")
          .select("id, title, location, starts_at, ends_at, team_id, teams(name)")
          .eq("club_id", club.id)
          .eq("type", "training")
          .gte("starts_at", sessionsPastIso)
          .lte("starts_at", futureIso)
          .order("starts_at", { ascending: true })
          .limit(160);
        if (!rA.error) activityRows = (rA.data as TrainingSessionRowLite[]) || [];
      }

      const fromSessions = sessionRows.map((s) => ({ ...s, source: "training_session" as const }));
      const fromActivities = activityRows.map((s) => ({
        ...s,
        source: "activity" as const,
      }));
      const sessionMerged = [...fromSessions, ...fromActivities].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
      setSessions(
        sessionMerged.map((s) =>
          redactSessionTimesForPrivacy(redactSessionLocationForPrivacy(s, pv.showTrainingLocationsPublic), pv.showTrainingTimesPublic)
        )
      );
      let eventRows = (eventsRes.data as EventRowLite[]) || [];
      if (eventsRes.error) {
        const evErr = String(eventsRes.error.message ?? "");
        const missingEventCols =
          evErr.includes("publish_to_public_schedule") ||
          evErr.includes("public_summary") ||
          evErr.includes("image_url") ||
          evErr.includes("public_registration") ||
          evErr.includes("registration_external") ||
          evErr.includes("public_event_detail");
        if (missingEventCols) {
          const retry = await supabase
            .from("events")
            .select("id, title, event_type, starts_at, ends_at, location")
            .eq("club_id", club.id)
            .gte("starts_at", catalogPastIso)
            .lte("starts_at", futureIso)
            .order("starts_at", { ascending: true })
            .limit(200);
          if (!retry.error) eventRows = (retry.data as EventRowLite[]) || [];
        }
      }
      setEvents(
        eventRows.map((e) => redactEventForPrivacy(e, pv.showTrainingLocationsPublic, pv.showTrainingTimesPublic))
      );
      const rawNews = !newsRes.error ? ((newsRes.data as NewsRowLite[]) || []) : [];
      setNews(
        pv.youthHidePublicPlayerImages
          ? rawNews.map((n) => ({ ...n, image_url: null }))
          : rawNews
      );
      setMemberCount((membersCountRes as unknown as { count: number | null }).count ?? 0);
      setShopProducts(((shopRes as unknown as { data: ShopProductLite[] | null }).data) || []);
      let matchRowsRecent = (matchesRes.data as PublicMatchLite[]) || [];
      let matchRowsUp = (matchesUpRes.data as PublicMatchLite[]) || [];
      const matchColMissing = (msg: string) =>
        msg.includes("publish_to_public_schedule") ||
        msg.includes("opponent_logo_url") ||
        msg.includes("public_match_detail");
      if (matchesRes.error && matchColMissing(String(matchesRes.error.message ?? ""))) {
        const rM = await supabase
          .from("matches")
          .select("id, opponent, is_home, match_date, location, status, home_score, away_score, team_id, competitions(name)")
          .eq("club_id", club.id)
          .gte("match_date", catalogPastIso)
          .lte("match_date", futureIso)
          .order("match_date", { ascending: false })
          .limit(180);
        if (!rM.error) matchRowsRecent = (rM.data as PublicMatchLite[]) || [];
      }
      if (matchesUpRes.error && matchColMissing(String(matchesUpRes.error.message ?? ""))) {
        const rU = await supabase
          .from("matches")
          .select("id, opponent, is_home, match_date, location, status, home_score, away_score, team_id, competitions(name)")
          .eq("club_id", club.id)
          .gte("match_date", catalogPastIso)
          .lte("match_date", futureIso)
          .order("match_date", { ascending: true })
          .limit(180);
        if (!rU.error) matchRowsUp = (rU.data as PublicMatchLite[]) || [];
      }
      const redactMatch = (m: PublicMatchLite) => redactMatchScoresForPrivacy(m, pv.showMatchResultsPublic);
      setPublicMatches(matchRowsRecent.map(redactMatch));
      setPublicMatchesUpcoming(matchRowsUp.map(redactMatch));
      setPublicPartners(
        !partnersRes.error
          ? (((partnersRes.data as { id: string; name: string; partner_type: string | null; website: string | null }[]) || []).map((r) => ({
              id: r.id,
              name: r.name,
              partner_type: r.partner_type,
              website: r.website,
            })) as PublicPartnerLite[])
          : []
      );
      setLoadingData(false);
    };
    void run();
  }, [club, t.common.error, toast, user]);

  useEffect(() => {
    if (!user) return;
    const displayName = (user.user_metadata?.display_name as string | undefined) || "";
    if (displayName && !reqName) setReqName(displayName);
    if (user.email && !reqEmail) setReqEmail(user.email);
  }, [reqEmail, reqName, user]);

  const goToAuthWithReturn = useCallback(
    (returnPath: string) => {
      navigate(`/auth?returnTo=${encodeURIComponent(returnPath)}`);
    },
    [navigate]
  );

  const openDashboardOrAuth = useCallback(() => {
    if (!club?.id) return;
    if (user) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
      const role = localStorage.getItem("one4team.activeRole") || "player";
      navigate(`/dashboard/${role}`);
    } else {
      goToAuthWithReturn(`${basePath}${searchSuffix}`);
    }
  }, [basePath, club?.id, goToAuthWithReturn, navigate, searchSuffix, user]);

  const messagesCta = useCallback(() => {
    if (!club?.id) return;
    if (user) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
      navigate("/communication");
    } else {
      goToAuthWithReturn("/communication");
    }
  }, [club?.id, goToAuthWithReturn, navigate, user]);

  const one4aiCta = useCallback(() => {
    if (!club?.id) return;
    if (user) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
      navigate("/co-trainer");
    } else {
      goToAuthWithReturn("/co-trainer");
    }
  }, [club?.id, goToAuthWithReturn, navigate, user]);

  const documentsCta = useCallback(() => {
    if (!club?.id) return;
    if (user) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
      const role = localStorage.getItem("one4team.activeRole") || "player";
      navigate(`/dashboard/${role}`);
    } else {
      goToAuthWithReturn("/dashboard/player");
    }
  }, [club?.id, goToAuthWithReturn, navigate, user]);

  const reportsCta = useCallback(() => {
    if (!club?.id) return;
    if (user) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
      navigate("/reports");
    } else {
      goToAuthWithReturn("/reports");
    }
  }, [club?.id, goToAuthWithReturn, navigate, user]);

  const liveScoresCta = useCallback(() => {
    if (!club?.id) return;
    if (user) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
      navigate("/live-scores");
    } else {
      goToAuthWithReturn("/live-scores");
    }
  }, [club?.id, goToAuthWithReturn, navigate, user]);

  const submitInviteRequest = useCallback(async () => {
    if (!club) return;
    if (!user) {
      toast({ title: t.clubPage.signInRequired, description: t.clubPage.signInBeforeJoin });
      trackEvent("club_join_auth_redirect", { clubSlug: club.slug });
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!canRequestInvite) {
      toast({ title: t.clubPage.inviteRequestsDisabled, description: t.clubPage.notAcceptingRequests });
      return;
    }
    if (!reqName.trim() || !reqEmail.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabaseDynamic.rpc("register_club_join_request", {
        _club_id: club.id,
        _name: reqName.trim(),
        _message: reqMessage.trim() || null,
        _phone: null,
        _interested_role: null,
        _interested_team: null,
        _consent: true,
        _first_name: null,
        _last_name: null,
        _website_url: null,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : null) as unknown as { outcome?: string; role?: string } | null;
      const outcome = (row?.outcome as string | undefined) || "pending";
      const role = (row?.role as string | undefined) || "member";

      if (outcome === "joined") {
        trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "joined", role });
        if (user) localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
        localStorage.setItem("one4team.activeRole", role);
        toast({ title: t.clubPage.joinApproved, description: t.clubPage.joinApprovedDesc });
        navigate(`/dashboard/${role}`);
        return;
      }
      if (outcome === "already_member") {
        trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "already_member" });
        if (user) localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
        toast({ title: t.clubPage.alreadyMember, description: t.clubPage.alreadyMemberDesc });
        navigate(`/dashboard/${localStorage.getItem("one4team.activeRole") || "player"}`);
        return;
      }

      trackEvent("club_join_outcome", { clubSlug: club.slug, outcome: "pending_review" });
      toast({ title: t.clubPage.requestSent, description: t.clubPage.requestSentDesc });
      setReqName("");
      setReqEmail(user.email || "");
      setReqMessage("");
      setShowRequestInvite(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("rate_limit") || message.includes("429")) {
        toast({
          title: t.clubPage.rateLimitReachedTitle,
          description: t.clubPage.rateLimitReachedDesc,
          variant: "destructive",
        });
      } else {
        toast({ title: t.common.error, description: message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  }, [canRequestInvite, club, navigate, reqEmail, reqMessage, reqName, t, toast, user]);

  const value = useMemo<PublicClubContextValue>(
    () => ({
      clubSlug,
      searchSuffix,
      club,
      loading,
      loadingData,
      teams,
      publicCoachCountByTeamId,
      sessions,
      events,
      news,
      shopProducts,
      publicMatches,
      publicMatchesUpcoming,
      publicPartners,
      memberCount,
      user,
      isMember,
      checkingMembership,
      isPreviewMode,
      isDraftPreviewMode,
      draftPreviewBlocked,
      showAdminDraftEmptyHints,
      canRequestInvite,
      showRequestInvite,
      setShowRequestInvite,
      reqName,
      setReqName,
      reqEmail,
      setReqEmail,
      reqMessage,
      setReqMessage,
      submitting,
      submitInviteRequest,
      openDashboardOrAuth,
      goToAuthWithReturn,
      messagesCta,
      one4aiCta,
      documentsCta,
      reportsCta,
      liveScoresCta,
      reloadClub: loadClub,
      basePath,
    }),
    [
      basePath,
      canRequestInvite,
      checkingMembership,
      club,
      clubSlug,
      documentsCta,
      draftPreviewBlocked,
      events,
      isDraftPreviewMode,
      showAdminDraftEmptyHints,
      isMember,
      isPreviewMode,
      liveScoresCta,
      loadClub,
      loading,
      loadingData,
      memberCount,
      messagesCta,
      news,
      one4aiCta,
      openDashboardOrAuth,
      goToAuthWithReturn,
      publicCoachCountByTeamId,
      publicMatches,
      publicMatchesUpcoming,
      publicPartners,
      reportsCta,
      reqEmail,
      reqMessage,
      reqName,
      searchSuffix,
      sessions,
      shopProducts,
      showRequestInvite,
      submitting,
      submitInviteRequest,
      teams,
      user,
    ]
  );

  return <PublicClubContext.Provider value={value}>{children}</PublicClubContext.Provider>;
}
