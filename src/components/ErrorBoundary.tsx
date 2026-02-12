import React from "react";
import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("UI crash", { error: error.message, stack: error.stack, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
            <div className="font-display font-bold text-foreground">Something went wrong</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Please refresh the page. If this keeps happening, enable debug logs and share the console output.
            </div>
            <pre className="mt-3 text-[10px] text-muted-foreground whitespace-pre-wrap">
{this.state.error?.message ?? "Unknown error"}
            </pre>
            <button
              className="mt-4 w-full h-10 rounded-2xl bg-primary/10 text-primary border border-primary/15 text-sm font-medium"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
