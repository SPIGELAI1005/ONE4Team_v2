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

export function writeCookieConsent(prefs: CookiePreferences) {
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

export function cookieSettingsEventName() {
  return OPEN_SETTINGS_EVENT;
}

