import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ai4TWordmark } from "@/components/ai/Ai4TWordmark";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface PublicClubAi4TButtonProps {
  variant?: "hero" | "card";
  className?: string;
}

/** Brand-red border on hover; fixed border width so layout does not shift. */
const ai4tButtonBaseBorderClass = "box-border border-[3px] border-black/10";
const ai4tButtonHoverClass = [
  "transition-[border-color,background-color,color,box-shadow]",
  "hover:!border-[#e31e24] hover:!bg-white hover:!text-neutral-900",
  "disabled:hover:!border-black/10 disabled:hover:!bg-white disabled:hover:!text-neutral-900",
].join(" ");

const ai4tButtonClass = [
  "inline-flex min-h-[44px] min-w-[140px] items-center justify-center gap-2 rounded-full",
  ai4tButtonBaseBorderClass,
  "bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900",
  "shadow-md",
  ai4tButtonHoverClass,
].join(" ");

export function PublicClubAi4TButton({ variant = "hero", className }: PublicClubAi4TButtonProps) {
  const { t } = useLanguage();
  const { club, clubHasAiFeature, clubHasAiFeatureLoading, openAi4tModal } = usePublicClub();

  if (!club?.sectionVisibility.ai4team) return null;

  const active = clubHasAiFeature && !clubHasAiFeatureLoading;
  const inactiveTitle = t.clubPage.ai4teamUnavailable;

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={!active}
      title={!active ? inactiveTitle : undefined}
      onClick={() => active && openAi4tModal()}
      className={cn(
        ai4tButtonClass,
        "gap-2 font-semibold active:!scale-100",
        variant === "hero" && "flex-1 sm:flex-none",
        !active && "cursor-not-allowed opacity-55",
        className,
      )}
    >
      {!active ? <Lock className="h-4 w-4 shrink-0 text-neutral-600" /> : null}
      <Ai4TWordmark className="h-8 w-auto max-w-[160px] shrink-0 object-contain" />
    </Button>
  );
}
