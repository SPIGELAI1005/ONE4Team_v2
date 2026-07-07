import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { DASHBOARD_HEADER_ICON } from "@/lib/dashboard-page-shell";

interface ThemeToggleProps {
  size?: "sm" | "default";
  className?: string;
}

export function ThemeToggle({ size = "default", className }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "sm" : "icon"}
      onClick={toggleTheme}
      className={cn(className)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className={cn(DASHBOARD_HEADER_ICON, "text-muted-foreground hover:text-foreground transition-colors")} />
      ) : (
        <Moon className={cn(DASHBOARD_HEADER_ICON, "text-muted-foreground hover:text-foreground transition-colors")} />
      )}
    </Button>
  );
}
