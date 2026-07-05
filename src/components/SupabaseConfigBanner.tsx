import { isSupabaseConfigured } from "@/integrations/supabase/client";

export function SupabaseConfigBanner() {
  if (import.meta.env.PROD || isSupabaseConfigured()) return null;

  return (
    <div
      role="alert"
      className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
    >
      Supabase is not configured. Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{" "}
      <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> in your{" "}
      <code className="font-mono text-xs">.env</code> or Vercel environment. Auth and database features will not work.
    </div>
  );
}

export function SupabaseConfigErrorScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Configuration error</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This deployment is missing required Supabase environment variables. Contact your administrator or set{" "}
        <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> in Vercel Production settings.
      </p>
    </div>
  );
}
