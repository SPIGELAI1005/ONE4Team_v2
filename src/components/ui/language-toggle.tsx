import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  size?: "sm" | "default";
  className?: string;
}

export function LanguageToggle({ size = "default", className }: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "sm" : "icon"}
      onClick={toggleLanguage}
      className={cn(className)}
      aria-label={language === "en" ? "Switch to German" : "Zu Englisch wechseln"}
    >
      <span className="dashboard-header-lang text-muted-foreground transition-colors hover:text-foreground">
        {language === "en" ? "DE" : "EN"}
      </span>
    </Button>
  );
}
