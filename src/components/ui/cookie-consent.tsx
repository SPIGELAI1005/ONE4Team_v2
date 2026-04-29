import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const LS_KEY = "one4team.cookieConsent";
const LS_VERSION = 2;
const OPEN_SETTINGS_EVENT = "one4team:open-cookie-settings";

export interface CookiePreferences {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function readCookiePreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (v && typeof v === "object") {
      if (v.v === LS_VERSION && v.preferences && typeof v.preferences === "object") {
        const p = v.preferences as Record<string, unknown>;
        return {
          necessary: true,
          functional: Boolean(p.functional),
          analytics: Boolean(p.analytics),
          marketing: Boolean(p.marketing),
        };
      }
      if (v.level === "all") {
        return { necessary: true, functional: true, analytics: true, marketing: true };
      }
      if (v.level === "essential") {
        return { necessary: true, functional: false, analytics: false, marketing: false };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeConsent(prefs: CookiePreferences) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      v: LS_VERSION,
      preferences: prefs,
      savedAt: new Date().toISOString(),
    }),
  );
}

/** Open the cookie preference centre from the footer or elsewhere (signed-out shell). */
export function requestOpenCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

type PreferenceTab = "privacy" | "necessary" | "functional" | "analytics" | "marketing";

const DEFAULT_PREFS: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export function CookieConsent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const cc = t.cookieConsent;

  const [bannerVisible, setBannerVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PreferenceTab>("privacy");
  const [draft, setDraft] = useState<CookiePreferences>(DEFAULT_PREFS);

  const openPreferences = useCallback((initial?: CookiePreferences) => {
    setDraft(initial ?? readCookiePreferences() ?? DEFAULT_PREFS);
    setActiveTab("privacy");
    setPrefsOpen(true);
  }, []);

  useEffect(() => {
    const stored = readCookiePreferences();
    if (!stored) {
      const timer = setTimeout(() => setBannerVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const onOpen = () => {
      const existing = readCookiePreferences();
      openPreferences(existing ?? undefined);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, [openPreferences]);

  const persistAndClose = useCallback((prefs: CookiePreferences) => {
    writeConsent(prefs);
    setBannerVisible(false);
    setPrefsOpen(false);
  }, []);

  const acceptAllFromBanner = () => {
    persistAndClose({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  };

  const rejectNonEssentialFromBanner = () => {
    persistAndClose({ ...DEFAULT_PREFS });
  };

  const tabs: { id: PreferenceTab; label: string }[] = [
    { id: "privacy", label: cc.tabPrivacy },
    { id: "necessary", label: cc.tabNecessary },
    { id: "functional", label: cc.tabFunctional },
    { id: "analytics", label: cc.tabAnalytics },
    { id: "marketing", label: cc.tabMarketing },
  ];

  return (
    <>
      <Dialog
        open={prefsOpen}
        onOpenChange={(open) => {
          setPrefsOpen(open);
          if (!open && !readCookiePreferences()) setBannerVisible(true);
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[min(90vh,720px)] w-[min(100vw-1.5rem,44rem)] sm:max-w-3xl gap-0 p-0 overflow-hidden flex flex-col",
            "border-border/80 bg-background shadow-2xl",
          )}
        >
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
            <DialogTitle className="font-display text-lg sm:text-xl pr-8">{cc.preferenceCenterTitle}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            <nav
              className="flex md:flex-col gap-0 border-b md:border-b-0 md:border-r border-border/60 bg-muted/20 md:w-[11.5rem] shrink-0 overflow-x-auto md:overflow-y-auto"
              aria-label={cc.preferenceNavLabel}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "text-left text-xs sm:text-sm px-3 py-2.5 md:py-3 md:px-3 whitespace-nowrap md:whitespace-normal transition-colors border-b-2 md:border-b-0 md:border-l-2 border-transparent",
                    activeTab === tab.id
                      ? "bg-background md:border-l-primary font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 text-sm text-muted-foreground leading-relaxed min-h-[12rem]">
              {activeTab === "privacy" ? (
                <div className="space-y-3">
                  <h3 className="font-display text-base font-semibold text-foreground">{cc.yourPrivacyTitle}</h3>
                  <p>{cc.yourPrivacyBody}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                    <button
                      type="button"
                      className="text-primary text-sm font-medium hover:underline"
                      onClick={() => {
                        setPrefsOpen(false);
                        navigate("/privacy");
                      }}
                    >
                      {cc.moreInfo}
                    </button>
                    <button
                      type="button"
                      className="text-primary text-sm font-medium hover:underline"
                      onClick={() => {
                        setPrefsOpen(false);
                        navigate("/clubs-and-partners");
                      }}
                    >
                      {cc.partnersList}
                    </button>
                  </div>
                </div>
              ) : null}

              {activeTab === "necessary" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-foreground">{cc.necessaryTitle}</h3>
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary shrink-0">{cc.necessaryBadge}</span>
                  </div>
                  <p>{cc.necessaryDesc}</p>
                  <button
                    type="button"
                    className="text-primary text-sm font-medium hover:underline"
                    onClick={() => {
                      setPrefsOpen(false);
                      navigate("/privacy");
                    }}
                  >
                    {cc.providerDetails}
                  </button>
                </div>
              ) : null}

              {activeTab === "functional" ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-display text-base font-semibold text-foreground">{cc.functionalTitle}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{draft.functional ? cc.toggleOn : cc.toggleOff}</span>
                      <Switch checked={draft.functional} onCheckedChange={(v) => setDraft((d) => ({ ...d, functional: v }))} />
                    </div>
                  </div>
                  <p>{cc.functionalDesc}</p>
                  <button
                    type="button"
                    className="text-primary text-sm font-medium hover:underline"
                    onClick={() => {
                      setPrefsOpen(false);
                      navigate("/privacy");
                    }}
                  >
                    {cc.providerDetails}
                  </button>
                </div>
              ) : null}

              {activeTab === "analytics" ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-display text-base font-semibold text-foreground">{cc.analyticsTitle}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{draft.analytics ? cc.toggleOn : cc.toggleOff}</span>
                      <Switch checked={draft.analytics} onCheckedChange={(v) => setDraft((d) => ({ ...d, analytics: v }))} />
                    </div>
                  </div>
                  <p>{cc.analyticsDesc}</p>
                  <button
                    type="button"
                    className="text-primary text-sm font-medium hover:underline"
                    onClick={() => {
                      setPrefsOpen(false);
                      navigate("/privacy");
                    }}
                  >
                    {cc.providerDetails}
                  </button>
                </div>
              ) : null}

              {activeTab === "marketing" ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-display text-base font-semibold text-foreground">{cc.marketingTitle}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{draft.marketing ? cc.toggleOn : cc.toggleOff}</span>
                      <Switch checked={draft.marketing} onCheckedChange={(v) => setDraft((d) => ({ ...d, marketing: v }))} />
                    </div>
                  </div>
                  <p>{cc.marketingDesc}</p>
                  <button
                    type="button"
                    className="text-primary text-sm font-medium hover:underline"
                    onClick={() => {
                      setPrefsOpen(false);
                      navigate("/privacy");
                    }}
                  >
                    {cc.providerDetails}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 px-4 py-4 sm:px-5 border-t border-border/60 bg-muted/10 shrink-0 sm:justify-stretch">
            <Button
              type="button"
              className="w-full sm:flex-1 rounded-xl bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110"
              onClick={() => persistAndClose(draft)}
            >
              {cc.confirmSelection}
            </Button>
            <Button type="button" variant="outline" className="w-full sm:flex-1 rounded-xl" onClick={() => persistAndClose({ ...DEFAULT_PREFS })}>
              {cc.rejectAll}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:flex-1 rounded-xl border-primary/40 text-primary hover:bg-primary/5"
              onClick={() =>
                persistAndClose({
                  necessary: true,
                  functional: true,
                  analytics: true,
                  marketing: true,
                })
              }
            >
              {cc.allowAll}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {bannerVisible && !prefsOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6"
          >
            <div className="container mx-auto max-w-3xl">
              <div className="rounded-3xl border border-border/60 bg-card/90 backdrop-blur-2xl shadow-2xl p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-gold flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <h3 className="font-display font-bold text-foreground text-base sm:text-lg leading-snug">{cc.bannerTitle}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{cc.bannerIntro}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{cc.bannerConsentNote}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => {
                          setBannerVisible(false);
                          navigate("/privacy");
                        }}
                        className="text-primary font-medium hover:underline"
                      >
                        {cc.cookiePolicy}
                      </button>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => {
                          setBannerVisible(false);
                          navigate("/privacy");
                        }}
                        className="text-primary font-medium hover:underline"
                      >
                        {cc.privacyPolicy}
                      </button>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBannerVisible(false);
                        navigate("/clubs-and-partners");
                      }}
                      className="text-left text-xs sm:text-sm text-primary font-medium hover:underline block"
                    >
                      {cc.partnersList}
                    </button>
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          className="w-full sm:flex-1 bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 rounded-xl"
                          onClick={acceptAllFromBanner}
                        >
                          {cc.acceptAll}
                        </Button>
                        <Button size="sm" variant="outline" className="w-full sm:flex-1 rounded-xl" onClick={rejectNonEssentialFromBanner}>
                          <Shield className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          {cc.rejectAll}
                        </Button>
                        <Button size="sm" variant="outline" className="w-full sm:flex-1 rounded-xl border-primary/30" onClick={() => openPreferences()}>
                          {cc.openPreferences}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
