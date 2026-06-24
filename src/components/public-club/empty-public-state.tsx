import { ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { clubCtaOutlineButtonClass } from "@/lib/public-club-cta-classes";
import { clubGlassPanelLgClass } from "@/lib/public-club-glass-classes";

interface EmptyPublicStateProps {
  title: string;
  description?: string;
  showHome?: boolean;
  /** When set (e.g. club home), the “home” action returns here instead of the marketing site root. */
  homeTo?: string;
}

export function EmptyPublicState({ title, description, showHome = true, homeTo }: EmptyPublicStateProps) {
  const { t } = useLanguage();
  const homeHref = homeTo ?? "/";
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className={`${clubGlassPanelLgClass} p-8`}>
        <ShieldQuestion className="mx-auto mb-3 h-10 w-10 text-[color:var(--club-muted)]" aria-hidden />
        <h1 className="font-display text-xl font-bold text-[color:var(--club-foreground)]">{title}</h1>
        {description ? <p className="mt-2 text-sm text-[color:var(--club-muted)] leading-relaxed">{description}</p> : null}
        {showHome ? (
          <Button asChild variant="outline" className={`mt-6 ${clubCtaOutlineButtonClass}`}>
            <Link to={homeHref}>{homeTo ? t.clubPage.backToClubHome : t.clubPage.goHome}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
