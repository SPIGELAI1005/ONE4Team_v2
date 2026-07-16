import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useLanguage } from "@/hooks/use-language";
import PageTransition from "@/components/layout/PageTransition";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { CookieConsent } from "@/components/ui/cookie-consent";
import { RequireAdmin } from "@/components/auth/require-role";
import { RequireModule } from "@/components/auth/require-module";
import { RequireAnyModule } from "@/components/auth/require-any-module";
import { RequireOperator } from "@/components/operator/RequireOperator";
import { ClubOnlyRoute, PartnerOnlyRoute, PersonaAwareAiRedirect } from "@/components/routing/PersonaPortalGate";
import { PlanGate } from "@/components/plan-gate";
import { dashboardRouteTransitionKey } from "@/lib/dashboard-nav";
import { operatorRouteTransitionKey } from "@/lib/operator-nav";
import { SupabaseConfigBanner, SupabaseConfigErrorScreen } from "@/components/SupabaseConfigBanner";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

// Route-level code splitting (reduces initial bundle size)
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const DashboardContent = lazy(() => import("./components/dashboard/DashboardContent"));
const OperatorLayout = lazy(() => import("./components/operator/OperatorLayout").then((module) => ({ default: module.OperatorLayout })));
const OperatorOverview = lazy(() => import("./pages/operator/OperatorOverview"));
const OperatorClubs = lazy(() => import("./pages/operator/OperatorClubs"));
const OperatorClubDetail = lazy(() => import("./pages/operator/OperatorClubDetail"));
const OperatorUsers = lazy(() => import("./pages/operator/OperatorUsers"));
const OperatorModules = lazy(() => import("./pages/operator/OperatorModules"));
const OperatorAnalytics = lazy(() => import("./pages/operator/OperatorAnalytics"));
const OperatorFinancials = lazy(() => import("./pages/operator/OperatorFinancials"));
const OperatorMarketplace = lazy(() => import("./pages/operator/OperatorMarketplace"));
const OperatorLegal = lazy(() => import("./pages/operator/OperatorLegal"));
const OperatorPerformance = lazy(() => import("./pages/operator/OperatorPerformance"));
const OperatorIssues = lazy(() => import("./pages/operator/OperatorIssues"));
const OperatorAudit = lazy(() => import("./pages/operator/OperatorAudit"));
const OperatorSupport = lazy(() => import("./pages/operator/OperatorSupport"));
const OperatorSettings = lazy(() => import("./pages/operator/OperatorSettings"));
const PublicClubLayout = lazy(() => import("./components/public-club/public-club-layout"));
const PublicClubHomePage = lazy(() => import("./pages/public-club/public-club-home-page"));
const PublicClubNewsPage = lazy(() => import("./pages/public-club/public-club-news-page"));
const PublicClubNewsArticlePage = lazy(() => import("./pages/public-club/public-club-news-article-page"));
const PublicClubTeamsPage = lazy(() => import("./pages/public-club/public-club-teams-page"));
const PublicClubTeamDetailPage = lazy(() => import("./pages/public-club/public-club-team-detail-page"));
const PublicClubSchedulePage = lazy(() => import("./pages/public-club/public-club-schedule-page"));
const PublicClubMatchesPage = lazy(() => import("./pages/public-club/public-club-matches-page"));
const PublicClubMatchDetailPage = lazy(() => import("./pages/public-club/public-club-match-detail-page"));
const PublicClubEventsPage = lazy(() => import("./pages/public-club/public-club-events-page"));
const PublicClubEventDetailPage = lazy(() => import("./pages/public-club/public-club-event-detail-page"));
const PublicClubDocumentsPage = lazy(() => import("./pages/public-club/public-club-documents-page"));
const PublicClubJoinPage = lazy(() => import("./pages/public-club/public-club-join-page"));
const PublicClubContactPage = lazy(() => import("./pages/public-club/public-club-contact-page"));
const PublicClubTournamentPage = lazy(() => import("./pages/public-club/public-club-tournament-page"));
const PublicClubShopPage = lazy(() => import("./pages/public-club/public-club-shop-page"));
const PublicClubReportsPage = lazy(() => import("./pages/public-club/public-club-reports-page"));
const PublicClubLiveScoresPage = lazy(() => import("./pages/public-club/public-club-live-scores-page"));
const PublicClubLegacyTeamRedirect = lazy(() => import("./pages/public-club/public-club-legacy-team-redirect"));
const Members = lazy(() => import("./pages/Members"));
const MemberHistory = lazy(() => import("./pages/MemberHistory"));
const Teams = lazy(() => import("./pages/Teams"));
const Communication = lazy(() => import("./pages/Communication"));
const Tasks = lazy(() => import("./pages/Tasks"));
const SupplierMessages = lazy(() => import("./pages/supplier/SupplierMessages"));
const SupplierTasks = lazy(() => import("./pages/supplier/SupplierTasks"));
const SupplierReports = lazy(() => import("./pages/supplier/SupplierReports"));
const SupplierPageAdmin = lazy(() => import("./pages/supplier/SupplierPageAdmin"));
const PublicSupplierPage = lazy(() => import("./pages/public-supplier/PublicSupplierPage"));
const PublicProviderProfilePage = lazy(() => import("./pages/public-provider/PublicProviderProfilePage"));
const Payments = lazy(() => import("./pages/Payments"));
const Events = lazy(() => import("./pages/Events"));
const Matches = lazy(() => import("./pages/Matches"));
const Activities = lazy(() => import("./pages/Activities"));
const Dues = lazy(() => import("./pages/Dues"));
const Partners = lazy(() => import("./pages/Partners"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const PartnerMarketplace = lazy(() => import("./pages/partner/PartnerMarketplace"));
const PlayerStats = lazy(() => import("./pages/PlayerStats"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const CoTrainer = lazy(() => import("./pages/CoTrainer"));
const LiveScores = lazy(() => import("./pages/LiveScores"));
const Shop = lazy(() => import("./pages/Shop"));
const ClubPageAdmin = lazy(() => import("./pages/ClubPageAdmin"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const SupportFaq = lazy(() => import("./pages/SupportFaq"));
const About = lazy(() => import("./pages/About"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ClubsAndPartners = lazy(() => import("./pages/ClubsAndPartners"));
const Features = lazy(() => import("./pages/Features"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Impressum = lazy(() => import("./pages/Impressum"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Health = lazy(() => import("./pages/Health"));
const Crash = lazy(() => import("./pages/Crash"));
const GuidedSetup = lazy(() => import("./pages/GuidedSetup"));
const TrainingPlanImport = lazy(() => import("./pages/TrainingPlanImport"));
const CoachPlaceholderResolution = lazy(() => import("./pages/CoachPlaceholderResolution"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <RouteFallback />;
  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    const authTarget = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
    return <Navigate to={authTarget} replace />;
  }
  return <>{children}</>;
}

function RouteFallback() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[40vh] w-full max-w-full px-4 sm:px-6 py-10 text-sm text-muted-foreground">
      {t.common.loading}
    </div>
  );
}

const AnimatedRoutes = () => {
  const location = useLocation();
  const dashboardTransitionKey = dashboardRouteTransitionKey(location.pathname);
  const routeTransitionKey =
    dashboardTransitionKey === location.pathname
      ? operatorRouteTransitionKey(location.pathname)
      : dashboardTransitionKey;
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeTransitionKey}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Index />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/about"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <About />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/pricing"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Pricing />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/features"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Features />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/clubs-and-partners"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <ClubsAndPartners />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/terms"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Terms />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/privacy"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Privacy />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/impressum"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Impressum />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/auth"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Auth />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Onboarding />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/providers/:slug"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <PublicProviderProfilePage />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/supplier/:supplierSlug"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <PublicSupplierPage />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/club/:clubSlug/team/:teamId"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <PublicClubLegacyTeamRedirect />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/club/:clubSlug"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PublicClubLayout />
            </Suspense>
          }
        >
          <Route index element={<Suspense fallback={<RouteFallback />}><PublicClubHomePage /></Suspense>} />
          <Route
            path="news/:newsId"
            element={<Suspense fallback={<RouteFallback />}><PublicClubNewsArticlePage /></Suspense>}
          />
          <Route path="news" element={<Suspense fallback={<RouteFallback />}><PublicClubNewsPage /></Suspense>} />
          <Route path="teams" element={<Suspense fallback={<RouteFallback />}><PublicClubTeamsPage /></Suspense>} />
          <Route path="teams/:teamSlug" element={<Suspense fallback={<RouteFallback />}><PublicClubTeamDetailPage /></Suspense>} />
          <Route path="schedule" element={<Suspense fallback={<RouteFallback />}><PublicClubSchedulePage /></Suspense>} />
          <Route path="tournament/:tournamentSlug" element={<Suspense fallback={<RouteFallback />}><PublicClubTournamentPage /></Suspense>} />
          <Route path="matches/:matchId" element={<Suspense fallback={<RouteFallback />}><PublicClubMatchDetailPage /></Suspense>} />
          <Route path="matches" element={<Suspense fallback={<RouteFallback />}><PublicClubMatchesPage /></Suspense>} />
          <Route path="events/:eventId" element={<Suspense fallback={<RouteFallback />}><PublicClubEventDetailPage /></Suspense>} />
          <Route path="events" element={<Suspense fallback={<RouteFallback />}><PublicClubEventsPage /></Suspense>} />
          <Route path="documents" element={<Suspense fallback={<RouteFallback />}><PublicClubDocumentsPage /></Suspense>} />
          <Route path="join" element={<Suspense fallback={<RouteFallback />}><PublicClubJoinPage /></Suspense>} />
          <Route path="contact" element={<Suspense fallback={<RouteFallback />}><PublicClubContactPage /></Suspense>} />
          <Route path="shop" element={<Suspense fallback={<RouteFallback />}><PublicClubShopPage /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<RouteFallback />}><PublicClubReportsPage /></Suspense>} />
          <Route path="live-scores" element={<Suspense fallback={<RouteFallback />}><PublicClubLiveScoresPage /></Suspense>} />
        </Route>

        {/* Dashboard layout: sidebar persists across all these pages */}
        <Route element={<RequireAuth><Suspense fallback={<RouteFallback />}><DashboardLayout /></Suspense></RequireAuth>}>
          <Route
            path="/dashboard/:role"
            element={
              <RequireModule module="dashboard" deniedMode="lock">
                <Suspense fallback={<RouteFallback />}>
                  <DashboardContent />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/members/history/draft/:draftId"
            element={
              <RequireModule module="members">
                <Suspense fallback={<RouteFallback />}>
                  <MemberHistory />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/members/history/:membershipId"
            element={
              <RequireModule module="members">
                <Suspense fallback={<RouteFallback />}>
                  <MemberHistory />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/members"
            element={
              <RequireModule module="members">
                <Suspense fallback={<RouteFallback />}>
                  <Members />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/payments"
            element={
              <RequireModule module="payments">
                <Suspense fallback={<RouteFallback />}>
                  <PlanGate feature="payments">
                    <Payments />
                  </PlanGate>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/dues"
            element={
              <RequireModule module="payments">
                <Suspense fallback={<RouteFallback />}>
                  <Dues />
                </Suspense>
              </RequireModule>
            }
          />
          <Route path="/marketplace" element={<RequireModule module="marketplace" deniedMode="lock"><Suspense fallback={<RouteFallback />}><PlanGate feature="partners"><Marketplace /></PlanGate></Suspense></RequireModule>} />
          <Route path="/partnermarketplace" element={<Navigate to="/partner-marketplace" replace />} />
          <Route
            path="/partner-marketplace"
            element={
              <RequireModule module="marketplace" deniedMode="lock">
                <Suspense fallback={<RouteFallback />}>
                  <PlanGate feature="partners">
                    <PartnerOnlyRoute partnerPath="/partner-marketplace">
                      <PartnerMarketplace />
                    </PartnerOnlyRoute>
                  </PlanGate>
                </Suspense>
              </RequireModule>
            }
          />
          <Route path="/partners" element={<RequireModule module="partners" deniedMode="lock"><Suspense fallback={<RouteFallback />}><PlanGate feature="partners"><Partners /></PlanGate></Suspense></RequireModule>} />
          <Route
            path="/club-page-admin"
            element={
              <RequireModule module="club_page">
                <Suspense fallback={<RouteFallback />}>
                  <ClubOnlyRoute clubPath="/club-page-admin">
                    <ClubPageAdmin />
                  </ClubOnlyRoute>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/supplier-page"
            element={
              <RequireModule module="supplier_page">
                <Suspense fallback={<RouteFallback />}>
                  <PartnerOnlyRoute partnerPath="/supplier-page">
                    <SupplierPageAdmin />
                  </PartnerOnlyRoute>
                </Suspense>
              </RequireModule>
            }
          />
          <Route path="/training-plan-import" element={<RequireAdmin><Suspense fallback={<RouteFallback />}><TrainingPlanImport /></Suspense></RequireAdmin>} />
          <Route path="/coach-placeholders" element={<RequireAdmin><Suspense fallback={<RouteFallback />}><CoachPlaceholderResolution /></Suspense></RequireAdmin>} />
          <Route path="/property-layers" element={<Navigate to="/asset-layers" replace />} />
          <Route
            path="/asset-layers"
            element={
              <RequireModule module="assets">
                <Suspense fallback={<RouteFallback />}>
                  <Teams />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/teams"
            element={
              <RequireModule module="trainings">
                <Suspense fallback={<RouteFallback />}>
                  <Teams />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/communication"
            element={
              <RequireModule module="messages">
                <Suspense fallback={<RouteFallback />}>
                  <ClubOnlyRoute clubPath="/communication">
                    <Communication />
                  </ClubOnlyRoute>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/partner-messages"
            element={
              <RequireModule module="messages">
                <Suspense fallback={<RouteFallback />}>
                  <PartnerOnlyRoute partnerPath="/partner-messages">
                    <SupplierMessages />
                  </PartnerOnlyRoute>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/tasks"
            element={
              <RequireModule module="tasks">
                <Suspense fallback={<RouteFallback />}>
                  <ClubOnlyRoute clubPath="/tasks">
                    <Tasks />
                  </ClubOnlyRoute>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/partner-tasks"
            element={
              <RequireModule module="tasks">
                <Suspense fallback={<RouteFallback />}>
                  <PartnerOnlyRoute partnerPath="/partner-tasks">
                    <SupplierTasks />
                  </PartnerOnlyRoute>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/events"
            element={
              <RequireModule module="events">
                <Suspense fallback={<RouteFallback />}>
                  <Events />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/activities"
            element={
              <RequireAnyModule modules={["trainings", "events"]}>
                <Suspense fallback={<RouteFallback />}>
                  <Activities />
                </Suspense>
              </RequireAnyModule>
            }
          />
          <Route
            path="/matches"
            element={
              <RequireModule module="matches">
                <Suspense fallback={<RouteFallback />}>
                  <Matches />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/ai"
            element={
              <RequireModule module="ai4t">
                <PlanGate feature="ai">
                  <PersonaAwareAiRedirect />
                </PlanGate>
              </RequireModule>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireModule module="reports">
                <Suspense fallback={<RouteFallback />}>
                  <ClubOnlyRoute clubPath="/reports">
                    <PlayerStats />
                  </ClubOnlyRoute>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/partner-reports"
            element={
              <RequireModule module="reports">
                <Suspense fallback={<RouteFallback />}>
                  <PartnerOnlyRoute partnerPath="/partner-reports">
                    <SupplierReports />
                  </PartnerOnlyRoute>
                </Suspense>
              </RequireModule>
            }
          />
          <Route path="/player-stats" element={<Navigate to="/reports" replace />} />
          <Route
            path="/player/:membershipId"
            element={
              <RequireModule module="members">
                <Suspense fallback={<RouteFallback />}>
                  <PlayerProfile />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/co-trainer"
            element={
              <RequireModule module="ai4t">
                <Suspense fallback={<RouteFallback />}>
                  <PlanGate feature="ai">
                    <ClubOnlyRoute clubPath="/co-trainer">
                      <CoTrainer />
                    </ClubOnlyRoute>
                  </PlanGate>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/partner-ai"
            element={
              <RequireModule module="ai4t">
                <Suspense fallback={<RouteFallback />}>
                  <PlanGate feature="ai">
                    <PartnerOnlyRoute partnerPath="/partner-ai">
                      <CoTrainer />
                    </PartnerOnlyRoute>
                  </PlanGate>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/live-scores"
            element={
              <RequireModule module="matches">
                <Suspense fallback={<RouteFallback />}>
                  <LiveScores />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/shop"
            element={
              <RequireModule module="club_shop">
                <Suspense fallback={<RouteFallback />}>
                  <PlanGate feature="shop">
                    <Shop />
                  </PlanGate>
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireModule module="settings">
                <Suspense fallback={<RouteFallback />}>
                  <SettingsPage />
                </Suspense>
              </RequireModule>
            }
          />
          <Route
            path="/support"
            element={
              <RequireModule module="support">
                <Suspense fallback={<RouteFallback />}>
                  <SupportFaq />
                </Suspense>
              </RequireModule>
            }
          />
        </Route>

        <Route
          path="/operator"
          element={
            <RequireAuth>
              <RequireOperator>
                <Suspense fallback={<RouteFallback />}>
                  <OperatorLayout />
                </Suspense>
              </RequireOperator>
            </RequireAuth>
          }
        >
          <Route
            index
            element={
              <RequireOperator requiredPermission="operator.overview.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorOverview />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="clubs"
            element={
              <RequireOperator requiredPermission="operator.clubs.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorClubs />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="clubs/:clubId"
            element={
              <RequireOperator requiredPermission="operator.clubs.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorClubDetail />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="users"
            element={
              <RequireOperator requiredPermission="operator.users.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorUsers />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="modules"
            element={
              <RequireOperator requiredPermission="operator.modules.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorModules />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="analytics"
            element={
              <RequireOperator requiredPermission="operator.analytics.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorAnalytics />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="financials"
            element={
              <RequireOperator requiredPermission="operator.analytics.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorFinancials />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="marketplace"
            element={
              <RequireOperator requiredPermission="operator.analytics.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorMarketplace />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="performance"
            element={
              <RequireOperator requiredPermission="operator.logs.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorPerformance />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="issues"
            element={
              <RequireOperator requiredPermission="operator.logs.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorIssues />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="audit"
            element={
              <RequireOperator requiredPermission="operator.audit.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorAudit />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="support"
            element={
              <RequireOperator requiredPermission="operator.support.use">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorSupport />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="legal"
            element={
              <RequireOperator requiredPermission="operator.settings.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorLegal />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route
            path="settings"
            element={
              <RequireOperator requiredPermission="operator.settings.read">
                <Suspense fallback={<RouteFallback />}>
                  <OperatorSettings />
                </Suspense>
              </RequireOperator>
            }
          />
          <Route path="*" element={<Navigate to="/operator" replace />} />
        </Route>

        <Route
          path="/platform-admin"
          element={<Navigate to="/operator" replace />}
        />
        <Route
          path="/guided-setup"
          element={
            <RequireAuth>
              <Suspense fallback={<RouteFallback />}>
                <GuidedSetup />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/health"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Health />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/__crash"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                {import.meta.env.DEV ? <Crash /> : <NotFound />}
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="*"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <NotFound />
              </Suspense>
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function AppShell() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col min-w-0 overflow-x-hidden">
      <SupabaseConfigBanner />
      <div className="flex-1 min-w-0">
        <AnimatedRoutes />
      </div>
    </div>
  );
}

const App = () => {
  if (import.meta.env.PROD && !isSupabaseConfigured()) {
    return (
      <ThemeProvider>
        <SupabaseConfigErrorScreen />
      </ThemeProvider>
    );
  }

  return (
  <ThemeProvider>
    <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <AppShell />
            <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
  );
};

export default App;
