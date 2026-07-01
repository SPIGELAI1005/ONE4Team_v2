import { ArrowRight, FileText, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { cn } from "@/lib/utils";

interface MarketplaceClubHeroProps {
  title: string;
  subtitle: string;
  cards: {
    discover: { title: string; description: string };
    requests: { title: string; description: string };
    offers: { title: string; description: string };
  };
  managePartnersCta?: string;
  managePartnersHint?: string;
  onDiscover?: () => void;
  onRequests?: () => void;
  onOffers?: () => void;
  onManagePartners?: () => void;
}

const CARD_ICONS = [Search, Send, FileText] as const;

export function MarketplaceClubHero({
  title,
  subtitle,
  cards,
  managePartnersCta,
  managePartnersHint,
  onDiscover,
  onRequests,
  onOffers,
  onManagePartners,
}: MarketplaceClubHeroProps) {
  const cardEntries = [
    { ...cards.discover, onAction: onDiscover },
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

      {managePartnersCta && onManagePartners ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{managePartnersHint}</p>
          <Button variant="outline" size="sm" className="shrink-0" onClick={onManagePartners}>
            {managePartnersCta}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}
