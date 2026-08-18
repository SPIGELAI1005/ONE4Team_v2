import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  Bot,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Building2,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { BrandedText, Ai4TInlineLabel } from "@/components/ai/Ai4TBrand";
const AnalyticsWidgets = lazy(() => import("@/components/dashboard/AnalyticsWidgets"));
import AchievementBadges from "@/components/dashboard/AchievementBadges";
import LiveMatchTicker from "@/components/dashboard/LiveMatchTicker";
import { TasksSummaryCard } from "@/components/dashboard/TasksSummaryCard";
import { MyDuesCard } from "@/components/dashboard/MyDuesCard";
import { MarketplaceDashboardCards } from "@/components/dashboard/MarketplaceDashboardCards";
import AdminNotificationSender from "@/components/dashboard/AdminNotificationSender";
import { Ai4tAdminUsageCard } from "@/components/dashboard/Ai4tAdminUsageCard";
import { Ai4tValueMetricsCard } from "@/components/dashboard/Ai4tValueMetricsCard";
import { ParentNextTrainingRsvpCard } from "@/components/dashboard/ParentNextTrainingRsvpCard";
import { FoundingClubStatusCard } from "@/components/billing/FoundingClubStatusCard";
import { GraceWriteBanner } from "@/components/billing/GraceWriteBanner";
import { AdminWeekAtAGlanceCard } from "@/components/dashboard/AdminWeekAtAGlanceCard";
import { TrainerTodaySessionCard } from "@/components/dashboard/TrainerTodaySessionCard";
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import SeasonProgressionChart from "@/components/analytics/SeasonProgressionChart";
import TeamChemistry from "@/components/analytics/TeamChemistry";
import NaturalLanguageStats from "@/components/ai/NaturalLanguageStats";
import SeasonAwards from "@/components/analytics/SeasonAwards";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { useActiveClub } from "@/hooks/use-active-club";
import {
  fetchAdminDashboardSnapshot,
  fetchClubSetupProfile,
  fetchClubWideDashboardUpcoming,
  fetchDashboardUpcoming,
  fetchTeamScopedDashboardSnapshot,
  fetchTeamScopedDashboardUpcoming,
  type AdminDashboardSnapshot,
  type ClubSetupProfile,
} from "@/lib/club-dashboard-snapshot";
import {
  DASHBOARD_CARD,
  DASHBOARD_KPI_GRID,
  DASHBOARD_PAGE_INNER,
  DASHBOARD_PAGE_ROOT,
  DASHBOARD_TYPE_CAPTION,
  DASHBOARD_TYPE_MICRO,
  DASHBOARD_TYPE_SECTION_TITLE,
} from "@/lib/dashboard-page-shell";
import { getDashboardSections } from "@/lib/dashboard-section-visibility";
import {
  defaultDashboardPersonaSlug,
  isClubFinanceDashboardRole,
  isDashboardPersonaAllowed,
  isOpsAdminDashboardRole,
  isTeamScopedSportsDashboardRole,
} from "@/lib/dashboard-persona";
import { isExternalRole, normalizeDashboardRole } from "@/lib/rbac-config";
import { usePermissions } from "@/hooks/use-permissions";
import { useModuleDataScope } from "@/hooks/use-module-data-scope";
import {
  fetchClubFinancialSnapshot,
  formatMoneyFromCents,
} from "@/lib/club-financial-snapshot";

type UpcomingItem = {
  title: string;
  time: string;
  type: string;
};

type Kpi = { id: string; label: string; value: string; change: string; icon: React.ElementType };

type RoleConfig = {
  title: string;
  greeting: string;
  kpis: Kpi[];
};

type RegistrationTrack = "club_admin" | "partner";

type RegistrationSummary = {
  registration_track?: RegistrationTrack;
  club_setup?: {
    clubName?: string;
    clubType?: string;
    country?: string;
  };
  partner_setup?: {
    companyName?: string;
    partnerType?: string;
    country?: string;
  };
};

function parseRegistrationSummary(raw: unknown): RegistrationSummary | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as RegistrationSummary;
}

function formatClubTypeLabel(
  raw: string | null | undefined,
  clubTypeOptions: Record<string, string>,
): string | null {
  if (!raw?.trim()) return null;
  const key = raw.trim();
  return clubTypeOptions[key] ?? key;
}

const DashboardContent = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const perms = usePermissions();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeClubId, activeClub } = useActiveClub();
  const [firstName, setFirstName] = useState<string>("");

  // Fetch user's first name for the dashboard greeting
  useEffect(() => {
    if (!user) return;
    const fetchName = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();
        const displayName = (data as Record<string, unknown> | null)?.display_name as string | null;
        if (displayName) {
          setFirstName(displayName.split(" ")[0]);
        } else {
          const emailLocal = user.email?.split("@")[0] || "";
          setFirstName(emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1));
        }
      } catch {
        const emailLocal = user.email?.split("@")[0] || "";
        setFirstName(emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1));
      }
    };
    fetchName();
  }, [user]);

  const roleConfig: Record<string, RoleConfig> = useMemo(
    () => ({
      admin: {
        title: t.dashboard.clubAdminDashboard,
        greeting: t.dashboard.welcomeBackAdmin,
        kpis: [
          { id: "totalMembers", label: t.dashboard.totalMembers, value: "-", change: "", icon: Users },
          { id: "activeTeams", label: t.dashboard.activeTeams, value: "-", change: "", icon: Trophy },
          { id: "upcoming", label: t.dashboard.upcoming, value: "-", change: "", icon: Calendar },
          { id: "unpaidDues", label: t.financial.outstanding, value: "-", change: "", icon: TrendingUp },
        ],
      },
      club_admin: {
        title: t.dashboard.clubAdminDashboard,
        greeting: t.dashboard.welcomeBackAdmin,
        kpis: [
          { id: "totalMembers", label: t.dashboard.totalMembers, value: "-", change: "", icon: Users },
          { id: "activeTeams", label: t.dashboard.activeTeams, value: "-", change: "", icon: Trophy },
          { id: "upcoming", label: t.dashboard.upcoming, value: "-", change: "", icon: Calendar },
          { id: "unpaidDues", label: t.financial.outstanding, value: "-", change: "", icon: TrendingUp },
        ],
      },
      team_management: {
        title: t.dashboard.teamManagementDashboard,
        greeting: t.dashboard.welcomeBackOps,
        kpis: [
          { id: "totalMembers", label: t.dashboard.totalMembers, value: "-", change: "", icon: Users },
          { id: "activeTeams", label: t.dashboard.activeTeams, value: "-", change: "", icon: Trophy },
          { id: "trainingsNext7d", label: t.dashboard.trainingsNext7d, value: "-", change: "", icon: Calendar },
          { id: "upcoming", label: t.dashboard.upcoming, value: "-", change: "", icon: Clock },
        ],
      },
      team_staff: {
        title: t.dashboard.teamStaffDashboard,
        greeting: t.dashboard.welcomeBackCoach,
        kpis: [
          { id: "myPlayers", label: t.dashboard.myPlayers, value: "-", change: "", icon: Users },
          { id: "sessionsThisWeek", label: t.dashboard.sessionsThisWeek, value: "-", change: "", icon: Calendar },
          { id: "nextMatch", label: t.dashboard.nextMatch, value: "-", change: "", icon: Trophy },
          { id: "upcoming", label: t.dashboard.upcoming, value: "-", change: "", icon: Clock },
        ],
      },
      trainer: {
        title: t.dashboard.trainerDashboard,
        greeting: t.dashboard.welcomeBackCoach,
        kpis: [
          { id: "myPlayers", label: t.dashboard.myPlayers, value: "-", change: "", icon: Users },
          { id: "sessionsThisWeek", label: t.dashboard.sessionsThisWeek, value: "-", change: "", icon: Calendar },
          { id: "attendanceRate", label: t.dashboard.attendanceRate, value: "-", change: "", icon: Activity },
          { id: "nextMatch", label: t.dashboard.nextMatch, value: "-", change: "", icon: Trophy },
        ],
      },
      player: {
        title: t.dashboard.playerDashboard,
        greeting: t.dashboard.welcomeBack,
        kpis: [
          { id: "nextTraining", label: t.dashboard.nextTraining, value: "-", change: "", icon: Calendar },
          { id: "nextMatch", label: t.dashboard.nextMatch, value: "-", change: "", icon: Trophy },
          { id: "upcoming", label: t.dashboard.upcoming, value: "-", change: "", icon: Clock },
          { id: "clubEvents", label: t.dashboard.clubEvents, value: "-", change: "", icon: Activity },
        ],
      },
      parent_supporter: {
        title: t.dashboard.parentDashboard,
        greeting: t.dashboard.welcomeBack,
        kpis: [
          { id: "nextTraining", label: t.dashboard.nextTraining, value: "-", change: "", icon: Calendar },
          { id: "nextMatch", label: t.dashboard.nextMatch, value: "-", change: "", icon: Trophy },
          { id: "upcoming", label: t.dashboard.upcoming, value: "-", change: "", icon: Clock },
          { id: "clubEvents", label: t.dashboard.clubEvents, value: "-", change: "", icon: Activity },
        ],
      },
      member: {
        title: t.dashboard.dashboardTitle,
        greeting: t.dashboard.welcomeBack,
        kpis: [
          { id: "clubEvents", label: t.dashboard.clubEvents, value: "-", change: "", icon: Calendar },
          { id: "upcoming", label: t.dashboard.upcoming, value: "-", change: "", icon: Clock },
          { id: "messages", label: t.dashboard.messages, value: "-", change: "", icon: Users },
        ],
      },
      sponsor: {
        title: t.dashboard.partnerDashboard,
        greeting: t.dashboard.welcome,
        kpis: [
          { id: "clubEvents", label: t.dashboard.clubEvents, value: "-", change: "", icon: Calendar },
          { id: "contacts", label: t.dashboard.contacts, value: "-", change: "", icon: Users },
          { id: "messages", label: t.dashboard.messages, value: "-", change: "", icon: Clock },
          { id: "insights", label: t.dashboard.insights, value: "-", change: "", icon: Bot },
        ],
      },
    }),
    [t]
  );

  const defaultConfig: RoleConfig = useMemo(
    () => ({
      title: t.dashboard.dashboardTitle,
      greeting: t.dashboard.welcome,
      kpis: [
        { id: "upcoming", label: t.dashboard.upcoming, value: "-", change: "", icon: Calendar },
        { id: "totalMembers", label: t.dashboard.totalMembers, value: "-", change: "", icon: Users },
      ],
    }),
    [t]
  );

  const config = roleConfig[role || ""] || defaultConfig;

  const [kpis, setKpis] = useState<Kpi[]>(config.kpis);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [adminSnapshot, setAdminSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [clubSetupProfile, setClubSetupProfile] = useState<ClubSetupProfile | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const sections = useMemo(() => getDashboardSections(role), [role]);
  const normalizedRole = useMemo(() => normalizeDashboardRole(role), [role]);
  const trainingScope = useModuleDataScope("trainings");
  const scopedTeamIds = trainingScope.teamIds;
  const isOpsAdminPersona = isOpsAdminDashboardRole(normalizedRole);
  const isClubFinancePersona = isClubFinanceDashboardRole(normalizedRole);
  const isTeamScopedSportsPersona = isTeamScopedSportsDashboardRole(normalizedRole);
  const externalPersona = useMemo(
    () => isExternalRole(normalizedRole),
    [normalizedRole],
  );

  useEffect(() => {
    if (!role || perms.activeClubLoading || perms.assignmentsLoading) return;
    const urlRole = normalizeDashboardRole(role);
    if (!urlRole) return;
    const personaCtx = { treatAsClubAdmin: perms.isAdmin };

    if (isDashboardPersonaAllowed(urlRole, perms.role, perms.assignments, personaCtx)) {
      localStorage.setItem("one4team.activeRole", urlRole);
      return;
    }

    const fallback = defaultDashboardPersonaSlug(perms.role, perms.assignments, personaCtx);
    const normFallback = normalizeDashboardRole(fallback);
    if (urlRole === normFallback) {
      localStorage.setItem("one4team.activeRole", normFallback);
      return;
    }
    localStorage.setItem("one4team.activeRole", normFallback);
    navigate(`/dashboard/${normFallback}`, { replace: true });
  }, [
    role,
    perms.role,
    perms.assignments,
    perms.isAdmin,
    perms.activeClubLoading,
    perms.assignmentsLoading,
    navigate,
  ]);

  useEffect(() => {
    setKpis(config.kpis);
  }, [config.kpis]);

  useEffect(() => {
    if (!activeClubId) {
      setUpcoming([]);
      setAdminSnapshot(null);
      setClubSetupProfile(null);
      setAiInsights([]);
      setKpis(config.kpis);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setDashboardLoading(true);
      try {
        if (externalPersona) {
          setClubSetupProfile(null);
          setAdminSnapshot(null);
          setUpcoming([]);
          setAiInsights([t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3]);
          setKpis((prev) =>
            prev.map((k) => ({
              ...k,
              value: "-",
              change: "",
            })),
          );
          return;
        }

        const profilePromise = fetchClubSetupProfile(activeClubId);

        if (normalizedRole === "member") {
          const [schedule, profile] = await Promise.all([
            fetchClubWideDashboardUpcoming(activeClubId, 7),
            profilePromise,
          ]);
          if (cancelled) return;

          setClubSetupProfile(profile);
          setAdminSnapshot(null);
          setUpcoming(
            schedule.map((item) => ({
              title: item.title,
              time: item.time,
              type: item.type,
            })),
          );
          setAiInsights([t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3]);
          setKpis((prev) =>
            prev.map((k) => {
              if (k.id === "clubEvents" || k.id === "upcoming") {
                return { ...k, value: String(schedule.length) };
              }
              return { ...k, value: "-", change: "" };
            }),
          );
          return;
        }

        if (isOpsAdminPersona) {
          const [snapshot, schedule, profile, financial] = await Promise.all([
            fetchAdminDashboardSnapshot(activeClubId),
            fetchDashboardUpcoming(activeClubId, 7),
            profilePromise,
            isClubFinancePersona ? fetchClubFinancialSnapshot(activeClubId) : Promise.resolve(null),
          ]);
          if (cancelled) return;

          setClubSetupProfile(profile);
          setAdminSnapshot(snapshot);
          setUpcoming(
            schedule.map((item) => ({
              title: item.title,
              time: item.time,
              type: item.type,
            })),
          );

          const pendingNote =
            snapshot.pendingDrafts > 0
              ? t.dashboard.pendingDraftsKpiNote.replace("{count}", String(snapshot.pendingDrafts))
              : "";

          setKpis((prev) =>
            prev.map((k) => {
              if (k.id === "totalMembers") {
                return {
                  ...k,
                  value: String(snapshot.membersActive + snapshot.pendingDrafts),
                  change: pendingNote,
                };
              }
              if (k.id === "activeTeams") return { ...k, value: String(snapshot.teamsCount) };
              if (k.id === "trainingsNext7d") return { ...k, value: String(snapshot.trainingsNext7d) };
              if (k.id === "upcoming") return { ...k, value: String(snapshot.upcomingCount7d) };
              if (k.id === "unpaidDues" && financial) {
                return {
                  ...k,
                  value: formatMoneyFromCents(financial.outstandingTotalCents, financial.currency),
                  change:
                    financial.overduePaymentCount + financial.overdueDuesCount > 0
                      ? t.financial.overdueItemsCount.replace(
                          "{count}",
                          String(financial.overduePaymentCount + financial.overdueDuesCount),
                        )
                      : "",
                };
              }
              return k;
            }),
          );

          const insights: string[] = [];
          if (snapshot.pendingDrafts > 0) {
            insights.push(
              t.dashboard.aiInsightPendingDrafts.replace("{count}", String(snapshot.pendingDrafts)),
            );
          }
          if (normalizedRole === "team_management") {
            insights.push(
              t.dashboard.aiInsightOpsOverview
                .replace("{members}", String(snapshot.membersActive))
                .replace("{teams}", String(snapshot.teamsCount))
                .replace("{trainings}", String(snapshot.trainingsNext7d)),
            );
          } else if (snapshot.teamsCount > 0) {
            insights.push(
              t.dashboard.aiInsightTeamsMatches
                .replace("{teams}", String(snapshot.teamsCount))
                .replace("{matches}", String(snapshot.upcomingMatches)),
            );
          }
          if (isClubFinancePersona && financial && financial.outstandingTotalCents > 0) {
            insights.push(
              t.financial.aiInsightOutstanding.replace(
                "{amount}",
                formatMoneyFromCents(financial.outstandingTotalCents, financial.currency),
              ),
            );
          } else if (isClubFinancePersona && snapshot.unpaidDues > 0) {
            insights.push(
              t.dashboard.aiInsightUnpaidDues.replace("{count}", String(snapshot.unpaidDues)),
            );
          }
          if (snapshot.trainingsNext7d > 0 && normalizedRole === "team_management") {
            insights.push(
              t.dashboard.aiInsightTrainingsNext7d.replace("{count}", String(snapshot.trainingsNext7d)),
            );
          }
          if (snapshot.completedMatches > 0) {
            insights.push(
              t.dashboard.aiInsightLogMatches.replace("{count}", String(snapshot.completedMatches)),
            );
          }
          if (insights.length === 0) {
            insights.push(t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3);
          }
          setAiInsights(insights);
          return;
        }

        if (isTeamScopedSportsPersona) {
          const teamIds = scopedTeamIds;
          const [snapshot, schedule, profile] = await Promise.all([
            fetchTeamScopedDashboardSnapshot(activeClubId, teamIds),
            fetchTeamScopedDashboardUpcoming(activeClubId, teamIds, 7, true),
            profilePromise,
          ]);
          if (cancelled) return;

          setClubSetupProfile(profile);
          setAdminSnapshot(null);
          setUpcoming(
            schedule.map((item) => ({
              title: item.title,
              time: item.time,
              type: item.type,
            })),
          );

          setKpis((prev) =>
            prev.map((k) => {
              if (k.id === "myPlayers") return { ...k, value: String(snapshot.rosterCount) };
              if (k.id === "sessionsThisWeek") return { ...k, value: String(snapshot.sessionsThisWeek) };
              if (k.id === "nextTraining") {
                return { ...k, value: snapshot.nextTrainingLabel ?? "-" };
              }
              if (k.id === "nextMatch") {
                return { ...k, value: snapshot.nextMatchLabel ?? "-" };
              }
              if (k.id === "upcoming") return { ...k, value: String(schedule.length) };
              if (k.id === "clubEvents") return { ...k, value: String(snapshot.clubEvents7d) };
              if (k.id === "matchesPlayed") return { ...k, value: String(snapshot.completedMatches) };
              return k;
            }),
          );

          const insights: string[] = [];
          if (snapshot.sessionsThisWeek > 0) {
            insights.push(
              t.dashboard.aiInsightTrainingsNext7d.replace("{count}", String(snapshot.sessionsThisWeek)),
            );
          }
          if (snapshot.upcomingMatches > 0) {
            insights.push(
              t.dashboard.aiInsightTeamsMatches
                .replace("{teams}", teamIds === "all" ? "—" : String(teamIds.length))
                .replace("{matches}", String(snapshot.upcomingMatches)),
            );
          }
          if (insights.length === 0) {
            insights.push(t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3);
          }
          setAiInsights(insights);
          return;
        }

        const [schedule, profile] = await Promise.all([
          fetchDashboardUpcoming(activeClubId, 7),
          profilePromise,
        ]);
        if (cancelled) return;

        setClubSetupProfile(profile);
        setAdminSnapshot(null);
        setUpcoming(
          schedule.map((item) => ({
            title: item.title,
            time: item.time,
            type: item.type,
          })),
        );
        setAiInsights([t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3]);
        setKpis((prev) =>
          prev.map((k) => {
            if (k.id === "upcoming") return { ...k, value: String(schedule.length) };
            return { ...k, value: "-", change: "" };
          }),
        );
      } catch {
        if (!cancelled) {
          setUpcoming([]);
          setAiInsights([t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3]);
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    activeClubId,
    config.kpis,
    externalPersona,
    isClubFinancePersona,
    isOpsAdminPersona,
    isTeamScopedSportsPersona,
    normalizedRole,
    role,
    scopedTeamIds,
    t,
  ]);

  const showGettingStarted = useMemo(() => {
    if (!activeClubId) return true;
    if (isOpsAdminPersona && adminSnapshot) {
      const hasPeople = adminSnapshot.membersActive > 0 || adminSnapshot.pendingDrafts > 0;
      const hasSchedule =
        adminSnapshot.upcomingCount7d > 0 || adminSnapshot.upcomingMatches > 0;
      return !hasPeople || !hasSchedule;
    }
    if (role === "trainer" || role === "team_staff") {
      return upcoming.length === 0;
    }
    return false;
  }, [activeClubId, adminSnapshot, isOpsAdminPersona, role, upcoming.length]);

  const registrationSummary = useMemo(() => {
    const fromMetadata = parseRegistrationSummary((user?.user_metadata as Record<string, unknown> | undefined) ?? null);
    if (fromMetadata?.registration_track) return fromMetadata;

    try {
      const raw = localStorage.getItem("one4team.registrationSummary");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      const summary = parseRegistrationSummary(parsed);
      return summary?.registration_track ? summary : null;
    } catch {
      return null;
    }
  }, [user?.user_metadata]);

  const showClubSetup = useMemo(() => {
    if (externalPersona) {
      return registrationSummary?.registration_track === "partner";
    }
    if (isOpsAdminPersona && activeClubId) return true;
    return Boolean(registrationSummary?.registration_track);
  }, [activeClubId, externalPersona, isOpsAdminPersona, registrationSummary]);

  const clubSetupDisplay = useMemo(() => {
    const isClubAdmin =
      registrationSummary?.registration_track !== "partner" || Boolean(clubSetupProfile || activeClub);

    if (!isClubAdmin) {
      return {
        track: "partner" as const,
        companyName: registrationSummary?.partner_setup?.companyName || "-",
        partnerType:
          formatClubTypeLabel(
            registrationSummary?.partner_setup?.partnerType,
            t.onboarding.partnerTypeOptions,
          ) || "-",
        country: registrationSummary?.partner_setup?.country || "-",
      };
    }

    const clubName =
      clubSetupProfile?.name ||
      activeClub?.name ||
      registrationSummary?.club_setup?.clubName ||
      "-";
    const clubType =
      formatClubTypeLabel(clubSetupProfile?.clubCategory, t.onboarding.clubTypeOptions) ||
      formatClubTypeLabel(registrationSummary?.club_setup?.clubType, t.onboarding.clubTypeOptions) ||
      "-";
    const location =
      clubSetupProfile?.address ||
      registrationSummary?.club_setup?.country ||
      "-";
    const website = clubSetupProfile?.website || registrationSummary?.club_setup?.website || null;

    let publicPageStatus = t.dashboard.clubSetupStatusPrivate;
    if (clubSetupProfile?.isPublic) {
      publicPageStatus = clubSetupProfile.publicPagePublishedAt
        ? t.dashboard.clubSetupStatusPublished.replace("{slug}", clubSetupProfile.slug)
        : t.dashboard.clubSetupStatusPublicDraft;
    }

    const teamsMembers =
      adminSnapshot && isOpsAdminPersona
        ? `${adminSnapshot.teamsCount} · ${adminSnapshot.membersActive + adminSnapshot.pendingDrafts}`
        : null;

    return {
      track: "club_admin" as const,
      clubName,
      clubType,
      location,
      website,
      publicPageStatus,
      teamsMembers,
      slug: clubSetupProfile?.slug || activeClub?.slug || null,
      timezone: clubSetupProfile?.timezone || null,
    };
  }, [activeClub, adminSnapshot, clubSetupProfile, isOpsAdminPersona, registrationSummary, t]);

  const dashboardGreeting = `${t.dashboard.welcomeBack}${firstName ? `, ${firstName}` : ""}${activeClub?.name ? ` · ${activeClub.name}` : ""}`;

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot title={config.title} greeting={dashboardGreeting} showBack={false} />

      <div className={`${DASHBOARD_PAGE_INNER} space-y-5 max-lg:space-y-6`}>
        {showGettingStarted && (role === "trainer" || role === "team_staff" || isOpsAdminPersona) && (
          <div className="rounded-2xl glass-card p-5">
            <div className="font-display font-semibold text-foreground text-[15px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />{" "}
              {isOpsAdminPersona
                ? isClubFinancePersona
                  ? t.dashboard.gettingStartedAdmin
                  : t.dashboard.gettingStartedOps
                : t.dashboard.gettingStarted}
            </div>
            <div className="mt-3 grid gap-2 text-[13px] text-muted-foreground">
              <div>
                1) <Link className="text-foreground hover:underline" to="/members">{t.dashboard.invitePlayersLink}</Link>
              </div>
              <div>
                2) <Link className="text-foreground hover:underline" to="/activities">{t.dashboard.scheduleTheWeek}</Link>
              </div>
              <div>
                3) {t.dashboard.trackConfirmations} <Link className="text-foreground hover:underline" to="/activities">{t.dashboard.schedule}</Link>
              </div>
              <div>
                4) {t.dashboard.afterSession} <Link className="text-foreground hover:underline" to="/matches">{t.dashboard.matches}</Link>
              </div>
            </div>
          </div>
        )}

        {showClubSetup && sections.clubSetup ? (
          <div className="rounded-2xl glass-card p-5 border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                {clubSetupDisplay.track === "club_admin" ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <Briefcase className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-foreground text-[15px]">
                  {t.dashboard.registrationSummaryTitle}
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {t.dashboard.registrationSummaryDesc}
                </p>
                <div className="mt-3 text-[12px] text-foreground/85 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  {clubSetupDisplay.track === "club_admin" ? (
                    <>
                      <span>{t.onboarding.clubName}: {clubSetupDisplay.clubName}</span>
                      <span>{t.onboarding.clubType}: {clubSetupDisplay.clubType}</span>
                      <span>{t.dashboard.clubSetupLocation}: {clubSetupDisplay.location}</span>
                      <span>{t.dashboard.clubSetupPublicPage}: {clubSetupDisplay.publicPageStatus}</span>
                      {clubSetupDisplay.teamsMembers ? (
                        <span>
                          {t.dashboard.clubSetupTeamsMembers}: {clubSetupDisplay.teamsMembers}
                        </span>
                      ) : null}
                      {clubSetupDisplay.website ? (
                        <span>
                          {t.dashboard.clubSetupWebsite}:{" "}
                          <a
                            href={clubSetupDisplay.website.startsWith("http") ? clubSetupDisplay.website : `https://${clubSetupDisplay.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {clubSetupDisplay.website}
                          </a>
                        </span>
                      ) : null}
                      {clubSetupDisplay.timezone ? (
                        <span>{t.dashboard.clubSetupTimezone}: {clubSetupDisplay.timezone}</span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span>{t.onboarding.companyName}: {clubSetupDisplay.companyName}</span>
                      <span>{t.onboarding.partnerType}: {clubSetupDisplay.partnerType}</span>
                      <span>{t.onboarding.country}: {clubSetupDisplay.country}</span>
                    </>
                  )}
                </div>
                {clubSetupDisplay.track === "club_admin" && clubSetupDisplay.slug ? (
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                    <a
                      href={`/club/${clubSetupDisplay.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t.dashboard.clubSetupViewPage}
                    </a>
                    {isOpsAdminPersona ? (
                      <Link
                        to="/club-page-admin"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t.dashboard.clubSetupManagePage}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
                <p className="text-[11px] text-muted-foreground mt-3">
                  {t.onboarding.professionalInfoNotice}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {sections.liveMatchTicker ? <LiveMatchTicker /> : null}

        <GraceWriteBanner />
        <FoundingClubStatusCard />

        {normalizedRole === "player" ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{t.dashboard.playerDashboardHint}</p>
        ) : null}

        {normalizedRole === "parent_supporter" ? (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.dashboard.parentDashboardHint}</p>
            <ParentNextTrainingRsvpCard clubId={activeClubId} />
          </>
        ) : null}

        {sections.weekAtAGlance && isOpsAdminPersona ? (
          <AdminWeekAtAGlanceCard hideFinance={!isClubFinancePersona} />
        ) : null}

        {sections.trainerToday && (role === "trainer" || role === "team_staff") ? (
          <TrainerTodaySessionCard teamIds={scopedTeamIds} />
        ) : null}

        {sections.tasksSummary ? <TasksSummaryCard /> : null}

        {sections.myDues ? <MyDuesCard /> : null}

        {sections.marketplaceCards ? <MarketplaceDashboardCards /> : null}

        {/* KPIs - hidden for external provider personas (marketplace cards only) */}
        {!externalPersona ? (
        <div className={DASHBOARD_KPI_GRID}>
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
              className={`${DASHBOARD_CARD} haptic-press cursor-default min-w-0`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-9 h-9 max-lg:w-10 max-lg:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <kpi.icon className="w-4 h-4 max-lg:w-[18px] max-lg:h-[18px] text-primary" strokeWidth={1.5} />
                </div>
                {kpi.change ? (
                  <span className={`${DASHBOARD_TYPE_MICRO} font-medium text-primary flex items-center gap-0.5 ios-pill bg-primary/8 border-primary/20 px-2 py-0.5 shrink-0 max-w-[55%] text-right leading-snug`}>
                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                    {kpi.change}
                  </span>
                ) : null}
              </div>
              <div className="text-base sm:text-xl lg:text-2xl font-display font-bold text-foreground tracking-tight break-words [overflow-wrap:anywhere] line-clamp-3 min-w-0">
                {dashboardLoading && kpi.value === "-" ? "…" : kpi.value}
              </div>
              <div className={`${DASHBOARD_TYPE_CAPTION} mt-1 break-words`}>{kpi.label}</div>
            </motion.div>
          ))}
        </div>
        ) : null}

        {sections.financialSummary && isClubFinancePersona ? <FinancialSummary compact /> : null}

        {sections.analyticsWidgets ? (
          <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-muted/40" />}>
            <AnalyticsWidgets />
          </Suspense>
        ) : null}
        {sections.seasonProgression ? <SeasonProgressionChart /> : null}
        {sections.teamChemistry ? <TeamChemistry /> : null}
        {sections.achievementBadges ? <AchievementBadges /> : null}
        {sections.naturalLanguageStats && !isOpsAdminPersona ? <NaturalLanguageStats /> : null}

        {sections.ai4teamWeeklyDigest && !isOpsAdminPersona ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">
                <Ai4TInlineLabel text={t.dashboard.ai4teamWeeklySummary} logoClassName="h-4 w-4" />
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">{t.dashboard.ai4teamWeeklySummaryDesc}</div>
            </div>
            <Link
              to={`/co-trainer?tab=chat&prompt=${encodeURIComponent(
                "Create a weekly leadership digest for our club with top priorities, risks, and owner actions for the next 7 days.",
              )}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-gold-static px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 shrink-0"
            >
              <Ai4TInlineLabel text={t.dashboard.ai4teamWeeklySummary} showLogo={false} />
            </Link>
          </div>
        ) : null}

        {sections.seasonAwards ? <SeasonAwards /> : null}

        {sections.adminNotificationSender && !isOpsAdminPersona ? <AdminNotificationSender /> : null}

        {isOpsAdminPersona && activeClubId ? (
          <div className="min-w-0 space-y-4 rounded-3xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-foreground">
                <Ai4TInlineLabel text={t.dashboard.ai4tControlCenterTitle} logoClassName="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t.dashboard.ai4tControlCenterDesc}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className={`lg:col-span-2 ${DASHBOARD_CARD}`}>
                <NaturalLanguageStats />
              </div>
              <div className={`${DASHBOARD_CARD} relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                <h2 className={`${DASHBOARD_TYPE_SECTION_TITLE} mb-4 relative`}>
                  <Ai4TInlineLabel
                    text={t.dashboard.aiInsights}
                    logoClassName="h-4 w-4"
                    textClassName="font-display font-bold"
                  />
                </h2>
                <div className="space-y-2.5 relative">
                  {(aiInsights.length ? aiInsights : [t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3]).map((s, i) => (
                    <motion.div
                      key={i}
                      whileTap={{ scale: 0.98 }}
                      className="text-[13px] text-muted-foreground p-3 rounded-xl bg-primary/5 border border-primary/8 leading-relaxed cursor-default"
                    >
                      {s}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {sections.ai4teamWeeklyDigest ? (
                <div className="rounded-2xl border border-primary/20 bg-background/80 p-4 lg:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      <Ai4TInlineLabel text={t.dashboard.ai4teamWeeklySummary} logoClassName="h-4 w-4" />
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{t.dashboard.ai4teamWeeklySummaryDesc}</div>
                  </div>
                  <Link
                    to={`/co-trainer?tab=chat&prompt=${encodeURIComponent(
                      "Create a weekly leadership digest for our club with top priorities, risks, and owner actions for the next 7 days.",
                    )}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-gold-static px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 shrink-0"
                  >
                    <Ai4TInlineLabel text={t.dashboard.ai4teamWeeklySummary} showLogo={false} />
                  </Link>
                </div>
              ) : (
                <div className="lg:col-span-2" />
              )}
              {sections.adminNotificationSender ? <AdminNotificationSender /> : null}
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <Ai4tAdminUsageCard />
              <Ai4tValueMetricsCard />
            </div>
          </div>
        ) : null}

        {sections.upcomingAndAi ? (
        <div className={isOpsAdminPersona ? "grid grid-cols-1 gap-5" : "grid lg:grid-cols-3 gap-5"}>
          {/* Upcoming */}
          <div className={isOpsAdminPersona ? DASHBOARD_CARD : `lg:col-span-2 ${DASHBOARD_CARD}`}>
            <h2 className={`${DASHBOARD_TYPE_SECTION_TITLE} mb-4 flex items-center gap-2`}>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              </div>
              {t.dashboard.upcoming}
            </h2>
            <div className="space-y-1">
              {upcoming.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t.dashboard.noUpcoming}</div>
              ) : (
                upcoming.map((event, i) => (
                <motion.div
                  key={`${event.title}-${event.time}-${i}`}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-default"
                >
                  <div>
                    <div className="text-sm max-lg:text-[15px] font-medium text-foreground">{event.title}</div>
                    <div className={`${DASHBOARD_TYPE_MICRO} mt-0.5`}>{event.time}</div>
                  </div>
                  <span
                    className={`ios-pill ${
                      event.type === "match"
                        ? "bg-accent/10 text-accent border-accent/20"
                        : event.type === "training"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {event.type}
                  </span>
                </motion.div>
                ))
              )}
            </div>
          </div>

          {!isOpsAdminPersona ? (
            <div className={`${DASHBOARD_CARD} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
              <h2 className={`${DASHBOARD_TYPE_SECTION_TITLE} mb-4 relative`}>
                <Ai4TInlineLabel
                  text={t.dashboard.aiInsights}
                  logoClassName="h-4 w-4"
                  textClassName="font-display font-bold"
                />
              </h2>
              <div className="space-y-2.5 relative">
                {(aiInsights.length ? aiInsights : [t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3]).map((s, i) => (
                  <motion.div
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    className="text-[13px] text-muted-foreground p-3 rounded-xl bg-primary/5 border border-primary/8 leading-relaxed cursor-default"
                  >
                    {s}
                  </motion.div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        ) : null}

        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />{" "}
          {activeClubId ? t.dashboard.liveClubData : t.dashboard.bestEffort}
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
