const RELOAD_KEY = "one4team.staleChunkReload";

/** True when a Vite/React.lazy chunk failed to load (common after a new deploy). */
export function isStaleChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String((error as { message?: unknown }).message ?? error);

  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

/**
 * Reload once when a hashed asset is missing after deploy.
 * Uses sessionStorage so a real outage does not loop forever.
 */
export function reloadForStaleChunkOnce(reason: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === "1") return false;
    sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    // Private mode / blocked storage — still attempt a single reload via history state.
    const key = "__one4team_stale_reload";
    if ((window as Window & { [key]?: boolean })[key]) return false;
    (window as Window & { [key]?: boolean })[key] = true;
  }

  // Soft log — avoid Sentry spam for expected post-deploy recoveries.
  console.warn(`[ONE4Team] Reloading after stale chunk (${reason})`);
  window.location.reload();
  return true;
}

export function clearStaleChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // ignore
  }
}

/** Listen for Vite preload failures (preferred path when the runtime supports it). */
export function installVitePreloadErrorHandler(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadForStaleChunkOnce("vite:preloadError");
  });

  // After a healthy boot, allow a future deploy to recover again.
  // Delay so a still-broken shell cannot immediately loop reloads.
  window.setTimeout(() => {
    clearStaleChunkReloadFlag();
  }, 15_000);
}
