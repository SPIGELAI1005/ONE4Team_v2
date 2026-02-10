import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClubId } from "@/hooks/use-club-id";
import ReactMarkdown from "react-markdown";

const quickQueries = [
  "Who scored the most goals this season?",
  "What's our win rate in away matches?",
  "Which player has the best attendance?",
  "How many clean sheets this season?",
];

const NaturalLanguageStats = () => {
  const { clubId } = useClubId();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const askQuestion = useCallback(async (q: string) => {
    if (!clubId || !q.trim()) return;
    setLoading(true);
    setAnswer("");
    setQuery(q);

    // Gather stats context
    const [matchesRes, eventsRes, membersRes] = await Promise.all([
      supabase.from("matches").select("*").eq("club_id", clubId).eq("status", "completed"),
      supabase.from("match_events").select("*").eq("match_id", "dummy").limit(0), // will fill below
      supabase.from("club_memberships").select("id, profiles!club_memberships_user_id_fkey(display_name)").eq("club_id", clubId) as any,
    ]);

    const matches = matchesRes.data || [];
    const matchIds = matches.map(m => m.id);

    let events: any[] = [];
    if (matchIds.length > 0) {
      const { data } = await supabase.from("match_events").select("*").in("match_id", matchIds);
      events = data || [];
    }

    const nameMap: Record<string, string> = {};
    (membersRes.data || []).forEach((m: any) => { nameMap[m.id] = m.profiles?.display_name || "Player"; });

    // Build stats summary for AI
    const statsSummary = {
      totalMatches: matches.length,
      matches: matches.map(m => ({
        opponent: m.opponent,
        date: m.match_date,
        home_score: m.home_score,
        away_score: m.away_score,
        is_home: m.is_home,
      })),
      events: events.map(e => ({
        type: e.event_type,
        player: nameMap[e.membership_id] || "Unknown",
        minute: e.minute,
      })),
    };

    let assistantSoFar = "";
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-match-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "stats_query",
          matchData: statsSummary,
          context: `User question: ${q}`,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        toast({ title: "AI Error", description: err.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No stream");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { assistantSoFar += c; setAnswer(assistantSoFar); }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to query stats", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, toast]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-primary/20 p-5">
      <h3 className="font-display font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" /> Ask About Your Stats
      </h3>

      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") askQuestion(query); }}
          placeholder="Ask anything about your team stats..."
          className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" onClick={() => askQuestion(query)} disabled={loading || !query.trim()}
          className="h-9 bg-gradient-gold text-primary-foreground hover:opacity-90">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {quickQueries.map((qq, i) => (
          <button key={i} onClick={() => askQuestion(qq)}
            className="text-[10px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            {qq}
          </button>
        ))}
      </div>

      {answer && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="prose prose-sm prose-invert max-w-none text-sm text-foreground p-3 rounded-lg bg-gradient-gold-subtle border border-primary/10 [&_p]:my-1 [&_strong]:text-primary">
          <ReactMarkdown>{answer}</ReactMarkdown>
        </motion.div>
      )}
    </motion.div>
  );
};

export default NaturalLanguageStats;
