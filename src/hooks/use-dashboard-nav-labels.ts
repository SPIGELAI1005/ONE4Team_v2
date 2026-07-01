import { useMemo } from "react";
import { useLanguage } from "@/hooks/use-language";
import type { DashboardNavLabels } from "@/lib/dashboard-nav";

/** Shared i18n labels for `useDashboardNav()` — sidebar, top bar, mobile drawer. */
export function useDashboardNavLabels(): DashboardNavLabels {
  const { t } = useLanguage();
  return useMemo(
    () => ({
      dashboard: t.sidebar.dashboard,
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
    supplierPage: t.sidebar.supplierPage,
    shop: t.sidebar.shop,
      settings: t.sidebar.settings,
      supportFaq: t.sidebar.supportFaq,
      home: t.common.home,
    }),
    [t],
  );
}
