import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardTopBarProvider } from "@/contexts/dashboard-top-bar-context";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import DashboardSidebar from "./DashboardSidebar";
import MobileBottomNav from "./MobileBottomNav";

const DashboardLayout = () => {
  const isMobile = useIsMobile();

  return (
    <DashboardTopBarProvider>
      <div className="flex h-screen bg-background overflow-hidden min-w-0">
        {!isMobile && <DashboardSidebar />}
        <main className="flex flex-1 min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto">
          <DashboardTopBar />
          <div className="min-h-0 min-w-0 flex-1">
            <Outlet />
          </div>
        </main>
        {isMobile && <MobileBottomNav />}
      </div>
    </DashboardTopBarProvider>
  );
};

export default DashboardLayout;
