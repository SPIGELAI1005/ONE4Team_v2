import { motion } from "framer-motion";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";

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

  if (!showRequestInvite) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => setShowRequestInvite(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold tracking-tight text-[color:var(--club-foreground)]">{t.clubPage.requestAnInvite}</h3>
            <p className="text-xs text-[color:var(--club-muted)]">{t.clubPage.weWillNotify}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowRequestInvite(false)} className="text-[color:var(--club-foreground)]">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {!club ? (
          <div className="text-sm text-[color:var(--club-muted)]">{t.clubPage.clubNotAvailable}</div>
        ) : !canRequestInvite ? (
          <div className="text-sm text-[color:var(--club-muted)]">{t.clubPage.notAcceptingRequests}</div>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder={t.clubPage.yourNameRequired}
              value={reqName}
              onChange={(e) => setReqName(e.target.value)}
              className="border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
              maxLength={120}
            />
            <Input
              placeholder={t.clubPage.emailRequired}
              type="email"
              value={reqEmail}
              onChange={(e) => setReqEmail(e.target.value)}
              className="border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
              maxLength={254}
            />
            <textarea
              placeholder={t.clubPage.optionalMessage}
              value={reqMessage}
              onChange={(e) => setReqMessage(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--club-border)] bg-white/5 px-3 py-2 text-sm text-[color:var(--club-foreground)] placeholder:text-[color:var(--club-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--club-primary)]"
              rows={4}
              maxLength={800}
            />
            <Button
              onClick={() => void submitInviteRequest()}
              disabled={submitting || !reqName.trim() || !reqEmail.trim()}
              className="w-full text-white hover:brightness-110 disabled:opacity-40"
              style={{ backgroundColor: "var(--club-primary)" }}
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
          </div>
        )}
      </motion.div>
    </div>
  );
}
