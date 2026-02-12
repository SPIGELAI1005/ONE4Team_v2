import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/useAuth";
import PageTransition from "@/components/layout/PageTransition";

// Route-level code splitting (reduces initial bundle size)
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
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
const NotFound = lazy(() => import("./pages/NotFound"));
const Health = lazy(() => import("./pages/Health"));
const Crash = lazy(() => import("./pages/Crash"));

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Onboarding />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/dashboard/:role"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Dashboard />
              </Suspense>
            </PageTransition>
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
        <Route
          path="/members"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Members />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/teams"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Teams />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/communication"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Communication />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/payments"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Payments />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/events"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Events />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/activities"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Activities />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/matches"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Matches />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/dues"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Dues />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/partners"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <Partners />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/ai"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <AI />
                </Suspense>
              </PageTransition>
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
          path="/player-stats"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <PlayerStats />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/player/:membershipId"
          element={
            <RequireAuth>
              <PageTransition>
                <Suspense fallback={<RouteFallback />}>
                  <PlayerProfile />
                </Suspense>
              </PageTransition>
            </RequireAuth>
          }
        />
        <Route
          path="/co-trainer"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <CoTrainer />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/live-scores"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <LiveScores />
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
                <a href="/health" className="hover:text-foreground">/health</a>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
