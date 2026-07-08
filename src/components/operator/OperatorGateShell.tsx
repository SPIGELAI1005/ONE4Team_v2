import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import FootballFieldAnimation from "@/components/landing/FootballFieldAnimation";
import logo from "@/assets/one4team-logo.png";

interface OperatorGateShellProps {
  language: string;
  controlCenterLabel?: string;
  children: ReactNode;
  onLogoClick?: () => void;
}

export function OperatorGateShell({ language, controlCenterLabel = "Control Center", children, onLogoClick }: OperatorGateShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none fixed inset-0">
        <FootballFieldAnimation lang={language} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70 dark:from-background/80 dark:via-background/40 dark:to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20 dark:from-background/60 dark:via-transparent dark:to-background/60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.div
          whileTap={onLogoClick ? { scale: 0.95 } : undefined}
          className={`mb-8 text-center ${onLogoClick ? "cursor-pointer" : ""}`}
          onClick={onLogoClick}
        >
          <img src={logo} alt="ONE4Team" className="mx-auto mb-4 h-16 w-16 drop-shadow-xl" />
          <h1 className="font-logo text-2xl tracking-tight">
            ONE <span className="text-gradient-gold-animated">4</span> Team
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{controlCenterLabel}</p>
        </motion.div>
        {children}
      </motion.div>
    </div>
  );
}

export function OperatorGateLoadingCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl glass-card p-8 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
