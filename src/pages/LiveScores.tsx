import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { Activity, Trophy, Clock, MapPin, RefreshCw } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
// logo is rendered by AppHeader

type LiveMatch = {
  id: string;
  opponent: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  status: string;
  location: string | null;
  club_id: string;
  team_id: string | null;
  clubs?: { name: string; logo_url: string | null; primary_color: string | null } | null;
  teams?: { name: string } | null;
};

const LiveScores = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [clubIds, setClubIds] = useState<string[]>([]);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMatches = useCallback(async (ids = clubIds) => {
    if (!user) return;
    setLoading(true);

    if (!ids.length) {
      setMatches([]);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("matches")
      .select("id, opponent, is_home, home_score, away_score, match_date, status, location, club_id, team_id, clubs(name, logo_url, primary_color), teams(name)")
      .eq("status", "in_progress")
      .in("club_id", ids)
      .order("match_date", { ascending: true });

    if (data) setMatches(data as unknown as LiveMatch[]);
    setLastUpdated(new Date());
    setLoading(false);
  }, [clubIds, user]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("club_memberships")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      const ids = Array.from(new Set((data || []).map((r) => r.club_id)));
      setClubIds(ids);
      await fetchMatches(ids);

      // Subscribe to real-time updates (scoped)
      const channels = ids.map((cid) =>
        supabase
          .channel(`live-scores-${cid}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "matches", filter: `club_id=eq.${cid}` },
            (payload) => {
              const updated = payload.new as LiveMatch;
              if (payload.eventType === "UPDATE") {
                setMatches((prev) => {
                  if (updated.status === "in_progress") {
                    const exists = prev.find((m) => m.id === updated.id);
                    if (exists) {
                      return prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m));
                    }
                    // Refetch to get joins
                    fetchMatches(ids);
                    return prev;
                  }
                  return prev.filter((m) => m.id !== updated.id);
                });
                setLastUpdated(new Date());
              } else if (payload.eventType === "INSERT" && updated.status === "in_progress") {
                fetchMatches(ids);
              }
            }
          )
          .subscribe()
      );

      return () => {
        channels.forEach((ch) => supabase.removeChannel(ch));
      };
    };

    let cleanup: undefined | (() => void);
    void run().then((c) => {
      cleanup = c;
    });

    return () => {
      cleanup?.();
    };
  }, [user, fetchMatches]);

  const getElapsedMinutes = (matchDate: string) => {
    const elapsed = Math.floor((Date.now() - new Date(matchDate).getTime()) / 60000);
    if (elapsed < 0) return "Pre";
    if (elapsed > 90) return "90+";
    return `${elapsed}'`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title={t.liveScores.title} subtitle={t.liveScores.signInToSeeClubs} back={false} />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center rounded-3xl glass-card p-8">
            <div className="text-sm font-medium text-foreground">{t.liveScores.signInRequired}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.liveScores.signInRequiredDesc}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={t.liveScores.title}
        subtitle={t.liveScores.realTimeUpdates}
        back={false}
        rightSlot={
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              {t.liveScores.updated} {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchMatches}
              className="w-8 h-8 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      <main className="container mx-auto px-4 py-8">
        {/* Live indicator banner */}
        <div className="flex items-center gap-2 mb-6">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
          </span>
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">
            {matches.length > 0 ? `${matches.length} ${t.liveScores.matchesInProgress}` : t.liveScores.noLiveMatches}
          </span>
        </div>

        {matches.length === 0 && !loading ? (
          <div className="text-center py-20">
            <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">
              {t.liveScores.noMatchesInProgress}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t.liveScores.liveScoresWillAppear}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {matches.map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl bg-card border border-border overflow-hidden group hover:border-accent/30 transition-colors"
                >
                  {/* Club banner */}
                  <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {match.clubs?.logo_url ? (
                        <img src={match.clubs.logo_url} alt="" className="w-5 h-5 rounded" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                          {match.clubs?.name?.[0] || "C"}
                        </div>
                      )}
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {match.clubs?.name || "Club"}
                      </span>
                    </div>
                    {match.teams?.name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {match.teams.name}
                      </span>
                    )}
                  </div>

                  {/* Score area */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 text-center">
                        <p className="text-sm font-semibold text-foreground">
                          {match.is_home ? (match.clubs?.name || "Home") : match.opponent}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {match.is_home ? "HOME" : "AWAY"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 px-4">
                        <motion.span
                          key={`h-${match.home_score}`}
                          initial={{ scale: 1.4 }}
                          animate={{ scale: 1 }}
                          className="text-3xl font-display font-bold text-foreground tabular-nums"
                        >
                          {match.home_score ?? 0}
                        </motion.span>
                        <span className="text-lg text-muted-foreground">–</span>
                        <motion.span
                          key={`a-${match.away_score}`}
                          initial={{ scale: 1.4 }}
                          animate={{ scale: 1 }}
                          className="text-3xl font-display font-bold text-foreground tabular-nums"
                        >
                          {match.away_score ?? 0}
                        </motion.span>
                      </div>

                      <div className="flex-1 text-center">
                        <p className="text-sm font-semibold text-foreground">
                          {match.is_home ? match.opponent : (match.clubs?.name || "Away")}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {match.is_home ? "AWAY" : "HOME"}
                        </p>
                      </div>
                    </div>

                    {/* Footer info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-accent/10 rounded-full px-2.5 py-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                        </span>
                        <span className="text-xs font-mono font-bold text-accent">
                          {getElapsedMinutes(match.match_date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {match.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {match.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(match.match_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Demo section when no real data */}
        {matches.length === 0 && !loading && (
          <div className="mt-12">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">{t.liveScores.previewDemoScores}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
              {[
                { home: "FC Riverside", away: "FC Thunder", hs: 2, as: 1, min: "67'", loc: "Main Stadium" },
                { home: "SC Eagles", away: "FC Riverside U14", hs: 0, as: 0, min: "23'", loc: "Training Ground B" },
              ].map((demo, i) => (
                <div key={i} className="rounded-xl bg-card border border-border/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 text-center">
                      <p className="text-sm font-semibold text-foreground">{demo.home}</p>
                      <p className="text-[10px] text-muted-foreground">{t.common.home.toUpperCase()}</p>
                    </div>
                    <div className="flex items-center gap-3 px-4">
                      <span className="text-3xl font-display font-bold text-foreground">{demo.hs}</span>
                      <span className="text-lg text-muted-foreground">–</span>
                      <span className="text-3xl font-display font-bold text-foreground">{demo.as}</span>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-sm font-semibold text-foreground">{demo.away}</p>
                      <p className="text-[10px] text-muted-foreground">{t.common.away.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-accent/10 rounded-full px-2.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-xs font-mono font-bold text-accent">{demo.min}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {demo.loc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveScores;
