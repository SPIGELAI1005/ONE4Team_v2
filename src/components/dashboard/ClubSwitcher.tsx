import { useActiveClub } from "@/hooks/use-active-club";

export default function ClubSwitcher() {
  const { clubs, activeClubId, setActiveClubId, loading } = useActiveClub();

  if (loading) return null;
  if (!clubs.length) return null;
  if (clubs.length === 1) return null;

  return (
    <select
      value={activeClubId ?? ""}
      onChange={(e) => setActiveClubId(e.target.value)}
      className="h-9 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground backdrop-blur"
      aria-label="Active club"
    >
      {clubs.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
