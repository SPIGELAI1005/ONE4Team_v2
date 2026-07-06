import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, MessageSquare, X } from "lucide-react";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { CommunicationWorkspace } from "@/pages/Communication";
import { clubAi4tModalOverlayClass, clubAi4tModalPanelClass } from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PublicClubCommunicationModal() {
  const { t } = useLanguage();
  const {
    club,
    user,
    showCommunicationModal,
    closeCommunicationModal,
    communicationInitialChannel,
    communicationInitialAnnouncementId,
    communicationEditAnnouncementId,
    openCommunicationInApp,
    homeTeamFilterId,
  } = usePublicClub();

  useEffect(() => {
    if (!showCommunicationModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCommunicationModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeCommunicationModal, showCommunicationModal]);

  if (!club) return null;

  return (
    <AnimatePresence>
      {showCommunicationModal && user ? (
        <div
          className={cn(
            "fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4",
            clubAi4tModalOverlayClass,
          )}
          onClick={() => closeCommunicationModal()}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="club-communication-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "flex h-[100dvh] w-full flex-col overflow-hidden sm:h-[min(92vh,880px)] sm:max-w-4xl lg:max-w-5xl",
              clubAi4tModalPanelClass,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-neutral-200/80 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-[color:var(--club-primary)] sm:h-10 sm:w-10">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="club-communication-title"
                      className="font-display text-sm font-semibold text-neutral-900 sm:text-lg"
                    >
                      {t.clubPage.messagesCommunicationModalTitle}
                    </h2>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-neutral-600 sm:line-clamp-none sm:text-sm">
                      {t.clubPage.messagesCommunicationModalSubtitle.replace("{club}", club.name)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-neutral-700 hover:bg-neutral-100"
                  onClick={() => closeCommunicationModal()}
                  aria-label={t.common.close}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-2 py-2 sm:px-4 sm:pb-4 sm:pt-3">
              <CommunicationWorkspace
                embedded
                clubIdOverride={club.id}
                clubNameOverride={club.name}
                initialChannelId={communicationInitialChannel ?? undefined}
                initialAnnouncementId={communicationInitialAnnouncementId ?? undefined}
                editAnnouncementId={communicationEditAnnouncementId ?? undefined}
                teamFilterId={homeTeamFilterId || undefined}
              />
            </div>

            <div className="shrink-0 border-t border-neutral-200/80 bg-white/70 px-4 py-2 sm:px-6 sm:py-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <p className="hidden text-xs leading-relaxed text-neutral-500 sm:block sm:text-left">
                  {t.clubPage.messagesCommunicationFooterHint}
                </p>
                <button
                  type="button"
                  onClick={() => openCommunicationInApp(communicationInitialChannel ?? undefined)}
                  className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 text-xs font-medium text-neutral-700 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline sm:min-h-0 sm:w-auto"
                >
                  {t.clubPage.messagesCommunicationOpenInApp}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
