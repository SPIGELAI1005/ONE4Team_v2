import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Store } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useClubMarketplace,
  useMarketplaceProviderProfile,
  useProviderMarketplaceInteractions,
} from "@/hooks/use-marketplace";
import {
  buildClubMarketplaceDashboardCards,
  buildProviderMarketplaceDashboardCards,
  filterVisibleMarketplaceDashboardCards,
  hasMarketplaceDashboardActivity,
} from "@/lib/marketplace-dashboard-kpis";
import {
  canModerateMarketplaceListings,
  marketplacePageExperience,
} from "@/lib/marketplace-access";
import { providerTypeFromDashboardRole, type MarketplaceProviderType } from "@/lib/marketplace-models";
import { resolveDashboardRole } from "@/lib/rbac-config";
import { PARTNER_PORTAL_ROUTES } from "@/lib/partner-portal-routes";
import { cn } from "@/lib/utils";

const PROVIDER_ACTIVE_LABEL_KEY: Record<
  MarketplaceProviderType,
  "activeSponsorships" | "activeOrders" | "assignedJobs" | "activeProjects"
> = {
  sponsor: "activeSponsorships",
  supplier: "activeOrders",
  service_provider: "assignedJobs",
  consultant: "activeProjects",
};

export function MarketplaceDashboardCards() {
  const { t } = useLanguage();
  const m = t.dashboard.marketplace;
  const perms = usePermissions();
  const { clubId } = useClubId();

  const experience = marketplacePageExperience(perms.role, perms.assignments);
  const menuRole = resolveDashboardRole(perms.role, perms.assignments);
  const providerType = providerTypeFromDashboardRole(menuRole);

  if (experience === "denied") return null;

  if (experience === "club_marketplace") {
    return <ClubMarketplaceDashboardCards clubId={clubId} />;
  }

  if (experience === "provider_portal" && providerType) {
    return <ProviderMarketplaceDashboardCards providerType={providerType} />;
  }

  return null;
}

function ClubMarketplaceDashboardCards({ clubId }: { clubId: string | null }) {
  const { t } = useLanguage();
  const m = t.dashboard.marketplace;
  const perms = usePermissions();
  const canModerate = canModerateMarketplaceListings(perms.role, perms.assignments);

  const { requests, offers, saved, partners, pendingApprovals, loading, schemaReady } =
    useClubMarketplace(clubId);

  const cards = useMemo(
    () =>
      buildClubMarketplaceDashboardCards({
        requests,
        offers,
        savedCount: saved.length,
        pendingApprovals,
        partners,
        canModerate,
        labels: {
          openRequests: m.openRequests,
          offersReceived: m.offersReceived,
          pendingApprovals: m.pendingApprovals,
          savedProviders: m.savedProviders,
          activePartners: m.activePartners,
        },
      }),
    [requests, offers, saved.length, pendingApprovals, partners, canModerate, m],
  );

  const visible = useMemo(() => filterVisibleMarketplaceDashboardCards(cards), [cards]);

  if (!clubId || loading) return null;
  if (!schemaReady) {
    return (
      <MarketplaceDashboardEmpty
        message={t.marketplacePage.schemaHint}
        cta={m.openMarketplace}
      />
    );
  }
  if (visible.length === 0) {
    return (
      <MarketplaceDashboardEmpty
        message={m.clubEmpty}
        cta={m.openMarketplace}
      />
    );
  }

  return <MarketplaceDashboardGrid cards={visible} title={m.title} linkLabel={m.openMarketplace} homeHref="/marketplace" />;
}

function ProviderMarketplaceDashboardCards({
  providerType,
}: {
  providerType: MarketplaceProviderType;
}) {
  const { t } = useLanguage();
  const m = t.dashboard.marketplace;
  const mp = t.marketplacePage;

  const { profile, loading: profileLoading, schemaReady } = useMarketplaceProviderProfile(providerType);
  const { openRequests, myOffers, loading: interactionsLoading } =
    useProviderMarketplaceInteractions(profile?.id ?? null, providerType);

  const listingStatusLabel = profile
    ? (mp.listingStatus as Record<string, string>)[profile.listing_status] ?? profile.listing_status
    : mp.listingStatus.draft;

  const activeLabel = m[PROVIDER_ACTIVE_LABEL_KEY[providerType]];
  const matchingLabel =
    (m.matchingRequestsByType as Record<string, string>)[providerType] ?? m.matchingRequests;

  const cards = useMemo(
    () =>
      buildProviderMarketplaceDashboardCards({
        providerType,
        profile,
        openRequests,
        myOffers,
        listingStatusLabel,
        labels: {
          listingStatus: m.listingStatus,
          matchingRequests: matchingLabel,
          offersSent: m.offersSent,
          active: activeLabel,
          reviews: m.reviews,
        },
        activeLabel,
      }),
    [providerType, profile, openRequests, myOffers, listingStatusLabel, activeLabel, matchingLabel, m],
  );

  const visible = useMemo(() => filterVisibleMarketplaceDashboardCards(cards), [cards]);

  if (profileLoading || interactionsLoading) return null;
  if (!schemaReady) {
    return (
      <MarketplaceDashboardEmpty
        message={t.marketplacePage.schemaHint}
        cta={m.openMarketplace}
      />
    );
  }

  const hasProfile = Boolean(profile);
  if (visible.length === 0 || (!hasProfile && !hasMarketplaceDashboardActivity(cards))) {
    return (
      <MarketplaceDashboardEmpty
        message={m.providerEmpty}
        cta={m.createListing}
        href={`${PARTNER_PORTAL_ROUTES.marketplace}?view=listing`}
      />
    );
  }

  return (
    <MarketplaceDashboardGrid
      cards={visible}
      title={m.title}
      linkLabel={m.openMarketplace}
      homeHref={PARTNER_PORTAL_ROUTES.marketplace}
    />
  );
}

function MarketplaceDashboardGrid({
  cards,
  title,
  linkLabel,
  homeHref = "/marketplace",
}: {
  cards: { id: string; label: string; value: string | number; href: string; highlight?: boolean }[];
  title: string;
  linkLabel: string;
  homeHref?: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <Link to={homeHref} className="text-xs font-medium text-primary hover:underline">
          {linkLabel}
        </Link>
      </div>
      <div
        className={cn(
          "grid grid-cols-2 gap-2 sm:gap-3",
          cards.length >= 5 ? "lg:grid-cols-5" : cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {cards.map((card) => (
          <Link
            key={card.id}
            to={card.href}
            className={cn(
              "group rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur-2xl transition-colors hover:border-primary/40",
              card.highlight && "border-primary/25 bg-primary/[0.04]",
            )}
          >
            <div className="text-[11px] leading-tight text-muted-foreground">{card.label}</div>
            <div className="mt-1 font-display text-lg font-bold text-foreground sm:text-xl">{card.value}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MarketplaceDashboardEmpty({
  message,
  cta,
  href = "/marketplace",
}: {
  message: string;
  cta: string;
  href?: string;
}) {
  return (
    <Link
      to={href}
      className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-2xl transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Store className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{cta}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
