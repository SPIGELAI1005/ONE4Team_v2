import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { readCookiePreferences } from "@/lib/cookie-consent";

function analyticsAllowed(): boolean {
  const prefs = readCookiePreferences();
  return prefs?.analytics === true;
}

/** Vercel Analytics + Speed Insights (production only, after analytics cookie consent). */
export function VercelInsights() {
  const [enabled, setEnabled] = useState(() => analyticsAllowed());

  useEffect(() => {
    const sync = () => setEnabled(analyticsAllowed());
    sync();
    window.addEventListener("one4team:cookie-consent-updated", sync);
    return () => window.removeEventListener("one4team:cookie-consent-updated", sync);
  }, []);

  if (!import.meta.env.PROD || !enabled) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
