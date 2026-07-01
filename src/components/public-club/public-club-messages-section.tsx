import { Ai4TLogo } from "@/components/ai/Ai4TLogo";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { PublicClubButton } from "@/components/public-club/public-club-button";

/** Homepage teaser for club messaging - members use the floating hub for live updates. */
export function PublicClubMessagesSection() {
  const { t } = useLanguage();
  const { club, user, isMember, messagesCta } = usePublicClub();

  if (!club?.sectionVisibility.messages) return null;

  const bullets = [
    t.clubPage.messagesBulletChannels,
    t.clubPage.messagesBulletChat,
    t.clubPage.messagesHubBulletNotify,
  ];

  return (
    <PublicClubSection title={t.clubPage.messagesPublicTitle}>
      <PublicClubCard className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/10">
          <Ai4TLogo variant="bubble" className="h-10 w-10" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">{t.clubPage.messagesPublicDesc}</p>
          <ul className="space-y-1 text-sm text-[color:var(--club-foreground)]">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[color:var(--club-primary)]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {user && isMember ? (
            <p className="text-xs text-[color:var(--club-muted)]">{t.clubPage.messagesHubMemberHint}</p>
          ) : null}
        </div>
        <PublicClubButton appearance="primary" className="w-full shrink-0 sm:w-auto" onClick={messagesCta}>
          {user ? t.clubPage.messagesCtaSignedIn : t.clubPage.messagesCtaSignedOut}
        </PublicClubButton>
      </PublicClubCard>
    </PublicClubSection>
  );
}
