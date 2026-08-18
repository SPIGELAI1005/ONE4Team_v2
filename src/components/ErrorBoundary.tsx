import React from "react";
import { logger } from "@/lib/logger";
import { captureExceptionToSentry } from "@/lib/observability";
import { isStaleChunkLoadError, reloadForStaleChunkOnce } from "@/lib/stale-chunk-reload";
import { de, en } from "@/i18n";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  isStaleChunk?: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      isStaleChunk: isStaleChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isStaleChunkLoadError(error)) {
      // Prefer silent recovery over a crash screen after deploys.
      if (reloadForStaleChunkOnce("ErrorBoundary")) return;
    }

    logger.error("UI crash", { error: error.message, stack: error.stack, info });
    captureExceptionToSentry(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      const language = typeof window !== "undefined" && localStorage.getItem("one4team.language") === "de" ? "de" : "en";
      const t = language === "de" ? de : en;
      const title = this.state.isStaleChunk ? t.common.staleChunkTitle : t.common.errorTitle;
      const description = this.state.isStaleChunk ? t.common.staleChunkDesc : t.common.errorDesc;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
            <div className="font-display font-bold text-foreground">{title}</div>
            <div className="mt-2 text-xs text-muted-foreground">{description}</div>
            {!this.state.isStaleChunk ? (
              <pre className="mt-3 text-[10px] text-muted-foreground whitespace-pre-wrap">
                {this.state.error?.message ?? t.common.unknown}
              </pre>
            ) : null}
            <button
              className="mt-4 w-full h-10 rounded-2xl bg-primary/10 text-primary border border-primary/15 text-sm font-medium"
              onClick={() => window.location.reload()}
            >
              {t.common.reload}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
