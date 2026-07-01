import { useEffect, useMemo, useState } from "react";
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
import { BrandedText } from "@/components/ai/Ai4TBrand";
import AnalyticsWidgets from "@/components/dashboard/AnalyticsWidgets";
import AchievementBadges from "@/components/dashboard/AchievementBadges";
import LiveMatchTicker from "@/components/dashboard/LiveMatchTicker";
import { TasksSummaryCard } from "@/components/dashboard/TasksSummaryCard";
import { MarketplaceDashboardCards } from "@/components/dashboard/MarketplaceDashboardCards";
import AdminNotificationSender from "@/components/dashboard/AdminNotificationSender";
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
  fetchDashboardUpcoming,
  type AdminDashboardSnapshot,
  type ClubSetupProfile,
} from "@/lib/club-dashboard-snapshot";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import { getDashboardSections } from "@/lib/dashboard-section-visibility";
import {
  defaultDashboardPersonaSlug,
  isDashboardPersonaAllowed,
} from "@/lib/dashboard-persona";
import { isExternalRole, normalizeDashboardRole } from "@/lib/rbac-config";
import { usePermissions } from "@/hooks/use-permissions";
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
          { id: "totalMembers", label: t.dashboard.totalMembers, value: "—", change: "", icon: Users },
          { id: "activeTeams", label: t.dashboard.activeTeams, value: "—", change: "", icon: Trophy },
          { id: "upcoming", label: t.dashboard.upcoming, value: "—", change: "", icon: Calendar },
          { id: "unpaidDues", label: t.financial.outstanding, value: "—", change: "", icon: TrendingUp },
        ],
      },
      club_admin: {
        title: t.dashboard.clubAdminDashboard,
        greeting: t.dashboard.welcomeBackAdmin,
        kpis: [
          { id: "totalMembers", label: t.dashboard.totalMembers, value: "—", change: "", icon: Users },
          { id: "activeTeams", label: t.dashboard.activeTeams, value: "—", change: "", icon: Trophy },
          { id: "upcoming", label: t.dashboard.upcoming, value: "—", change: "", icon: Calendar },
          { id: "unpaidDues", label: t.financial.outstanding, value: "—", change: "", icon: TrendingUp },
        ],
      },
      trainer: {
        title: t.dashboard.trainerDashboard,
        greeting: t.dashboard.welcomeBackCoach,
        kpis: [
          { id: "myPlayers", label: t.dashboard.myPlayers, value: "—", change: "", icon: Users },
          { id: "sessionsThisWeek", label: t.dashboard.sessionsThisWeek, value: "—", change: "", icon: Calendar },
          { id: "attendanceRate", label: t.dashboard.attendanceRate, value: "—", change: "", icon: Activity },
          { id: "nextMatch", label: t.dashboard.nextMatch, value: "—", change: "", icon: Trophy },
        ],
      },
      player: {
        title: t.dashboard.playerDashboard,
        greeting: t.dashboard.welcomeBack,
        kpis: [
          { id: "nextTraining", label: t.dashboard.nextTraining, value: "—", change: "", icon: Calendar },
          { id: "matchesPlayed", label: t.dashboard.matchesPlayed, value: "—", change: "", icon: Trophy },
          { id: "attendance", label: t.dashboard.attendance, value: "—", change: "", icon: Activity },
          { id: "teamRank", label: t.dashboard.teamRank, value: "—", change: "", icon: TrendingUp },
        ],
      },
      sponsor: {
        title: t.dashboard.partnerDashboard,
        greeting: t.dashboard.welcome,
        kpis: [
          { id: "clubEvents", label: t.dashboard.clubEvents, value: "—", change: "", icon: Calendar },
          { id: "contacts", label: t.dashboard.contacts, value: "—", change: "", icon: Users },
          { id: "messages", label: t.dashboard.messages, value: "—", change: "", icon: Clock },
          { id: "insights", label: t.dashboard.insights, value: "—", change: "", icon: Bot },
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
        { id: "upcoming", label: t.dashboard.upcoming, value: "—", change: "", icon: Calendar },
        { id: "totalMembers", label: t.dashboard.totalMembers, value: "—", change: "", icon: Users },
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
  const isClubAdminPersona = normalizedRole === "club_admin";
  const externalPersona = useMemo(
    () => isExternalRole(normalizedRole),
    [normalizedRole],
  );

  // Route-driven profile (A): persist selected role so the unified top bar reflects it on every page.
  useEffect(() => {
    if (!role) return;
    localStorage.setItem("one4team.activeRole", role);
  }, [role]);

  useEffect(() => {
    if (!role || perms.activeClubLoading || perms.assignmentsLoading) return;
    const personaCtx = { treatAsClubAdmin: perms.isAdmin };
    if (!isDashboardPersonaAllowed(role, perms.role, perms.assignments, personaCtx)) {
      const fallback = defaultDashboardPersonaSlug(perms.role, perms.assignments, personaCtx);
      const normCurrent = normalizeDashboardRole(role);
      const normFallback = normalizeDashboardRole(fallback);
      if (normCurrent === normFallback) return;
      localStorage.setItem("one4team.activeRole", fallback);
      navigate(`/dashboard/${fallback}`, { replace: true });
    }
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
              value: "—",
              change: "",
            })),
          );
          return;
        }

        const profilePromise = fetchClubSetupProfile(activeClubId);

        if (isClubAdminPersona) {
          const [snapshot, schedule, profile, financial] = await Promise.all([
            fetchAdminDashboardSnapshot(activeClubId),
            fetchDashboardUpcoming(activeClubId, 7),
            profilePromise,
            fetchClubFinancialSnapshot(activeClubId),
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
              if (k.id === "upcoming") return { ...k, value: String(snapshot.upcomingCount7d) };
              if (k.id === "unpaidDues") {
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
          if (snapshot.teamsCount > 0) {
            insights.push(
              t.dashboard.aiInsightTeamsMatches
                .replace("{teams}", String(snapshot.teamsCount))
                .replace("{matches}", String(snapshot.upcomingMatches)),
            );
          }
          if (financial.outstandingTotalCents > 0) {
            insights.push(
              t.financial.aiInsightOutstanding.replace(
                "{amount}",
                formatMoneyFromCents(financial.outstandingTotalCents, financial.currency),
              ),
            );
          } else if (snapshot.unpaidDues > 0) {
            insights.push(
              t.dashboard.aiInsightUnpaidDues.replace("{count}", String(snapshot.unpaidDues)),
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

        const now = new Date();
        const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [{ data: acts }, { data: members }, { data: dues }, profile] = await Promise.all([
          supabase
            .from("activities")
            .select("title, type, starts_at")
            .eq("club_id", activeClubId)
            .gte("starts_at", now.toISOString())
            .lt("starts_at", to.toISOString())
            .order("starts_at", { ascending: true })
            .limit(6),
          supabase
            .from("club_memberships")
            .select("id")
            .eq("club_id", activeClubId)
            .eq("status", "active")
            .limit(1000),
          supabase
            .from("membership_dues")
            .select("id")
            .eq("club_id", activeClubId)
            .eq("status", "due")
            .limit(1000),
          profilePromise,
        ]);

        if (cancelled) return;

        setClubSetupProfile(profile);

        const nextUpcoming: UpcomingItem[] = (acts ?? []).map((a) => ({
          title: (a as { title: string }).title,
          type: (a as { type: string }).type,
          time: new Date((a as { starts_at: string }).starts_at).toLocaleString([], {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            day: "numeric",
          }),
        }));

        setUpcoming(nextUpcoming);
        setAiInsights([t.dashboard.aiTip1, t.dashboard.aiTip2, t.dashboard.aiTip3]);

        const membersCount = (members ?? []).length;
        const dueCount = (dues ?? []).length;

        setKpis((prev) =>
          prev.map((k) => {
            if (k.id === "myPlayers") return { ...k, value: String(membersCount) };
            if (k.id === "totalMembers") return { ...k, value: String(membersCount) };
            if (k.id === "upcoming") return { ...k, value: String(nextUpcoming.length) };
            if (k.id === "sessionsThisWeek") {
              return { ...k, value: String(nextUpcoming.filter((x) => x.type === "training").length) };
            }
            if (k.id === "unpaidDues") return { ...k, value: String(dueCount) };
            return k;
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
  }, [activeClubId, config.kpis, role, t, externalPersona]);

  const showGettingStarted = useMemo(() => {
    if (!activeClubId) return true;
    if (isClubAdminPersona && adminSnapshot) {
      const hasPeople = adminSnapshot.membersActive > 0 || adminSnapshot.pendingDrafts > 0;
      const hasSchedule =
        adminSnapshot.upcomingCount7d > 0 || adminSnapshot.upcomingMatches > 0;
      return !hasPeople || !hasSchedule;
    }
    if (role === "trainer") {
      return upcoming.length === 0;
    }
    return false;
  }, [activeClubId, adminSnapshot, isClubAdminPersona, role, upcoming.length]);

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
    if (isClubAdminPersona && activeClubId) return true;
    return Boolean(registrationSummary?.registration_track);
  }, [activeClubId, externalPersona, registrationSummary, role]);

  const clubSetupDisplay = useMemo(() => {
    const isClubAdmin =
      registrationSummary?.registration_track !== "partner" || Boolean(clubSetupProfile || activeClub);

    if (!isClubAdmin) {
      return {
        track: "partner" as const,
        companyName: registrationSummary?.partner_setup?.companyName || "—",
        partnerType:
          formatClubTypeLabel(
            registrationSummary?.partner_setup?.partnerType,
            t.onboarding.partnerTypeOptions,
          ) || "—",
        country: registrationSummary?.partner_setup?.country || "—",
      };
    }

    const clubName =
      clubSetupProfile?.name ||
      activeClub?.name ||
      registrationSummary?.club_setup?.clubName ||
      "—";
    const clubType =
      formatClubTypeLabel(clubSetupProfile?.clubCategory, t.onboarding.clubTypeOptions) ||
      formatClubTypeLabel(registrationSummary?.club_setup?.clubType, t.onboarding.clubTypeOptions) ||
      "—";
    const location =
      clubSetupProfile?.address ||
      registrationSummary?.club_setup?.country ||
      "—";
    const website = clubSetupProfile?.website || registrationSummary?.club_setup?.website || null;

    let publicPageStatus = t.dashboard.clubSetupStatusPrivate;
    if (clubSetupProfile?.isPublic) {
      publicPageStatus = clubSetupProfile.publicPagePublishedAt
        ? t.dashboard.clubSetupStatusPublished.replace("{slug}", clubSetupProfile.slug)
        : t.dashboard.clubSetupStatusPublicDraft;
    }

    const teamsMembers =
      adminSnapshot && isClubAdminPersona
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
  }, [activeClub, adminSnapshot, clubSetupProfile, registrationSummary, role, t]);

  const dashboardGreeting = `${t.dashboard.welcomeBack}${firstName ? `, ${firstName}` : ""}${activeClub?.name ? ` · ${activeClub.name}` : ""}`;

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot title={config.title} greeting={dashboardGreeting} showBack={false} />

      <div className={`${DASHBOARD_PAGE_INNER} space-y-5`}>
        {showGettingStarted && (role === "trainer" || isClubAdminPersona) && (
          <div className="rounded-2xl glass-card p-5">
            <div className="font-display font-semibold text-foreground text-[15px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />{" "}
              {isClubAdminPersona ? t.dashboard.gettingStartedAdmin : t.dashboard.gettingStarted}
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
                    {isClubAdminPersona ? (
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

        {sections.tasksSummary ? <TasksSummaryCard /> : null}

        {sections.marketplaceCards ? <MarketplaceDashboardCards /> : null}

        {/* KPIs — hidden for external provider personas (marketplace cards only) */}
        {!externalPersona ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
              className="p-4 rounded-2xl glass-card haptic-press cursor-default"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                </div>
                {kpi.change && (
                  <span className="text-[11px] font-medium text-primary flex items-center gap-0.5 ios-pill bg-primary/8 border-primary/20">
                    <ArrowUpRight className="w-3 h-3" />
                    {kpi.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-display font-bold text-foreground tracking-tight">
                {dashboardLoading && kpi.value === "—" ? "…" : kpi.value}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</div>
            </motion.div>
          ))}
        </div>
        ) : null}

        {sections.financialSummary && isClubAdminPersona ? <FinancialSummary compact /> : null}

        {sections.analyticsWidgets ? <AnalyticsWidgets /> : null}
        {sections.seasonProgression ? <SeasonProgressionChart /> : null}
        {sections.teamChemistry ? <TeamChemistry /> : null}
        {sections.achievementBadges ? <AchievementBadges /> : null}
        {sections.naturalLanguageStats ? <NaturalLanguageStats /> : null}

        {sections.ai4teamWeeklyDigest ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">
                <BrandedText text={t.dashboard.ai4teamWeeklySummary} />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.dashboard.ai4teamWeeklySummaryDesc}</div>
            </div>
            <Link
              to={`/co-trainer?tab=chat&prompt=${encodeURIComponent(
                "Create a weekly leadership digest for our club with top priorities, risks, and owner actions for the next 7 days.",
              )}`}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-gold-static px-4 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110 shrink-0"
            >
              <BrandedText text={t.dashboard.ai4teamWeeklySummary} />
            </Link>
          </div>
        ) : null}

        {sections.seasonAwards ? <SeasonAwards /> : null}

        {sections.adminNotificationSender ? <AdminNotificationSender /> : null}

        {sections.upcomingAndAi ? (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Upcoming */}
          <div className="lg:col-span-2 rounded-2xl glass-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px]">
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
                    <div className="text-[13px] font-medium text-foreground">{event.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{event.time}</div>
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

          {/* AI Suggestions */}
          <div className="rounded-2xl glass-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2 text-[15px] relative">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-gradient-gold">{t.dashboard.aiInsights}</span>
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
        ) : null}

        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />{" "}
          {activeClubId ? t.dashboard.liveClubData : t.dashboard.bestEffort}
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
