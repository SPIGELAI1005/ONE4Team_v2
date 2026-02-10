import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {!isMobile && <DashboardSidebar />}
      <DashboardContent />
      {isMobile && (
        <MobileBottomNav active={activeSection} onNavigate={setActiveSection} />
      )}
    </div>
  );
};

export default Dashboard;
