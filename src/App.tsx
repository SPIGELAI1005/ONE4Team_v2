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
import { CookieConsent } from "@/components/ui/cookie-consent";
import { RequireAdmin, RequireTrainer } from "@/components/auth/require-role";
import { PlanGate } from "@/components/plan-gate";

// Route-level code splitting (reduces initial bundle size)
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const DashboardContent = lazy(() => import("./components/dashboard/DashboardContent"));
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
const PublicClubLegacyTeamRedirect = lazy(() => import("./pages/public-club/public-club-legacy-team-redirect"));
const Members = lazy(() => import("./pages/Members"));
const MemberHistory = lazy(() => import("./pages/MemberHistory"));
const Teams = lazy(() => import("./pages/Teams"));
const Communication = lazy(() => import("./pages/Communication"));
const Payments = lazy(() => import("./pages/Payments"));
const Events = lazy(() => import("./pages/Events"));
const Matches = lazy(() => import("./pages/Matches"));
const Activities = lazy(() => import("./pages/Activities"));
const Dues = lazy(() => import("./pages/Dues"));
const Partners = lazy(() => import("./pages/Partners"));
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
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
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
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <PublicClubLayout />
              </Suspense>
            </PageTransition>
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
          <Route path="matches/:matchId" element={<Suspense fallback={<RouteFallback />}><PublicClubMatchDetailPage /></Suspense>} />
          <Route path="matches" element={<Suspense fallback={<RouteFallback />}><PublicClubMatchesPage /></Suspense>} />
          <Route path="events/:eventId" element={<Suspense fallback={<RouteFallback />}><PublicClubEventDetailPage /></Suspense>} />
          <Route path="events" element={<Suspense fallback={<RouteFallback />}><PublicClubEventsPage /></Suspense>} />
          <Route path="documents" element={<Suspense fallback={<RouteFallback />}><PublicClubDocumentsPage /></Suspense>} />
          <Route path="join" element={<Suspense fallback={<RouteFallback />}><PublicClubJoinPage /></Suspense>} />
          <Route path="contact" element={<Suspense fallback={<RouteFallback />}><PublicClubContactPage /></Suspense>} />
        </Route>

        {/* Dashboard layout: sidebar persists across all these pages */}
        <Route element={<RequireAuth><Suspense fallback={<RouteFallback />}><DashboardLayout /></Suspense></RequireAuth>}>
          <Route path="/dashboard/:role" element={<Suspense fallback={<RouteFallback />}><DashboardContent /></Suspense>} />
          {/* Admin-only routes */}
          <Route
            path="/members/history/draft/:draftId"
            element={
              <RequireTrainer>
                <Suspense fallback={<RouteFallback />}>
                  <MemberHistory />
                </Suspense>
              </RequireTrainer>
            }
          />
          <Route
            path="/members/history/:membershipId"
            element={
              <RequireTrainer>
                <Suspense fallback={<RouteFallback />}>
                  <MemberHistory />
                </Suspense>
              </RequireTrainer>
            }
          />
          <Route path="/members" element={<RequireTrainer><Suspense fallback={<RouteFallback />}><Members /></Suspense></RequireTrainer>} />
          <Route path="/payments" element={<RequireAdmin><Suspense fallback={<RouteFallback />}><PlanGate feature="payments"><Payments /></PlanGate></Suspense></RequireAdmin>} />
          <Route path="/dues" element={<RequireAdmin><Suspense fallback={<RouteFallback />}><Dues /></Suspense></RequireAdmin>} />
          <Route path="/partners" element={<RequireTrainer><Suspense fallback={<RouteFallback />}><PlanGate feature="partners"><Partners /></PlanGate></Suspense></RequireTrainer>} />
          <Route path="/club-page-admin" element={<RequireAdmin><Suspense fallback={<RouteFallback />}><ClubPageAdmin /></Suspense></RequireAdmin>} />
          <Route path="/training-plan-import" element={<RequireAdmin><Suspense fallback={<RouteFallback />}><TrainingPlanImport /></Suspense></RequireAdmin>} />
          <Route path="/coach-placeholders" element={<RequireAdmin><Suspense fallback={<RouteFallback />}><CoachPlaceholderResolution /></Suspense></RequireAdmin>} />
          <Route path="/property-layers" element={<Navigate to="/asset-layers" replace />} />
          <Route path="/asset-layers" element={<RequireAdmin><Suspense fallback={<RouteFallback />}><Teams /></Suspense></RequireAdmin>} />
          {/* Trainer+ routes */}
          <Route path="/teams" element={<RequireTrainer><Suspense fallback={<RouteFallback />}><Teams /></Suspense></RequireTrainer>} />
          {/* All authenticated users */}
          <Route path="/communication" element={<Suspense fallback={<RouteFallback />}><Communication /></Suspense>} />
          <Route path="/events" element={<Suspense fallback={<RouteFallback />}><Events /></Suspense>} />
          <Route path="/activities" element={<Suspense fallback={<RouteFallback />}><Activities /></Suspense>} />
          <Route path="/matches" element={<Suspense fallback={<RouteFallback />}><Matches /></Suspense>} />
          <Route
            path="/ai"
            element={
              <PlanGate feature="ai">
                <Navigate to="/co-trainer" replace />
              </PlanGate>
            }
          />
          <Route path="/reports" element={<Suspense fallback={<RouteFallback />}><PlayerStats /></Suspense>} />
          <Route path="/player-stats" element={<Navigate to="/reports" replace />} />
          <Route path="/player/:membershipId" element={<Suspense fallback={<RouteFallback />}><PlayerProfile /></Suspense>} />
          <Route path="/co-trainer" element={<Suspense fallback={<RouteFallback />}><PlanGate feature="ai"><CoTrainer /></PlanGate></Suspense>} />
          <Route path="/live-scores" element={<Suspense fallback={<RouteFallback />}><LiveScores /></Suspense>} />
          <Route path="/shop" element={<Suspense fallback={<RouteFallback />}><PlanGate feature="shop"><Shop /></PlanGate></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<RouteFallback />}><SettingsPage /></Suspense>} />
          <Route path="/support" element={<Suspense fallback={<RouteFallback />}><SupportFaq /></Suspense>} />
        </Route>

        <Route
          path="/platform-admin"
          element={
            <RequireAuth>
              <Suspense fallback={<RouteFallback />}>
                <PlatformAdmin />
              </Suspense>
            </RequireAuth>
          }
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
      <div className="flex-1 min-w-0">
        <AnimatedRoutes />
      </div>
    </div>
  );
}

const App = () => (
  <ThemeProvider>
    <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppShell />
            <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
