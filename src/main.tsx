import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initClientObservability } from "@/lib/observability";
import { installVitePreloadErrorHandler } from "@/lib/stale-chunk-reload";
import { registerDashboardServiceWorker } from "@/lib/dashboard-service-worker";

initClientObservability();
installVitePreloadErrorHandler();
registerDashboardServiceWorker();

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
