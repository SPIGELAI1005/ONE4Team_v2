import { useMemo } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  clubMarketplaceTabLabel,
  providerPortalTabLabel,
  type ClubMarketplaceTab,
  type MarketplaceTabLabels,
  type ProviderPortalTab,
} from "@/lib/marketplace-product-structure";
import type { MarketplaceProviderType } from "@/lib/marketplace-models";

export function useMarketplaceTabLabels(): MarketplaceTabLabels {
  const { t } = useLanguage();
  const m = t.marketplacePage;

  return useMemo(
    () => ({
      club: m.club.tabs,
      provider: {
        common: m.provider.tabs,
        listingByType: m.provider.listingTabByType,
        servicesByType: m.provider.servicesTabByType,
      },
    }),
    [m],
  );
}

export function useClubTabLabel(tab: ClubMarketplaceTab): string {
  const labels = useMarketplaceTabLabels();
  return clubMarketplaceTabLabel(tab, labels);
}

export function useProviderTabLabel(
  tab: ProviderPortalTab,
  providerType: MarketplaceProviderType | null,
): string {
  const labels = useMarketplaceTabLabels();
  return providerPortalTabLabel(tab, providerType, labels);
}
