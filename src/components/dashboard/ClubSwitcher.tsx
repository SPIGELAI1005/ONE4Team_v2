import { useActiveClub } from "@/hooks/use-active-club";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClubSwitcher() {
  const { clubs, activeClubId, setActiveClubId, loading } = useActiveClub();

  if (loading) return null;
  if (!clubs.length) return null;
  if (clubs.length === 1) return null;

  return (
    <Select value={activeClubId ?? clubs[0]?.id} onValueChange={setActiveClubId}>
      <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-xl border-border bg-background/60 text-xs backdrop-blur" aria-label="Active club">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {clubs.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
