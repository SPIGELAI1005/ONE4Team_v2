import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

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
      className={className}
      aria-label={language === "en" ? "Switch to German" : "Zu Englisch wechseln"}
    >
      <span className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        {language === "en" ? "DE" : "EN"}
      </span>
    </Button>
  );
}
