import { ChevronDown, Trophy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { clubCtaHeroGlassLinkClass } from "@/lib/public-club-cta-classes";
import { cn } from "@/lib/utils";

interface PublicClubHeroTeamFilterProps {
  className?: string;
}

export function PublicClubHeroTeamFilter({ className }: PublicClubHeroTeamFilterProps) {
  const { t } = useLanguage();
  const { teams, homeTeamFilterId, setHomeTeamFilterId } = usePublicClub();

  const selectedTeam = homeTeamFilterId ? teams.find((tm) => tm.id === homeTeamFilterId) : null;
  const label = selectedTeam ? selectedTeam.name : t.clubPage.homeViewTeams;

  if (teams.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(clubCtaHeroGlassLinkClass, "cursor-pointer data-[state=open]:border-white/50 data-[state=open]:bg-white/20", className)}
        aria-label={t.clubPage.homeTeamFilterAria}
      >
        <Trophy className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-h-[min(60vh,320px)] w-[min(92vw,280px)] overflow-y-auto">
        <DropdownMenuLabel>{t.clubPage.homeTeamFilterLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(!homeTeamFilterId && "bg-muted/60 font-medium")}
          onSelect={() => setHomeTeamFilterId("")}
        >
          {t.clubPage.scheduleTeamAll}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            className={cn(homeTeamFilterId === team.id && "bg-muted/60 font-medium")}
            onSelect={() => setHomeTeamFilterId(team.id)}
          >
            {team.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
