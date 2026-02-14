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
import PageTransition from "@/components/layout/PageTransition";
import { CookieConsent } from "@/components/ui/cookie-consent";

// Route-level code splitting (reduces initial bundle size)
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const DashboardContent = lazy(() => import("./components/dashboard/DashboardContent"));
const ClubPage = lazy(() => import("./pages/ClubPage"));
const Members = lazy(() => import("./pages/Members"));
const Teams = lazy(() => import("./pages/Teams"));
const Communication = lazy(() => import("./pages/Communication"));
const Payments = lazy(() => import("./pages/Payments"));
const Events = lazy(() => import("./pages/Events"));
const Matches = lazy(() => import("./pages/Matches"));
const Activities = lazy(() => import("./pages/Activities"));
const Dues = lazy(() => import("./pages/Dues"));
const Partners = lazy(() => import("./pages/Partners"));
const AI = lazy(() => import("./pages/AI"));
const PlayerStats = lazy(() => import("./pages/PlayerStats"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const CoTrainer = lazy(() => import("./pages/CoTrainer"));
const LiveScores = lazy(() => import("./pages/LiveScores"));
const Shop = lazy(() => import("./pages/Shop"));
const ClubPageAdmin = lazy(() => import("./pages/ClubPageAdmin"));
const SettingsPage = lazy(() => import("./pages/Settings"));
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

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div className="min-h-[40vh] w-full px-6 py-10 text-sm text-stone-500 dark:text-stone-400">
      Loading…
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
          path="/club/:clubSlug"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <ClubPage />
              </Suspense>
            </PageTransition>
          }
        />

        {/* Dashboard layout: sidebar persists across all these pages */}
        <Route element={<RequireAuth><Suspense fallback={<RouteFallback />}><DashboardLayout /></Suspense></RequireAuth>}>
          <Route path="/dashboard/:role" element={<Suspense fallback={<RouteFallback />}><DashboardContent /></Suspense>} />
          <Route path="/members" element={<Suspense fallback={<RouteFallback />}><Members /></Suspense>} />
          <Route path="/teams" element={<Suspense fallback={<RouteFallback />}><Teams /></Suspense>} />
          <Route path="/communication" element={<Suspense fallback={<RouteFallback />}><Communication /></Suspense>} />
          <Route path="/payments" element={<Suspense fallback={<RouteFallback />}><Payments /></Suspense>} />
          <Route path="/events" element={<Suspense fallback={<RouteFallback />}><Events /></Suspense>} />
          <Route path="/activities" element={<Suspense fallback={<RouteFallback />}><Activities /></Suspense>} />
          <Route path="/matches" element={<Suspense fallback={<RouteFallback />}><Matches /></Suspense>} />
          <Route path="/dues" element={<Suspense fallback={<RouteFallback />}><Dues /></Suspense>} />
          <Route path="/partners" element={<Suspense fallback={<RouteFallback />}><Partners /></Suspense>} />
          <Route path="/ai" element={<Suspense fallback={<RouteFallback />}><AI /></Suspense>} />
          <Route path="/player-stats" element={<Suspense fallback={<RouteFallback />}><PlayerStats /></Suspense>} />
          <Route path="/player/:membershipId" element={<Suspense fallback={<RouteFallback />}><PlayerProfile /></Suspense>} />
          <Route path="/co-trainer" element={<Suspense fallback={<RouteFallback />}><CoTrainer /></Suspense>} />
          <Route path="/live-scores" element={<Suspense fallback={<RouteFallback />}><LiveScores /></Suspense>} />
          <Route path="/shop" element={<Suspense fallback={<RouteFallback />}><Shop /></Suspense>} />
          <Route path="/club-page-admin" element={<Suspense fallback={<RouteFallback />}><ClubPageAdmin /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<RouteFallback />}><SettingsPage /></Suspense>} />
        </Route>

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

const App = () => (
  <ThemeProvider>
    <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <div className="flex-1">
                <AnimatedRoutes />
              </div>
              <footer className="border-t border-border/60 bg-background/70 backdrop-blur-2xl">
                <div className="container mx-auto px-4 py-3 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>ONE4Team</span>
                  <a href="/health" className="hover:text-foreground transition-colors">/health</a>
                </div>
              </footer>
            </div>
            <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
