import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePersistPortalPersonaFromPath } from "@/hooks/use-module-gate-role";
import { DashboardTopBarProvider } from "@/contexts/dashboard-top-bar-context";
import { AiAgentProvider } from "@/contexts/ai-agent-context";
import { AiAgentSheet } from "@/components/ai-agent/AiAgentSheet";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import DashboardSidebar from "./DashboardSidebar";
import MobileBottomNav from "./MobileBottomNav";

const DashboardLayout = () => {
  const isMobile = useIsMobile();
  usePersistPortalPersonaFromPath();

  return (
    <AiAgentProvider>
      <DashboardTopBarProvider>
        <div className="flex h-screen bg-background overflow-hidden min-w-0">
          {!isMobile && <DashboardSidebar />}
          <main className="flex flex-1 min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto">
            <DashboardTopBar />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Outlet />
            </div>
          </main>
          {isMobile && <MobileBottomNav />}
        </div>
        <AiAgentSheet />
      </DashboardTopBarProvider>
    </AiAgentProvider>
  );
};

export default DashboardLayout;
