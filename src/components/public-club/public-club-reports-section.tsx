import { BarChart3 } from "lucide-react";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { PublicClubButton } from "@/components/public-club/public-club-button";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";

/** Homepage teaser for match reports — full reports live in the member app. */
export function PublicClubReportsSection() {
  const { t } = useLanguage();
  const { club, user, reportsCta } = usePublicClub();

  if (!club?.sectionVisibility.reports) return null;

  return (
    <PublicClubSection title={t.clubPage.reportsSection}>
      <PublicClubCard className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/10">
          <BarChart3 className="h-8 w-8 text-[color:var(--club-primary)]" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-display text-base font-semibold text-[color:var(--club-foreground)]">{t.clubPage.reportsTitle}</h3>
          <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">{t.clubPage.reportsDesc}</p>
        </div>
        <PublicClubButton appearance="primary" className="w-full shrink-0 sm:w-auto" onClick={reportsCta}>
          {user ? t.clubPage.reportsCtaSignedIn : t.clubPage.reportsCtaSignedOut}
        </PublicClubButton>
      </PublicClubCard>
    </PublicClubSection>
  );
}
