import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";

interface OutcomeLink {
  label: string;
  href: string;
}

interface AiAgentOutcomeLinksProps {
  links: OutcomeLink[];
  compact?: boolean;
}

export function AiAgentOutcomeLinks({ links, compact }: AiAgentOutcomeLinksProps) {
  const { t } = useLanguage();
  const p = t.coTrainerPage.agent;

  if (!links.length) return null;

  return (
    <div
      className={
        compact
          ? "flex flex-wrap gap-2 pt-1"
          : "rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2"
      }
    >
      {!compact ? <div className="text-xs font-semibold text-foreground">{p.outcomeLinksTitle}</div> : null}
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            to={link.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-background/80 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            {link.label}
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>
        ))}
      </div>
    </div>
  );
}
