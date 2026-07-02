import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mail, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clubCtaFillHoverClass, clubCtaPrimaryInlineStyle } from "@/lib/public-club-cta-classes";
import {
  clubModalFormInputClass,
  clubModalFormLabelClass,
  clubModalFormTextareaClass,
  clubReadableModalOverlayClass,
  clubReadableModalPanelClass,
} from "@/lib/public-club-glass-classes";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

export function PublicClubInviteModal() {
  const { t } = useLanguage();
  const {
    club,
    showRequestInvite,
    setShowRequestInvite,
    canRequestInvite,
    reqName,
    setReqName,
    reqEmail,
    setReqEmail,
    reqMessage,
    setReqMessage,
    submitting,
    submitInviteRequest,
  } = usePublicClub();

  useEffect(() => {
    if (!showRequestInvite) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowRequestInvite(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setShowRequestInvite, showRequestInvite]);

  if (!club) return null;

  return (
    <AnimatePresence>
      {showRequestInvite ? (
        <div
          className={cn(
            "fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4",
            clubReadableModalOverlayClass,
          )}
          onClick={() => setShowRequestInvite(false)}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="club-invite-request-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn("w-full max-w-md overflow-hidden", clubReadableModalPanelClass)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-neutral-200/80 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-[color:var(--club-primary)]">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="club-invite-request-title"
                      className="font-display text-base font-semibold text-neutral-900 sm:text-lg"
                    >
                      {t.clubPage.requestAnInvite}
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-600 sm:text-sm">{t.clubPage.weWillNotify}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  onClick={() => setShowRequestInvite(false)}
                  aria-label={t.common.close}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              {!canRequestInvite ? (
                <p className="text-sm leading-relaxed text-neutral-700">{t.clubPage.notAcceptingRequests}</p>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (submitting || !reqName.trim() || !reqEmail.trim()) return;
                    void submitInviteRequest();
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="club-invite-name" className={clubModalFormLabelClass}>
                      {t.clubPage.yourNameRequired}
                    </Label>
                    <Input
                      id="club-invite-name"
                      placeholder={t.clubPage.yourNameRequired}
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      className={clubModalFormInputClass}
                      maxLength={120}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="club-invite-email" className={clubModalFormLabelClass}>
                      {t.clubPage.emailRequired}
                    </Label>
                    <Input
                      id="club-invite-email"
                      placeholder={t.clubPage.emailRequired}
                      type="email"
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                      className={clubModalFormInputClass}
                      maxLength={254}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="club-invite-message" className={clubModalFormLabelClass}>
                      {t.clubPage.optionalMessage}
                    </Label>
                    <textarea
                      id="club-invite-message"
                      placeholder={t.clubPage.optionalMessage}
                      value={reqMessage}
                      onChange={(e) => setReqMessage(e.target.value)}
                      className={clubModalFormTextareaClass}
                      rows={4}
                      maxLength={800}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || !reqName.trim() || !reqEmail.trim()}
                    className={cn(
                      "w-full rounded-xl font-semibold disabled:opacity-50",
                      clubCtaFillHoverClass,
                    )}
                    style={clubCtaPrimaryInlineStyle(club.primary_color)}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.clubPage.sending}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> {t.clubPage.sendRequest}
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
