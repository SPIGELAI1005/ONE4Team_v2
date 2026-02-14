import { useState } from "react";
import { AlertTriangle, X, MessageSquareWarning } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export function TestModeBanner() {
  const { t } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem("one4team.testBannerDismissed") === "1";
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("one4team.testBannerDismissed", "1");
    setIsDismissed(true);
  };

  const handleReport = () => {
    window.open("mailto:support@one4team.app?subject=Bug%20Report%20-%20ONE4Team%20Beta", "_blank");
  };

  return (
    <div className="relative border-b border-red-500/20 bg-red-500/8 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2.5 flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-500">
              {t.testModeBanner.title}
            </span>
            <span className="h-1 w-1 rounded-full bg-red-500/50" />
            <span className="text-[10px] text-red-400/70 font-medium">v0.1</span>
          </div>
          <p className="text-[12px] sm:text-[13px] leading-relaxed text-red-900/70 dark:text-red-200/80">
            {t.testModeBanner.message}
          </p>
          <button
            onClick={handleReport}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-red-500 hover:text-red-400 transition-colors"
          >
            <MessageSquareWarning className="w-3 h-3" />
            {t.testModeBanner.reportCta}
          </button>
        </div>

        <button
          onClick={handleDismiss}
          className="shrink-0 mt-0.5 p-1 rounded-md text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          aria-label={t.testModeBanner.dismiss}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
