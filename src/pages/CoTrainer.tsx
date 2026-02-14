import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/layout/AppHeader";
import { Bot, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// logo is rendered by AppHeader
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const quickPrompts = [
  { label: "Suggest a lineup", prompt: "Based on recent form, suggest an optimal starting XI for our next match." },
  { label: "Training plan", prompt: "Create a week-long training plan focusing on improving our defensive organization." },
  { label: "Analyze performance", prompt: "Analyze our recent match performance and identify key areas for improvement." },
  { label: "Motivate the team", prompt: "Write a motivational pre-match speech for an important cup game." },
];

const DEMO_RESPONSES: Record<string, string> = {
  lineup: `## Suggested Starting XI (4-3-3)

**GK:** #1 M. Weber
**RB:** #2 L. Fischer | **CB:** #5 T. Braun | **CB:** #4 S. Hoffmann | **LB:** #3 A. Koch
**CM:** #8 J. Meier | **CM:** #6 D. Wagner | **CAM:** #10 K. Bauer
**RW:** #7 P. Richter | **ST:** #9 N. Schmidt | **LW:** #11 F. Schulz

**Key rationale:**
- Schmidt is in top form (4 goals in last 3 matches)
- Wagner provides stability in the midfield pivot
- Richter's pace on the right will exploit their slower left-back

**Bench:** #12 R. Klein (GK), #14 C. Wolf, #16 M. Hartmann, #20 J. Lang, #22 O. Berger`,

  training: `## Weekly Training Plan: Defensive Organization

### Monday: Recovery + Video Analysis
- Light jog (15 min) + stretching
- Video session: Review last match defensive errors
- Individual positional analysis

### Tuesday: Pressing Triggers & Shape
- Warm-up rondos (15 min)
- **Pressing drill:** 6v4 in half-field, trigger on back-pass
- **Defensive shape:** 11v0 walk-through of compact 4-4-2 block
- Small-sided game 8v8 with defensive focus

### Wednesday: Rest Day

### Thursday: Set Pieces & Transition
- Warm-up (15 min)
- **Defensive set pieces:** Corners (zonal marking) + free kicks
- **Counter-pressing:** 5v5+2 transition game
- **Match simulation:** 11v11 (25 min)

### Friday: Tactical Polish + Pre-Match
- Activation warm-up
- **Shadow play:** Defensive movements against expected opponent formation
- Set piece review
- Team talk + mental preparation

**Focus areas:** Compactness between lines, communication, recovery runs.`,

  performance: `## Post-Match Performance Analysis

### Overall Rating: 6.5/10

**Strengths:**
- Ball possession: 58% (above average)
- Successful passes: 412/478 (86.2%)
- Corners won: 7

**Areas for Improvement:**
- **Defensive transitions:** 3 goals conceded from counter-attacks
- **Set piece defending:** Conceded 1 goal from corner
- **Final third efficiency:** 14 shots, only 4 on target (28.6%)

### Player Highlights
| Player | Rating | Key Stat |
|--------|--------|----------|
| N. Schmidt | 8.0 | 2 goals, 1 assist |
| K. Bauer | 7.5 | 89% pass accuracy, 3 key passes |
| D. Wagner | 7.0 | 8 ball recoveries |

### Tactical Recommendation
Switch to a **4-2-3-1** in defensive transitions to add cover in midfield and reduce exposure to counter-attacks.`,

  motivate: `## Pre-Match Speech

Team, listen up.

Every one of you has earned your place here today. Not through luck, not through talent alone, but through **relentless dedication** every single day in training.

Today is not just another match. Today is the match where we show what this team is truly made of. When you step on that pitch, I want you to remember three things:

**Play for each other.** Every sprint, every tackle, every pass is for your teammate next to you. We win as a team or we don't win at all.

**Trust the process.** We have prepared for this. You know the game plan. Trust it, trust your training, trust each other.

**Leave everything on the pitch.** When that final whistle blows, I want every single one of you to know that you gave absolutely everything.

They may have their strengths, but they don't have what we have. They don't have **our bond, our hunger, our belief**.

Now let's go out there and make this club proud. Together.

**ONE4Team!**`,
};

function getDemoResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes("lineup") || lower.includes("starting xi") || lower.includes("formation"))
    return DEMO_RESPONSES.lineup;
  if (lower.includes("training") || lower.includes("plan") || lower.includes("session") || lower.includes("week"))
    return DEMO_RESPONSES.training;
  if (lower.includes("analy") || lower.includes("performance") || lower.includes("review") || lower.includes("improve"))
    return DEMO_RESPONSES.performance;
  if (lower.includes("motiv") || lower.includes("speech") || lower.includes("inspire") || lower.includes("cup"))
    return DEMO_RESPONSES.motivate;
  return `Great question! As your AI Co-Trainer, I can help you with:

- **Lineup suggestions** based on player form and opponent analysis
- **Training plans** tailored to your team's needs
- **Performance analysis** after matches
- **Tactical insights** and formation advice
- **Motivational content** for your team

Try asking me something specific, like "Suggest a lineup for our next match" or "Create a training plan for this week."

*Note: This is a demo response. Once the AI backend is connected, you'll receive personalized insights based on your actual club data.*`;
}

const CoTrainer = () => {
  // navigation is handled by AppHeader
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    // Simulate streaming for demo mode: reveal text word-by-word
    const simulateStream = async (text: string) => {
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        upsertAssistant((i === 0 ? "" : " ") + words[i]);
        // Variable delay: shorter for common words, slightly longer at punctuation
        const delay = words[i].endsWith(".") || words[i].endsWith("!") || words[i].endsWith(":") ? 40 : 18;
        await new Promise(r => setTimeout(r, delay));
      }
    };

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // If no Supabase URL is configured, go straight to demo mode
      if (!supabaseUrl) throw new Error("demo");

      const resp = await fetch(`${supabaseUrl}/functions/v1/co-trainer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          context: clubId ? `Club ID: ${clubId}` : undefined,
        }),
      });

      if (!resp.ok) throw new Error("edge-fn-error");
      if (!resp.body) throw new Error("No stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { /* partial JSON */ }
        }
      }
    } catch {
      // Fallback: demo mode with simulated streaming
      const lastUserMsg = allMessages[allMessages.length - 1]?.content || "";
      const demoText = getDemoResponse(lastUserMsg);
      await simulateStream(demoText);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    const userMsg: Msg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await streamChat(newMessages);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 lg:pb-0">
      <AppHeader
        title="Co-Trainer"
        subtitle="AI coaching assistant"
        rightSlot={
          messages.length > 0 ? (
            <button
              onClick={() => setMessages([])}
              className="w-9 h-9 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-2xl bg-gradient-gold flex items-center justify-center text-primary-foreground shadow-gold">
              <Bot className="w-4 h-4" />
            </div>
          )
        }
      />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-gold mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Welcome to Co-Trainer</h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                Your AI-powered coaching assistant. Get lineup suggestions, training plans, performance analysis, and tactical insights.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {quickPrompts.map((qp, i) => (
                  <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => handleSend(qp.prompt)}
                    className="p-3 rounded-xl bg-card border border-border text-left hover:border-primary/30 transition-colors group">
                    <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{qp.label}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-primary">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask Co-Trainer anything..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
              className="h-11 w-11 rounded-xl bg-gradient-gold-static text-primary-foreground hover:brightness-110 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoTrainer;
