import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

/** Baked into Vite build so PROD app mounts routes (not SupabaseConfigErrorScreen). */
export const E2E_SUPABASE_ENV = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "https://e2e-placeholder.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImUydGUtplaceholderIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.e2e-placeholder-signature",
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
        reuseExistingServer: true,
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
