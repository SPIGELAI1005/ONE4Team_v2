import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "one4team.pwaInstallDismissed";

/** Soft install banner for public club microsites only. */
export function PublicClubInstallBanner({ clubName }: { clubName: string }) {
  const { t } = useLanguage();
  const copy = t.publicClubPwa;
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (isIos) {
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
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
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
    <div className="fixed bottom-20 left-3 right-3 z-40 sm:left-auto sm:right-4 sm:max-w-sm rounded-2xl border border-border bg-background/95 backdrop-blur shadow-lg p-3">
      <div className="flex items-start gap-2">
        <Download className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {copy.title.replace("{club}", clubName)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {iosHint ? copy.iosHint : copy.desc}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!iosHint && deferred ? (
              <Button size="sm" onClick={() => void install()}>
                {copy.install}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {copy.dismiss}
            </Button>
          </div>
        </div>
        <button type="button" className="text-muted-foreground p-1" onClick={dismiss} aria-label={copy.dismiss}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function registerPublicClubServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!window.location.pathname.startsWith("/club/")) return;
  void navigator.serviceWorker.register("/club-pwa-sw.js").catch(() => {
    // ignore
  });
}
