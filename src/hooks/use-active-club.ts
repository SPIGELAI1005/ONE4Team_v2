import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

const CLUB_KEY_PREFIX = "one4team.activeClubId";
const ACTIVE_CLUB_CHANGED_EVENT = "one4team:active-club-changed";

export interface ClubOption {
  id: string;
  /** Active club_memberships.id for scoped role assignments (Option 2 RBAC). */
  membershipId: string;
  name: string;
  slug: string;
  /** Legacy primary label from club_memberships.role (app_role). */
  role: string;
}

interface MembershipRow {
  id: string;
  club_id: string;
  role: string;
  created_at: string;
  clubs: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface ActiveClubChangeDetail {
  userClubKey: string;
  clubId: string;
}

export function useActiveClub() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userClubKey = user ? `${CLUB_KEY_PREFIX}:${user.id}` : null;

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
        .select("id, club_id, role, created_at, clubs:clubs(id, name, slug)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        // keep silent for now; calling screens can decide what to show
        setClubs([]);
        setActiveClubId(null);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as MembershipRow[];
      const seenClub = new Set<string>();
      const options: ClubOption[] = [];
      for (const r of rows) {
        if (!r.clubs || seenClub.has(r.club_id)) continue;
        seenClub.add(r.club_id);
        options.push({
          id: r.club_id,
          membershipId: r.id,
          name: r.clubs.name,
          slug: r.clubs.slug,
          role: r.role,
        });
      }
      options.sort((a, b) => a.name.localeCompare(b.name));

      setClubs(options);

      const stored = (userClubKey ? localStorage.getItem(userClubKey) : null) ?? localStorage.getItem(CLUB_KEY_PREFIX);
      const preferred = stored && options.some((c) => c.id === stored) ? stored : null;
      const next = preferred ?? options[0]?.id ?? null;

      setActiveClubId(next);
      if (next && userClubKey) localStorage.setItem(userClubKey, next);
      localStorage.removeItem(CLUB_KEY_PREFIX);
      if (!next && userClubKey) localStorage.removeItem(userClubKey);

      setLoading(false);
    };

    fetchClubs();
  }, [user, userClubKey]);

  useEffect(() => {
    if (!userClubKey) return;

    function handleStorage(event: StorageEvent) {
      if (event.key !== userClubKey) return;
      const nextClubId = event.newValue;
      setActiveClubId(nextClubId);
    }

    function handleActiveClubChanged(event: Event) {
      const customEvent = event as CustomEvent<ActiveClubChangeDetail>;
      const detail = customEvent.detail;
      if (!detail || detail.userClubKey !== userClubKey) return;
      setActiveClubId(detail.clubId);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(ACTIVE_CLUB_CHANGED_EVENT, handleActiveClubChanged as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(ACTIVE_CLUB_CHANGED_EVENT, handleActiveClubChanged as EventListener);
    };
  }, [userClubKey]);

  const activeClub = useMemo(
    () => clubs.find((c) => c.id === activeClubId) ?? null,
    [clubs, activeClubId],
  );

  const setActive = (clubId: string) => {
    if (!userClubKey) return;
    const isClubAvailable = clubs.some((club) => club.id === clubId);
    if (!isClubAvailable) return;
    setActiveClubId(clubId);
    localStorage.setItem(userClubKey, clubId);
    localStorage.removeItem(CLUB_KEY_PREFIX);
    window.dispatchEvent(
      new CustomEvent<ActiveClubChangeDetail>(ACTIVE_CLUB_CHANGED_EVENT, {
        detail: { userClubKey, clubId },
      }),
    );
  };

  return { clubs, activeClubId, activeClub, setActiveClubId: setActive, loading };
}
