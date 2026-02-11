import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

const LS_KEY = "one4team.activeClubId";

export interface ClubOption {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface MembershipRow {
  club_id: string;
  role: string;
  clubs: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useActiveClub() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setClubs([]);
      setActiveClubId(null);
      setLoading(false);
      return;
    }

    const fetchClubs = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("club_memberships")
        .select("club_id, role, clubs:clubs(id, name, slug)")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) {
        // keep silent for now; calling screens can decide what to show
        setClubs([]);
        setActiveClubId(null);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as MembershipRow[];
      const options: ClubOption[] = rows
        .filter((r) => !!r.clubs)
        .map((r) => ({
          id: r.club_id,
          name: r.clubs!.name,
          slug: r.clubs!.slug,
          role: r.role,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setClubs(options);

      const stored = localStorage.getItem(LS_KEY);
      const preferred = stored && options.some((c) => c.id === stored) ? stored : null;
      const next = preferred ?? options[0]?.id ?? null;

      setActiveClubId(next);
      if (next) localStorage.setItem(LS_KEY, next);
      else localStorage.removeItem(LS_KEY);

      setLoading(false);
    };

    fetchClubs();
  }, [user]);

  const activeClub = useMemo(
    () => clubs.find((c) => c.id === activeClubId) ?? null,
    [clubs, activeClubId],
  );

  const setActive = (clubId: string) => {
    setActiveClubId(clubId);
    localStorage.setItem(LS_KEY, clubId);
  };

  return { clubs, activeClubId, activeClub, setActiveClubId: setActive, loading };
}
