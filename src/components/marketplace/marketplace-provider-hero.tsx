import { Briefcase, ListChecks, Send } from "lucide-react";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

interface MarketplaceProviderHeroProps {
  title: string;
  subtitle: string;
  cards: {
    listing: { title: string; description: string };
    requests: { title: string; description: string };
    offers: { title: string; description: string };
  };
  onListing?: () => void;
  onRequests?: () => void;
  onOffers?: () => void;
}

const CARD_ICONS = [ListChecks, Briefcase, Send] as const;

export function MarketplaceProviderHero({
  title,
  subtitle,
  cards,
  onListing,
  onRequests,
  onOffers,
}: MarketplaceProviderHeroProps) {
  const cardEntries = [
    { ...cards.listing, onAction: onListing },
    { ...cards.requests, onAction: onRequests },
    { ...cards.offers, onAction: onOffers },
  ];

  return (
    <section
      className={cn(
        PARTNER_PANEL_CLASS,
        "overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-background p-5 sm:p-6",
      )}
    >
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">ONE4Team</p>
        <h2 className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {cardEntries.map((card, index) => {
          const Icon = CARD_ICONS[index];
          return (
            <button
              key={card.title}
              type="button"
              onClick={card.onAction}
              className={cn(
                PARTNER_PANEL_CLASS,
                "group h-full p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.04]",
              )}
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold">
                <Icon className="h-4 w-4" />
              </div>
              <div className="font-display text-sm font-semibold text-foreground">{card.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
