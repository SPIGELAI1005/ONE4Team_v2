import { useLayoutEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { useDashboardNav } from "@/hooks/use-dashboard-nav";
import { pathnameToNavId } from "@/lib/dashboard-nav";

const MOBILE_NAV_QUERY = "(max-width: 767px)";
const NAV_CLEARANCE_GAP_PX = 20;

function syncDashboardBottomClearance(navEl: HTMLElement) {
  if (!window.matchMedia(MOBILE_NAV_QUERY).matches) {
    document.documentElement.style.removeProperty("--dashboard-bottom-nav-height");
    document.documentElement.style.removeProperty("--dashboard-bottom-clearance");
    return;
  }

  const height = Math.ceil(navEl.getBoundingClientRect().height);
  if (height < 48) return;

  document.documentElement.style.setProperty("--dashboard-bottom-nav-height", `${height}px`);
  document.documentElement.style.setProperty(
    "--dashboard-bottom-clearance",
    `calc(${height}px + ${NAV_CLEARANCE_GAP_PX}px)`,
  );
}

interface MobileBottomNavProps {
  active?: string;
  onNavigate?: (id: string) => void;
}

const MobileBottomNav = ({ active, onNavigate }: MobileBottomNavProps) => {
  const navRef = useRef<HTMLElement>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const { mobileItems, personaSlug } = useDashboardNav({
    dashboard: t.common.home,
    assetLayers: t.sidebar.assetLayers,
    members: t.sidebar.members,
    training: t.sidebar.training,
    matches: t.sidebar.matches,
    events: t.sidebar.events,
    playerStats: t.sidebar.playerStats,
    payments: t.sidebar.payments,
    messages: t.sidebar.messages,
    tasks: t.sidebar.tasks,
    marketplace: t.sidebar.marketplace,
    partners: t.sidebar.partners,
    ai4Team: t.sidebar.ai4Team,
    clubPage: t.sidebar.clubPage,
    shop: t.sidebar.shop,
    settings: t.sidebar.settings,
    supportFaq: t.sidebar.supportFaq,
    home: t.common.home,
  });

  const currentActive = active || pathnameToNavId(location.pathname);

  useLayoutEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const update = () => syncDashboardBottomClearance(navEl);
    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(navEl);

    const mediaQuery = window.matchMedia(MOBILE_NAV_QUERY);
    mediaQuery.addEventListener("change", update);
    window.addEventListener("orientationchange", update);

    return () => {
      resizeObserver.disconnect();
      mediaQuery.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [mobileItems.length]);

  const handleNav = (id: string, route: string) => {
    onNavigate?.(id);
    if (id === "overview") {
      navigate(`/dashboard/${personaSlug}`);
      return;
    }
    navigate(route);
  };

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 glass-bottom-bar md:hidden safe-area-bottom"
      aria-label="Dashboard navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {mobileItems.map((item) => {
          const isActive = currentActive === item.id;
          const isMarketplace = item.module === "marketplace";
          const itemClass = isActive
            ? isMarketplace
              ? "text-violet-600 dark:text-violet-400"
              : "text-primary"
            : isMarketplace
              ? "text-violet-600 dark:text-violet-400"
              : "text-muted-foreground";

          return (
            <motion.button
              key={`${item.module}-${item.id}`}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleNav(item.id, item.route)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[60px] min-h-[52px] touch-manipulation ${itemClass}`}
            >
              <div className="relative">
                <item.icon className="w-[26px] h-[26px]" strokeWidth={isActive ? 2 : 1.5} />
                {isActive && (
                  <motion.div
                    layoutId="tab-glow"
                    className="absolute -inset-2 rounded-xl bg-primary/10"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span className={`text-xs leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
