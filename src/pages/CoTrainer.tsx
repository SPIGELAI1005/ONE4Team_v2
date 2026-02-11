import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import logo from "@/assets/logo.png";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const quickPrompts = [
  { label: "Suggest a lineup", prompt: "Based on recent form, suggest an optimal starting XI for our next match." },
  { label: "Training plan", prompt: "Create a week-long training plan focusing on improving our defensive organization." },
  { label: "Analyze performance", prompt: "Analyze our recent match performance and identify key areas for improvement." },
  { label: "Motivate the team", prompt: "Write a motivational pre-match speech for an important cup game." },
];

const CoTrainer = () => {
  const navigate = useNavigate();
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

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/co-trainer`, {
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

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: "Connection failed" }));
        toast({ title: "Co-Trainer Error", description: errorData.error || "Something went wrong", variant: "destructive" });
        setIsLoading(false);
        return;
      }

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
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to connect to Co-Trainer", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [clubId, toast]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    const userMsg: Msg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await streamChat(newMessages);
  };

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Please sign in.</p></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">Co-Trainer AI</h1>
            <p className="text-[10px] text-muted-foreground">Your intelligent coaching assistant</p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setMessages([])}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

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
              className="h-11 w-11 rounded-xl bg-gradient-gold text-primary-foreground hover:opacity-90 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default CoTrainer;
