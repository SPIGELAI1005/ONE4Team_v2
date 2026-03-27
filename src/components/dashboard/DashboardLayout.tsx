import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardSidebar from "./DashboardSidebar";
import MobileBottomNav from "./MobileBottomNav";

const DashboardLayout = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-background overflow-hidden min-w-0">
      {!isMobile && <DashboardSidebar />}
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
};

export default DashboardLayout;
