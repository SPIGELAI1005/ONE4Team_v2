/**
 * Minimal dashboard service worker — installability only.
 * Does NOT cache authenticated API responses or offline secrets.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Network-only — no cache intercept for dashboard ops data.
});
