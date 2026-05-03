import { ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";

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
      <div className="rounded-3xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] backdrop-blur-xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <ShieldQuestion className="mx-auto mb-3 h-10 w-10 text-[color:var(--club-muted)]" aria-hidden />
        <h1 className="font-display text-xl font-bold text-[color:var(--club-foreground)]">{title}</h1>
        {description ? <p className="mt-2 text-sm text-[color:var(--club-muted)] leading-relaxed">{description}</p> : null}
        {showHome ? (
          <Button asChild variant="outline" className="mt-6 border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)] hover:bg-white/10">
            <Link to={homeHref}>{homeTo ? t.clubPage.backToClubHome : t.clubPage.goHome}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
