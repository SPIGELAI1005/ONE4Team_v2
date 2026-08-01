import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { isIosSafariLike, isStandaloneDisplayMode } from "@/lib/public-club-pwa-manifest";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function dismissStorageKey(clubSlug: string): string {
  return `one4team.pwaInstallDismissed.${clubSlug || "club"}`;
}

/** Soft install banner for public club microsites only (always light to match club chrome). */
export function PublicClubInstallBanner({
  clubName,
  clubSlug,
}: {
  clubName: string;
  clubSlug: string;
}) {
  const { t } = useLanguage();
  const copy = t.publicClubPwa;
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplayMode()) return;
    if (localStorage.getItem(dismissStorageKey(clubSlug)) === "1") return;

    if (isIosSafariLike()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [clubSlug]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(dismissStorageKey(clubSlug), "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  return (
    <div
      className={cn(
        "fixed bottom-20 left-3 right-3 z-40 sm:left-auto sm:right-4 sm:max-w-sm",
        "rounded-2xl border border-neutral-200/90 bg-white/95 p-3.5 text-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--club-primary)]/12 text-[color:var(--club-primary)]">
          <Download className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight text-neutral-900">
            {copy.title.replace("{club}", clubName)}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-600">
            {(iosHint ? copy.iosHint : copy.desc).replace("{club}", clubName)}
          </p>

          {iosHint && showIosSteps ? (
            <ol className="mt-2 space-y-1.5 rounded-xl border border-neutral-200/90 bg-neutral-50 p-2.5 text-[11px] text-neutral-800">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--club-primary)]/15 text-[10px] font-semibold text-[color:var(--club-primary)]">
                  1
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Share className="h-3.5 w-3.5 text-[color:var(--club-primary)]" />
                  {copy.iosStepShare}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--club-primary)]/15 text-[10px] font-semibold text-[color:var(--club-primary)]">
                  2
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <SquarePlus className="h-3.5 w-3.5 text-[color:var(--club-primary)]" />
                  {copy.iosStepAdd}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--club-primary)]/15 text-[10px] font-semibold text-[color:var(--club-primary)]">
                  3
                </span>
                <span>{copy.iosStepConfirm.replace("{club}", clubName)}</span>
              </li>
            </ol>
          ) : null}

          <div className="mt-2.5 flex flex-wrap gap-2">
            {!iosHint && deferred ? (
              <Button
                size="sm"
                onClick={() => void install()}
                className="h-8 rounded-full bg-[color:var(--club-primary)] px-3.5 text-xs font-semibold text-[color:var(--club-primary-foreground)] shadow-sm hover:brightness-110"
              >
                {copy.install}
              </Button>
            ) : null}
            {iosHint ? (
              <Button
                size="sm"
                onClick={() => setShowIosSteps((open) => !open)}
                className="h-8 rounded-full bg-[color:var(--club-primary)] px-3.5 text-xs font-semibold text-[color:var(--club-primary-foreground)] shadow-sm hover:brightness-110"
              >
                {showIosSteps ? copy.iosHideSteps : copy.iosShowSteps}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
              className="h-8 rounded-full px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {copy.dismiss}
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="rounded-full p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
          onClick={dismiss}
          aria-label={copy.dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
