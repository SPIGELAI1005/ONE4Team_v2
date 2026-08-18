import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

/** GitHub Actions only — Cursor/other environments may set CI=true without a preview build. */
const isCi = process.env.GITHUB_ACTIONS === "true";
const viteEnv = loadEnv(isCi ? "production" : "development", process.cwd(), "");

function isPlaceholderEnvValue(value: string | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  return trimmed.includes("e2e-placeholder") || trimmed.includes("YOUR_PROJECT");
}

/** Prefer project `.env` over inherited shell placeholders (e.g. stale CI exports). */
function resolveViteEnv(key: string, placeholder: string): string {
  const fromFile = viteEnv[key]?.trim();
  const fromProcess = process.env[key]?.trim();

  if (fromFile && !isPlaceholderEnvValue(fromFile)) return fromFile;
  if (fromProcess && !isPlaceholderEnvValue(fromProcess)) return fromProcess;

  return fromFile || fromProcess || placeholder;
}

/** Baked into Vite dev/preview so the app mounts routes (not SupabaseConfigErrorScreen). */
export const E2E_SUPABASE_ENV = {
  VITE_SUPABASE_URL: resolveViteEnv("VITE_SUPABASE_URL", "https://e2e-placeholder.supabase.co"),
  VITE_SUPABASE_PUBLISHABLE_KEY: resolveViteEnv(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImUydGUtplaceholderIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.e2e-placeholder-signature",
  ),
  VITE_DEV_UNLOCK_ALL_FEATURES: "false",
  VITE_DEV_AUTO_LOGIN_EMAIL: "",
  VITE_DEV_AUTO_LOGIN_PASSWORD: "",
} as const;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: isCi ? 1 : 0,
  reporter: isCi ? "github" : "list",
  webServer: isCi
    ? {
        // CI already ran `npm run build` with E2E_SUPABASE_ENV — preview that artifact.
        command: "npx vite preview --host 127.0.0.1 --port 5173 --strictPort",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: !process.env.PW_NO_REUSE_SERVER,
        timeout: 120_000,
        env: {
          ...process.env,
          ...E2E_SUPABASE_ENV,
        },
      },
  use: {
    baseURL: process.env.PW_BASE_URL || "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
