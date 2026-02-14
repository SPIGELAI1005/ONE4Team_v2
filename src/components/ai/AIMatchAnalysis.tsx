import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot, Loader2, FileText, Eye, Dumbbell, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import type { AIMatchAnalysisData } from "@/types/ai";

type AnalysisType = "preview" | "report" | "training" | "injury_risk";

interface AIMatchAnalysisProps {
  matchData: AIMatchAnalysisData;
  teamData?: Record<string, unknown>;
  context?: string;
  matchStatus: string;
}

const analysisTypes: { type: AnalysisType; label: string; icon: React.ElementType; forStatus: string[] }[] = [
  { type: "preview", label: "AI Preview", icon: Eye, forStatus: ["scheduled", "in_progress"] },
  { type: "report", label: "AI Report", icon: FileText, forStatus: ["completed"] },
  { type: "training", label: "Training Plan", icon: Dumbbell, forStatus: ["completed"] },
  { type: "injury_risk", label: "Injury Risk", icon: AlertTriangle, forStatus: ["completed", "scheduled"] },
];

const AIMatchAnalysis = ({ matchData, teamData, context, matchStatus }: AIMatchAnalysisProps) => {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<AnalysisType | null>(null);

  const streamAnalysis = useCallback(async (type: AnalysisType) => {
    setLoading(true);
    setActiveType(type);
    setContent("");
    let assistantSoFar = "";

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-match-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type, matchData, teamData, context }),
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
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantSoFar += c;
              setContent(assistantSoFar);
            }
          } catch {
            // ignore malformed SSE chunks
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate analysis", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [matchData, teamData, context, toast]);

  const available = analysisTypes.filter(a => a.forStatus.includes(matchStatus));

  return (
    <div className="rounded-xl bg-background border border-primary/20 p-4 mt-4">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Bot className="w-3.5 h-3.5 text-primary" /> AI ANALYSIS
      </h4>

      <div className="flex flex-wrap gap-1 mb-3">
        {available.map(a => (
          <Button key={a.type} size="sm" variant={activeType === a.type ? "default" : "outline"}
            className={`text-[10px] h-7 ${activeType === a.type ? "bg-gradient-gold-static text-primary-foreground" : ""}`}
            onClick={() => streamAnalysis(a.type)} disabled={loading}>
            <a.icon className="w-3 h-3 mr-1" /> {a.label}
          </Button>
        ))}
      </div>

      {loading && !content && (
        <div className="flex items-center gap-2 py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Generating analysis...</span>
        </div>
      )}

      {content && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="prose prose-sm prose-invert max-w-none text-sm text-foreground [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-primary">
          <ReactMarkdown>{content}</ReactMarkdown>
        </motion.div>
      )}
    </div>
  );
};

export default AIMatchAnalysis;
