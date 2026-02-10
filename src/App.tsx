import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import PageTransition from "@/components/layout/PageTransition";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ClubPage from "./pages/ClubPage";
import Members from "./pages/Members";
import Teams from "./pages/Teams";
import Communication from "./pages/Communication";
import Payments from "./pages/Payments";
import Events from "./pages/Events";
import Matches from "./pages/Matches";
import PlayerStats from "./pages/PlayerStats";
import PlayerProfile from "./pages/PlayerProfile";
import CoTrainer from "./pages/CoTrainer";
import LiveScores from "./pages/LiveScores";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
        <Route path="/dashboard/:role" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/club/:clubSlug" element={<PageTransition><ClubPage /></PageTransition>} />
        <Route path="/members" element={<PageTransition><Members /></PageTransition>} />
        <Route path="/teams" element={<PageTransition><Teams /></PageTransition>} />
        <Route path="/communication" element={<PageTransition><Communication /></PageTransition>} />
        <Route path="/payments" element={<PageTransition><Payments /></PageTransition>} />
        <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
        <Route path="/matches" element={<PageTransition><Matches /></PageTransition>} />
        <Route path="/player-stats" element={<PageTransition><PlayerStats /></PageTransition>} />
        <Route path="/player/:membershipId" element={<PageTransition><PlayerProfile /></PageTransition>} />
        <Route path="/co-trainer" element={<PageTransition><CoTrainer /></PageTransition>} />
        <Route path="/live-scores" element={<PageTransition><LiveScores /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
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
