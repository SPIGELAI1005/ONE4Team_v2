export function registerPublicClubServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!window.location.pathname.startsWith("/club/")) return;
  void navigator.serviceWorker.register("/club-pwa-sw.js").catch(() => {
    // ignore
  });
}
