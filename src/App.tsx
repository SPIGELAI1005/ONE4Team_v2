import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard/:role" element={<Dashboard />} />
            <Route path="/club/:clubSlug" element={<ClubPage />} />
            <Route path="/members" element={<Members />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/communication" element={<Communication />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/events" element={<Events />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/player-stats" element={<PlayerStats />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
