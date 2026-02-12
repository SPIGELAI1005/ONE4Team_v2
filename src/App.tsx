import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
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
const PlayerStats = lazy(() => import("./pages/PlayerStats"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const CoTrainer = lazy(() => import("./pages/CoTrainer"));
const LiveScores = lazy(() => import("./pages/LiveScores"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Members />
              </Suspense>
            </PageTransition>
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
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Communication />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/payments"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Payments />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/events"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Events />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/activities"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Activities />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/matches"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Matches />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/dues"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Dues />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/partners"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <Partners />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/player-stats"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <PlayerStats />
              </Suspense>
            </PageTransition>
          }
        />
        <Route
          path="/player/:membershipId"
          element={
            <PageTransition>
              <Suspense fallback={<RouteFallback />}>
                <PlayerProfile />
              </Suspense>
            </PageTransition>
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
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
