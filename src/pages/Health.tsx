export default function Health() {
  const env = import.meta.env as unknown as {
    MODE?: string;
    DEV?: boolean;
    PROD?: boolean;
    VITE_APP_ENV?: string;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
        <div className="font-display font-bold text-foreground">Health</div>
        <div className="mt-2 text-xs text-muted-foreground">
          This is a lightweight debug endpoint for deployments.
        </div>
        <pre className="mt-4 text-[11px] text-muted-foreground whitespace-pre-wrap">
{JSON.stringify(
  {
    mode: env.MODE ?? null,
    appEnv: env.VITE_APP_ENV ?? null,
    dev: env.DEV ?? null,
    prod: env.PROD ?? null,
  },
  null,
  2
)}
        </pre>
      </div>
    </div>
  );
}
