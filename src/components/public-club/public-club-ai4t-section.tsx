import { Lock } from "lucide-react";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { PublicClubAi4TButton } from "@/components/public-club/public-club-ai4t-button";
import { Ai4TLogo } from "@/components/ai/Ai4TLogo";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

export function PublicClubAi4TSection() {
  const { t } = useLanguage();
  const { club, clubHasAiFeature, clubHasAiFeatureLoading } = usePublicClub();

  if (!club?.sectionVisibility.ai4team) return null;

  const active = clubHasAiFeature && !clubHasAiFeatureLoading;
  const bullets = [
    t.clubPage.ai4teamBulletTactics,
    t.clubPage.ai4teamBulletChat,
    t.clubPage.ai4teamBulletPlans,
  ];

  return (
    <PublicClubSection title={<BrandedText text={t.clubPage.ai4teamPublicTitle} />}>
      <PublicClubCard className="flex flex-col items-center gap-5 px-6 py-8 text-center">
        <div
          className={cn(
            "flex items-center justify-center",
            !active && "opacity-55",
          )}
          aria-hidden={!active}
        >
          <Ai4TLogo
            variant="mark"
            className="h-[4.5rem] w-auto max-w-[min(100%,13rem)] sm:h-24 sm:max-w-[15rem]"
          />
        </div>

        <div className="max-w-xl space-y-3">
          <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">{t.clubPage.ai4teamPublicDesc}</p>
          <ul className="mx-auto inline-flex flex-col items-start gap-1.5 text-left text-sm text-[color:var(--club-foreground)]">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[color:var(--club-primary)]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {!active ? (
            <p className="text-xs text-[color:var(--club-muted)]">
              <BrandedText text={t.clubPage.ai4teamUnavailableDesc} />
            </p>
          ) : null}
        </div>

        <PublicClubAi4TButton variant="card" />
      </PublicClubCard>
    </PublicClubSection>
  );
}
