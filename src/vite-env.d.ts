/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional canonical site origin for public club SEO (e.g. https://app.one4team.com). Defaults to `window.location.origin`. */
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  /** When true, the public club news page shows sample stories (no DB). */
  readonly VITE_PUBLIC_CLUB_NEWS_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
