import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardSidebar from "./DashboardSidebar";
import MobileBottomNav from "./MobileBottomNav";

const DashboardLayout = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {!isMobile && <DashboardSidebar />}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
};

export default DashboardLayout;
