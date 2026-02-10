import { useParams } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, Trophy, MessageSquare,
  Briefcase, ShoppingBag, Bot, CreditCard
} from "lucide-react";

type NavItem = { icon: React.ElementType; label: string; id: string };

const roleMobileNav: Record<string, NavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Home", id: "overview" },
    { icon: Users, label: "Members", id: "members" },
    { icon: Calendar, label: "Training", id: "training" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
    { icon: Bot, label: "AI", id: "ai" },
  ],
  trainer: [
    { icon: LayoutDashboard, label: "Home", id: "overview" },
    { icon: Users, label: "Teams", id: "teams" },
    { icon: Calendar, label: "Training", id: "training" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
    { icon: Bot, label: "AI", id: "ai" },
  ],
  player: [
    { icon: LayoutDashboard, label: "Home", id: "overview" },
    { icon: Calendar, label: "Schedule", id: "schedule" },
    { icon: Trophy, label: "Matches", id: "matches" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
    { icon: ShoppingBag, label: "Shop", id: "shop" },
  ],
  sponsor: [
    { icon: LayoutDashboard, label: "Home", id: "overview" },
    { icon: Briefcase, label: "Contracts", id: "contracts" },
    { icon: CreditCard, label: "Invoices", id: "invoices" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
  ],
};

const defaultMobileNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", id: "overview" },
  { icon: MessageSquare, label: "Messages", id: "messages" },
];

interface MobileBottomNavProps {
  active: string;
  onNavigate: (id: string) => void;
}

const MobileBottomNav = ({ active, onNavigate }: MobileBottomNavProps) => {
  const { role } = useParams();
  const items = roleMobileNav[role || ""] || defaultMobileNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
              active === item.id
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <item.icon className={`w-5 h-5 ${active === item.id ? "text-primary" : ""}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
