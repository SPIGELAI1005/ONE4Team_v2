import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardContent from "@/components/dashboard/DashboardContent";

const Dashboard = () => (
  <div className="flex h-screen bg-background overflow-hidden">
    <DashboardSidebar />
    <DashboardContent />
  </div>
);

export default Dashboard;
