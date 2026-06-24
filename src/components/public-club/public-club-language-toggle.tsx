import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClubPageLanguage } from "@/lib/club-public-page-i18n";

interface PublicClubLanguageToggleProps {
  languages: ClubPageLanguage[];
  value: ClubPageLanguage;
  onChange: (lang: ClubPageLanguage) => void;
  className?: string;
}

const LABELS: Record<ClubPageLanguage, string> = {
  en: "EN",
  de: "DE",
};

export function PublicClubLanguageToggle({
  languages,
  value,
  onChange,
  className,
}: PublicClubLanguageToggleProps) {
  if (languages.length <= 1) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[color:var(--club-border)] bg-white/5 p-0.5",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {languages.map((lang) => {
        const active = lang === value;
        return (
          <Button
            key={lang}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(lang)}
            className={cn(
              "h-7 rounded-full px-2.5 text-xs font-semibold",
              active
                ? "bg-[color:var(--club-primary)] text-[color:var(--club-primary-foreground)] hover:bg-[color:var(--club-primary)]"
                : "text-[color:var(--club-muted)] hover:bg-white/10 hover:text-[color:var(--club-foreground)]",
            )}
            aria-pressed={active}
          >
            {LABELS[lang]}
          </Button>
        );
      })}
    </div>
  );
}
