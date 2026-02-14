import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";

const LS_KEY = "one4team.cookieConsent";

export function CookieConsent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) {
      // Small delay so page loads first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = (level: "all" | "essential") => {
    localStorage.setItem(LS_KEY, JSON.stringify({ level, timestamp: new Date().toISOString() }));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6"
        >
          <div className="container mx-auto max-w-3xl">
            <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-2xl shadow-2xl p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-gold flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-1.5">
                    {t.cookieConsent.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                    {t.cookieConsent.description}
                    {" "}
                    <span className="text-muted-foreground">
                      {t.cookieConsent.learnMore}{" "}
                      <button
                        onClick={() => { setVisible(false); navigate("/privacy"); }}
                        className="text-primary hover:underline font-medium"
                      >
                        {t.cookieConsent.privacyPolicyLink}
                      </button>
                      .
                    </span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 rounded-xl"
                      onClick={() => accept("all")}
                    >
                      {t.cookieConsent.acceptAll}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => accept("essential")}
                    >
                      <Shield className="w-3.5 h-3.5 mr-1.5" />
                      {t.cookieConsent.acceptEssential}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
