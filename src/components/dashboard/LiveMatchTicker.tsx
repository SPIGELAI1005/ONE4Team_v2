import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type LiveMatch = {
  id: string;
  opponent: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  status: string;
  team_name?: string;
};

const LiveMatchTicker = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchLiveMatches = async () => {
      // Get user's club memberships
      const { data: memberships } = await supabase
        .from("club_memberships")
        .select("club_id")
        .eq("user_id", user.id);

      if (!memberships?.length) return;

      const clubIds = memberships.map((m) => m.club_id);

      const { data } = await supabase
        .from("matches")
        .select("id, opponent, is_home, home_score, away_score, match_date, status, team_id")
        .in("club_id", clubIds)
        .eq("status", "in_progress");

      if (data) {
        setMatches(
          data.map((m) => ({
            ...m,
            team_name: undefined,
          }))
        );
      }
    };

    fetchLiveMatches();

    // Subscribe to real-time match updates
    const channel = supabase
      .channel("live-matches")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
        },
        (payload) => {
          const updated = payload.new as LiveMatch;
          setMatches((prev) => {
            if (updated.status === "in_progress") {
              const exists = prev.find((m) => m.id === updated.id);
              if (exists) {
                return prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m));
              }
              return [...prev, updated];
            } else {
              return prev.filter((m) => m.id !== updated.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Demo data when no live matches
  const displayMatches: LiveMatch[] =
    matches.length > 0
      ? matches
      : [
          {
            id: "demo-1",
            opponent: "FC Thunder",
            is_home: true,
            home_score: 2,
            away_score: 1,
            match_date: new Date().toISOString(),
            status: "in_progress",
            team_name: "U17",
          },
          {
            id: "demo-2",
            opponent: "SC Eagles",
            is_home: false,
            home_score: 0,
            away_score: 0,
            match_date: new Date().toISOString(),
            status: "in_progress",
            team_name: "U14",
          },
        ];

  if (displayMatches.length === 0) return null;

  const safeIndex = current % displayMatches.length;
  const match = displayMatches[safeIndex];

  const navigateMatch = (dir: number) => {
    setCurrent((prev) => (prev + dir + displayMatches.length) % displayMatches.length);
  };

  // Calculate elapsed minutes (demo approximation)
  const elapsed = Math.min(
    90,
    Math.floor((Date.now() - new Date(match.match_date).getTime()) / 60000)
  );
  const displayMinute = elapsed > 0 && elapsed <= 90 ? elapsed : 45;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-gradient-to-r from-accent/10 via-card to-accent/10 border border-accent/20 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Live</span>
        </div>

        {/* Navigation left */}
        {displayMatches.length > 1 && (
          <button
            onClick={() => navigateMatch(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Score card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={match.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex items-center justify-center gap-4"
          >
            <div className="text-right flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {match.is_home ? (match.team_name || "Our Team") : match.opponent}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <motion.span
                key={`home-${match.home_score}`}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-xl font-display font-bold text-foreground tabular-nums"
              >
                {match.is_home ? (match.home_score ?? 0) : (match.away_score ?? 0)}
              </motion.span>
              <span className="text-muted-foreground text-xs">–</span>
              <motion.span
                key={`away-${match.away_score}`}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-xl font-display font-bold text-foreground tabular-nums"
              >
                {match.is_home ? (match.away_score ?? 0) : (match.home_score ?? 0)}
              </motion.span>
            </div>

            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {match.is_home ? match.opponent : (match.team_name || "Our Team")}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation right */}
        {displayMatches.length > 1 && (
          <button
            onClick={() => navigateMatch(1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Minute indicator */}
        <div className="flex items-center gap-1 shrink-0 bg-accent/10 rounded-full px-2 py-0.5">
          <Activity className="w-3 h-3 text-accent" />
          <span className="text-xs font-mono font-bold text-accent">{displayMinute}'</span>
        </div>
      </div>

      {/* Match counter */}
      {displayMatches.length > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {displayMatches.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === safeIndex ? "bg-accent" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default LiveMatchTicker;
