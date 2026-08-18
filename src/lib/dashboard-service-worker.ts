/** Register installable dashboard SW (network-only; no secret caching). */
export function registerDashboardServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  void navigator.serviceWorker.register("/sw-dashboard.js").catch(() => {
    // Optional — install prompt still works when SW missing on some hosts.
  });
}
