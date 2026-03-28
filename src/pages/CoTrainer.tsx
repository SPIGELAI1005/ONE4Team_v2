import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  ShieldCheck,
  Building2,
  Briefcase,
  ClipboardList,
  ScrollText,
  Shield,
  History,
  ExternalLink,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useLanguage } from "@/hooks/use-language";
import { useActiveClub } from "@/hooks/use-active-club";
import {
  buildClubContext,
  formatClubContextForPrompt,
  mergeQuickPrompts,
  type ClubQuickPrompt,
} from "@/lib/ai-context";
import { getEdgeFunctionAuthHeaders } from "@/lib/edge-function-auth";
// logo is rendered by AppHeader
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

type AiRequestKind = "training_plan" | "admin_digest";

type AiRequestRow = {
  id: string;
  club_id: string;
  user_id: string;
  kind: AiRequestKind;
  input: unknown;
  output: unknown;
  model: string | null;
  created_at: string;
};

type AiConversationRow = {
  id: string;
  title: string;
  updated_at: string;
  messages: unknown;
};

type RoleKey = "admin" | "trainer" | "player" | "member" | "staff" | "parent" | "sponsor" | "supplier" | "service_provider" | "consultant";

type QuickPrompt = { label: string; prompt: string };

function buildQuickPrompts(role: RoleKey, language: "en" | "de"): QuickPrompt[] {
  const isGerman = language === "de";
  if (role === "admin") {
    return [
      {
        label: isGerman ? "Wochendigest" : "Weekly admin digest",
        prompt: isGerman
          ? "Erstelle ein wochentliches Leadership-Digest mit Top-Prioritaten, Risiken und Verantwortlichen."
          : "Create a weekly leadership digest with top priorities, risks, and owner actions.",
      },
      {
        label: isGerman ? "Beitrags-Follow-up" : "Payment follow-up plan",
        prompt: isGerman
          ? "Entwirf einen professionellen Follow-up-Plan fur uberfallige Mitgliedsbeitrage."
          : "Draft a professional follow-up plan for overdue membership dues.",
      },
      {
        label: isGerman ? "Vereinsankundigung" : "Club announcement",
        prompt: isGerman
          ? "Schreibe eine kurze vereinsweite Ankundigung fur den Zeitplan der nachsten zwei Wochen."
          : "Write a concise club-wide announcement for the next two weeks schedule.",
      },
      {
        label: isGerman ? "Operations-Checkliste" : "Operations checklist",
        prompt: isGerman
          ? "Erstelle eine Operations-Checkliste fur Spieltag, Training und Kommunikation."
          : "Generate an operations checklist for matchday, training, and communication tasks.",
      },
    ];
  }

  if (role === "player") {
    return [
      {
        label: isGerman ? "Personlicher 7-Tage-Plan" : "Personal improvement plan",
        prompt: isGerman
          ? "Erstelle einen personlichen 7-Tage-Verbesserungsplan fur einen Spieler mit Fokus auf Fitness und Entscheidungen."
          : "Create a 7-day personal improvement plan for a player focusing on fitness and decision-making.",
      },
      {
        label: isGerman ? "Match-Vorbereitung" : "Match preparation",
        prompt: isGerman
          ? "Gib mir eine Vorbereitungsroutine fur den Abend vor dem Spiel und den Spieltag-Morgen."
          : "Give me a pre-match preparation routine for the evening before and match day morning.",
      },
      {
        label: isGerman ? "Leistungsanalyse" : "Performance review",
        prompt: isGerman
          ? "Hilf mir bei der Analyse meines letzten Spiels mit Starken, Fehlern und 3 konkreten Verbesserungen."
          : "Help me review my last match with strengths, mistakes, and 3 concrete improvements.",
      },
      {
        label: isGerman ? "Mentale Fokusroutine" : "Mental focus routine",
        prompt: isGerman
          ? "Schlage eine kurze mentale Fokusroutine vor Training und Spielen vor."
          : "Suggest a short mental focus routine before training and matches.",
      },
    ];
  }

  return [
    {
      label: isGerman ? "Aufstellung vorschlagen" : "Suggest a lineup",
      prompt: isGerman
        ? "Schlage basierend auf der aktuellen Form eine optimale Startelf fur unser nachstes Spiel vor."
        : "Based on recent form, suggest an optimal starting XI for our next match.",
    },
    {
      label: isGerman ? "Trainingsplan" : "Training plan",
      prompt: isGerman
        ? "Erstelle einen Wochen-Trainingsplan mit Fokus auf verbesserte Defensivorganisation."
        : "Create a week-long training plan focusing on improving our defensive organization.",
    },
    {
      label: isGerman ? "Leistung analysieren" : "Analyze performance",
      prompt: isGerman
        ? "Analysiere unsere letzten Spiele und identifiziere die wichtigsten Verbesserungsfelder."
        : "Analyze our recent match performance and identify key areas for improvement.",
    },
    {
      label: isGerman ? "Team motivieren" : "Motivate the team",
      prompt: isGerman
        ? "Schreibe eine motivierende Ansprache vor einem wichtigen Pokalspiel."
        : "Write a motivational pre-match speech for an important cup game.",
    },
  ];
}

function getAssistantRoleName(role: RoleKey): string {
  const roleNames: Record<RoleKey, string> = {
    admin: "Co-Admin",
    trainer: "Co-Trainer",
    player: "Co-Player",
    member: "Co-Member",
    staff: "Co-Staff",
    parent: "Co-Parent",
    sponsor: "Co-Sponsor",
    supplier: "Co-Supplier",
    service_provider: "Co-Service",
    consultant: "Co-Consultant",
  };
  return roleNames[role];
}

function startOfDayCtx(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDaysCtx(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function fmtDateCtx(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

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

async function parseEdgeError(resp: Response): Promise<string> {
  const raw = await resp.text();
  const trimmed = raw.trim();
  if (!trimmed) return `HTTP ${resp.status}`;
  try {
    const j = JSON.parse(trimmed) as { error?: string; message?: string };
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
    if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
  } catch {
    /* not JSON */
  }
  if (trimmed.length > 320) return `${trimmed.slice(0, 320)}…`;
  return trimmed;
}

function formatThrownError(e: unknown): string {
  if (e instanceof Error && e.message?.trim()) return e.message.trim();
  const s = String(e);
  if (s === "[object Object]") return "Unknown error (see browser console)";
  return s.length > 240 ? `${s.slice(0, 240)}…` : s;
}

function getDemoResponse(
  userMessage: string,
  assistantRoleName: string,
  demo: { intro: string; note: string },
): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes("lineup") || lower.includes("starting xi") || lower.includes("formation"))
    return DEMO_RESPONSES.lineup;
  if (lower.includes("training") || lower.includes("plan") || lower.includes("session") || lower.includes("week"))
    return DEMO_RESPONSES.training;
  if (lower.includes("analy") || lower.includes("performance") || lower.includes("review") || lower.includes("improve"))
    return DEMO_RESPONSES.performance;
  if (lower.includes("motiv") || lower.includes("speech") || lower.includes("inspire") || lower.includes("cup"))
    return DEMO_RESPONSES.motivate;
  const head = demo.intro.replace("{role}", assistantRoleName);
  return `${head}

- **Lineup suggestions** based on player form and opponent analysis
- **Training plans** tailored to your team's needs
- **Performance analysis** after matches
- **Tactical insights** and formation advice
- **Motivational content** for your team

Try asking me something specific, like "Suggest a lineup for our next match" or "Create a training plan for this week."

${demo.note}`;
}

const CoTrainer = () => {
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { activeClub } = useActiveClub();
  const perms = usePermissions();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mainTab, setMainTab] = useState<"chat" | "actions" | "history">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const extraUrlContextRef = useRef<string | null>(null);
  const urlConsumedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const [clubContextText, setClubContextText] = useState("");
  const [smartPrompts, setSmartPrompts] = useState<ClubQuickPrompt[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [toolActivities, setToolActivities] = useState<
    Array<{ id: string; type: string; title: string; starts_at: string }>
  >([]);
  const [toolDuesUnpaid, setToolDuesUnpaid] = useState<number | null>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [aiLog, setAiLog] = useState<AiRequestRow[]>([]);
  const [conversations, setConversations] = useState<AiConversationRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [toolBusy, setToolBusy] = useState<AiRequestKind | null>(null);
  const [toolOutput, setToolOutput] = useState("");

  const roleKey = (perms.role || "trainer") as RoleKey;
  const assistantRoleName = useMemo(() => getAssistantRoleName(roleKey), [roleKey]);
  const fallbackPrompts = useMemo(() => buildQuickPrompts(roleKey, language), [roleKey, language]);
  const quickPrompts = useMemo(() => mergeQuickPrompts(smartPrompts, fallbackPrompts, 8), [smartPrompts, fallbackPrompts]);
  const clubName = activeClub?.name || "your club";
  const canSeeAiLog = perms.isTrainer;
  const dashboardRolePath = perms.role || "player";

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (urlConsumedRef.current) return;
    const tabParam = searchParams.get("tab");
    const promptParam = searchParams.get("prompt");
    const contextParam = searchParams.get("context");
    if (tabParam === "actions" || tabParam === "history") setMainTab(tabParam);
    if (promptParam) setInput(decodeURIComponent(promptParam));
    if (contextParam) extraUrlContextRef.current = decodeURIComponent(contextParam);
    if (tabParam || promptParam || contextParam) {
      urlConsumedRef.current = true;
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!clubId) {
      setClubContextText("");
      setSmartPrompts([]);
      setToolActivities([]);
      setToolDuesUnpaid(null);
      return;
    }
    let cancelled = false;
    setContextLoading(true);
    void buildClubContext(supabase, {
      clubId,
      clubName,
      language,
      isAdmin: perms.isAdmin,
    })
      .then((data) => {
        if (cancelled) return;
        setClubContextText(data.contextText);
        setSmartPrompts(data.suggestedPrompts);
        setToolActivities(data.activities);
        setToolDuesUnpaid(data.unpaidDues);
      })
      .catch(() => {
        if (!cancelled)
          toast({
            title: "Error",
            description: language === "de" ? "Vereinskontext konnte nicht geladen werden." : "Could not load club context.",
            variant: "destructive",
          });
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, clubName, language, perms.isAdmin, toast]);

  const loadHistoryData = useCallback(async () => {
    if (!user || !clubId) return;
    setHistoryLoading(true);
    try {
      const convoPromise = supabase
        .from("ai_conversations")
        .select("id, title, updated_at, messages")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(40);
      const logPromise = canSeeAiLog
        ? supabase
            .from("ai_requests")
            .select("id, club_id, user_id, kind, input, output, model, created_at")
            .eq("club_id", clubId)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] as AiRequestRow[], error: null as null });
      const [cRes, lRes] = await Promise.all([convoPromise, logPromise]);
      if (!cRes.error && cRes.data) setConversations((cRes.data as unknown as AiConversationRow[]) ?? []);
      if (canSeeAiLog && lRes && "data" in lRes && !lRes.error)
        setAiLog((lRes.data as unknown as AiRequestRow[]) ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, clubId, canSeeAiLog]);

  useEffect(() => {
    if (mainTab === "history") void loadHistoryData();
  }, [mainTab, loadHistoryData]);

  const schedulePersistMessages = useCallback((msgs: Msg[]) => {
    if (!user || !clubId || msgs.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void (async () => {
        const serializable = msgs.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date().toISOString(),
        }));
        const title =
          msgs.find((m) => m.role === "user")?.content?.slice(0, 72).replace(/\s+/g, " ").trim() || "Chat";
        try {
          const cid = conversationIdRef.current;
          if (!cid) {
            const { data, error } = await supabase
              .from("ai_conversations")
              .insert({
                club_id: clubId,
                user_id: user.id,
                title,
                messages: serializable,
              })
              .select("id")
              .maybeSingle();
            if (!error && data?.id) {
              conversationIdRef.current = data.id;
              setConversationId(data.id);
            }
          } else {
            await supabase
              .from("ai_conversations")
              .update({ title, messages: serializable, updated_at: new Date().toISOString() })
              .eq("id", cid)
              .eq("club_id", clubId)
              .eq("user_id", user.id);
          }
        } catch {
          /* ignore */
        }
      })();
    }, 600);
  }, [user, clubId]);

  const streamChat = useCallback(
    async (allMessages: Msg[]) => {
      setIsLoading(true);
      let assistantSoFar = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const setAssistantContent = (full: string) => {
        assistantSoFar = full;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: full } : m));
          }
          return [...prev, { role: "assistant", content: full }];
        });
      };

      const simulateStream = async (text: string) => {
        const words = text.split(" ");
        for (let i = 0; i < words.length; i++) {
          upsertAssistant((i === 0 ? "" : " ") + words[i]);
          const delay = words[i].endsWith(".") || words[i].endsWith("!") || words[i].endsWith(":") ? 40 : 18;
          await new Promise((r) => setTimeout(r, delay));
        }
      };

      const showChatError = (description: string, includeHint: boolean) => {
        toast({
          title: t.coTrainerPage.chatErrorTitle,
          description,
          variant: "destructive",
        });
        const body = includeHint
          ? `**${t.coTrainerPage.chatErrorHeading}**\n\n${description}\n\n${t.coTrainerPage.chatErrorHint}`
          : `**${t.coTrainerPage.chatErrorHeading}**\n\n${description}`;
        setAssistantContent(body);
      };

      try {
        const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrlRaw) {
          const lastUserMsg = allMessages[allMessages.length - 1]?.content || "";
          const demoText = getDemoResponse(lastUserMsg, assistantRoleName, {
            intro: t.coTrainerPage.demoIntro,
            note: t.coTrainerPage.demoNote,
          });
          await simulateStream(demoText);
          return;
        }

        const supabaseUrl = String(supabaseUrlRaw).trim().replace(/\/+$/, "");
        try {
          // Validate project URL (typos / spaces in .env break fetch with an opaque error).
          new URL(`${supabaseUrl}/functions/v1/co-trainer`);
        } catch {
          showChatError(t.coTrainerPage.chatErrorInvalidSupabaseUrl, false);
          return;
        }

        if (!clubId) {
          showChatError(t.coTrainerPage.chatErrorNoClub, false);
          return;
        }

        const authHeaders = await getEdgeFunctionAuthHeaders();
        if (!authHeaders.Authorization) {
          showChatError(t.coTrainerPage.chatErrorSignIn, false);
          return;
        }

        const contextPayload = formatClubContextForPrompt(
          clubContextText || `Club ID: ${clubId ?? "unknown"} | Language: ${language}`,
          extraUrlContextRef.current,
        );

        let bodyStr: string;
        try {
          bodyStr = JSON.stringify({
            club_id: clubId,
            messages: allMessages,
            context: contextPayload,
          });
        } catch (stringifyErr) {
          console.error(stringifyErr);
          showChatError(t.coTrainerPage.chatErrorSerialize, false);
          return;
        }

        const resp = await fetch(`${supabaseUrl}/functions/v1/co-trainer`, {
          method: "POST",
          headers: authHeaders,
          body: bodyStr,
        });

        if (!resp.ok) {
          const errMsg = await parseEdgeError(resp);
          showChatError(errMsg, true);
          return;
        }

        if (!resp.body) {
          showChatError(t.coTrainerPage.chatErrorNoStream, true);
          return;
        }

        let streamModelError: string | null = null;

        const processSseLine = (line: string) => {
          if (streamModelError) return;
          if (line.startsWith(":") || line.trim() === "") return;
          if (!line.startsWith("data: ")) return;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") return;
          try {
            const parsed = JSON.parse(jsonStr) as {
              choices?: Array<{ delta?: { content?: string } }>;
              error?: { message?: string; code?: string; type?: string } | string;
            };
            if (parsed.error != null) {
              const em =
                typeof parsed.error === "string"
                  ? parsed.error
                  : parsed.error?.message ||
                    [parsed.error?.type, parsed.error?.code].filter(Boolean).join(" ") ||
                    "Stream error from model";
              streamModelError = em;
              return;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            /* partial or unrelated SSE line */
          }
        };

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        while (!streamModelError) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            processSseLine(line);
            if (streamModelError) break;
          }
        }

        if (!streamModelError) {
          textBuffer += decoder.decode();
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            processSseLine(line);
            if (streamModelError) break;
          }
          if (textBuffer.trim()) processSseLine(textBuffer);
        }

        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }

        if (streamModelError) {
          showChatError(streamModelError, true);
          return;
        }

        if (!assistantSoFar.trim()) {
          showChatError(t.coTrainerPage.chatErrorEmptyResponse, true);
        }
      } catch (e) {
        console.error(e);
        const detail = formatThrownError(e);
        const msg =
          detail.length > 0
            ? `${t.coTrainerPage.chatErrorNetwork}\n\n${t.coTrainerPage.chatErrorDetailPrefix} ${detail}`
            : t.coTrainerPage.chatErrorNetwork;
        if (assistantSoFar.trim()) {
          toast({
            title: t.coTrainerPage.chatErrorTitle,
            description: detail || msg,
            variant: "destructive",
          });
          setAssistantContent(
            `${assistantSoFar.trim()}\n\n---\n\n**${t.coTrainerPage.chatErrorHeading}**\n\n${msg}`,
          );
        } else {
          showChatError(msg, true);
        }
      } finally {
        setIsLoading(false);
        extraUrlContextRef.current = null;
        const tail = assistantSoFar;
        if (tail) schedulePersistMessages([...allMessages, { role: "assistant", content: tail }]);
      }
    },
    [
      assistantRoleName,
      clubId,
      language,
      toast,
      t.coTrainerPage.chatErrorTitle,
      t.coTrainerPage.chatErrorHeading,
      t.coTrainerPage.chatErrorHint,
      t.coTrainerPage.chatErrorNoClub,
      t.coTrainerPage.chatErrorSignIn,
      t.coTrainerPage.chatErrorNoStream,
      t.coTrainerPage.chatErrorEmptyResponse,
      t.coTrainerPage.chatErrorNetwork,
      t.coTrainerPage.chatErrorDetailPrefix,
      t.coTrainerPage.chatErrorSerialize,
      t.coTrainerPage.chatErrorInvalidSupabaseUrl,
      t.coTrainerPage.demoIntro,
      t.coTrainerPage.demoNote,
      clubContextText,
      schedulePersistMessages,
    ],
  );

  const upcomingByDay = useMemo(() => {
    const map: Record<string, typeof toolActivities> = {};
    for (const a of toolActivities) {
      const day = fmtDateCtx(new Date(a.starts_at));
      map[day] = map[day] || [];
      map[day].push(a);
    }
    return map;
  }, [toolActivities]);

  const runToolGenerate = async (kind: AiRequestKind) => {
    if (!user || !clubId) return;
    setToolBusy(kind);
    try {
      const input = {
        kind,
        range: { from: fmtDateCtx(startOfDayCtx(new Date())), to: fmtDateCtx(addDaysCtx(startOfDayCtx(new Date()), 7)) },
        activities: toolActivities.map((a) => ({ id: a.id, type: a.type, title: a.title, starts_at: a.starts_at })),
        dues_unpaid_count: toolDuesUnpaid,
      };

      let text = "";
      const serverModel = "edge:co-aimin:v1";
      let generatedByServer = false;

      const serverPayload = {
        kind,
        range: { from: fmtDateCtx(startOfDayCtx(new Date())), to: fmtDateCtx(addDaysCtx(startOfDayCtx(new Date()), 7)) },
        activities: toolActivities.map((a) => ({ id: a.id, type: a.type, title: a.title, starts_at: a.starts_at })),
        dues_unpaid_count: toolDuesUnpaid,
      };

      const serverAttempt = await supabase.functions.invoke("co-aimin", {
        body: { payload: serverPayload, club_id: clubId },
      });
      if (
        !serverAttempt.error &&
        serverAttempt.data &&
        typeof (serverAttempt.data as { output?: unknown }).output === "string"
      ) {
        text = (serverAttempt.data as { output: string }).output;
        generatedByServer = true;
      }

      if (!generatedByServer && kind === "training_plan") {
        const days = Object.keys(upcomingByDay).sort();
        const lines: string[] = [];
        lines.push("CO-TRAINER v1: Weekly plan (stub)\n");
        lines.push("Inputs used:");
        lines.push(`- upcoming activities next 7 days: ${toolActivities.length}`);
        lines.push(
          toolDuesUnpaid !== null
            ? `- unpaid dues count (admin view): ${toolDuesUnpaid}`
            : `- unpaid dues count: (not available)`,
        );
        lines.push("\nPlan:");
        if (days.length === 0) {
          lines.push("- No trainings scheduled. Suggest: add 2 sessions (Tue/Thu) + optional weekend friendly.");
        } else {
          for (const d of days) {
            const items = upcomingByDay[d] || [];
            lines.push(`- ${d}:`);
            for (const it of items) {
              lines.push(
                `  - ${it.type}: ${it.title} @ ${new Date(it.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
              );
            }
            lines.push("  - Focus: warm-up 10m, technical 20m, tactical 20m, small-sided 20m, cooldown 10m");
          }
        }
        text = lines.join("\n");
      } else if (!generatedByServer) {
        const lines: string[] = [];
        lines.push("CO-AImin v1: Admin digest (stub)\n");
        lines.push("This is a deterministic digest generated locally; it is still logged to ai_requests.");
        lines.push("\nHighlights:");
        lines.push(`- Upcoming activities (7d): ${toolActivities.length}`);
        lines.push(`- Days covered: ${Object.keys(upcomingByDay).length}`);
        if (toolDuesUnpaid !== null) lines.push(`- Unpaid dues: ${toolDuesUnpaid}`);
        lines.push("\nNext actions:");
        lines.push("- Check attendance on upcoming trainings");
        lines.push("- Nudge unpaid members (if admin)\n");
        lines.push("Inputs used (JSON):\n" + safeStringify(input));
        text = lines.join("\n");
      }

      setToolOutput(text);
      const output = { text };
      const { error } = await supabase.from("ai_requests").insert({
        club_id: clubId,
        user_id: user.id,
        kind,
        input,
        output,
        model: generatedByServer ? serverModel : "stub:v1",
      });
      if (error) throw error;
      toast({ title: t.ai.generated, description: t.ai.savedToRequests });
      await loadHistoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.ai.failedToGenerate;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setToolBusy(null);
    }
  };

  const triggerAutomationDigest = async () => {
    if (!clubId) return;
    const { error } = await supabase.rpc("enqueue_automation_run", {
      _club_id: clubId,
      _rule_type: "weekly_digest",
      _payload: { requested_by: user?.id, source: "one4ai_hub_manual_trigger" },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Automation queued", description: "Weekly digest run was queued successfully." });
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    conversationIdRef.current = null;
    setInput("");
  };

  const resumeConversation = (row: AiConversationRow) => {
    const raw = row.messages as Array<{ role: string; content: string }>;
    const restored: Msg[] = (raw || [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    setMessages(restored);
    setConversationId(row.id);
    conversationIdRef.current = row.id;
    setMainTab("chat");
  };

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
      <DashboardHeaderSlot
        title={t.coTrainerPage.headerTitle}
        subtitle={t.coTrainerPage.subtitleForClub.replace("{role}", assistantRoleName).replace("{club}", clubName)}
        toolbarRevision={messages.length + mainTab.length}
        rightSlot={
          mainTab === "chat" ? (
            <button
              type="button"
              onClick={handleNewChat}
              className="w-9 h-9 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t.coTrainerPage.newChat}
              title={t.coTrainerPage.newChat}
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-2xl bg-gradient-gold flex items-center justify-center text-primary-foreground shadow-gold">
              <Bot className="w-4 h-4" />
            </div>
          )
        }
      />

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)} className="flex flex-col flex-1 min-h-0">
        <div className="container mx-auto px-4 pt-4 max-w-3xl shrink-0">
          <TabsList className="w-full grid grid-cols-3 h-11 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="chat" className="rounded-lg text-xs gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              {t.coTrainerPage.tabChat}
            </TabsTrigger>
            <TabsTrigger value="actions" className="rounded-lg text-xs gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t.coTrainerPage.tabActions}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs gap-1.5">
              <History className="w-3.5 h-3.5" />
              {t.coTrainerPage.tabHistory}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t.coTrainerPage.workspaceTitle}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {t.coTrainerPage.workspaceSubtitle}
                        {contextLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
                      {assistantRoleName}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full border border-border/60 bg-background/50 text-foreground/80">
                      <Building2 className="w-3 h-3 inline mr-1" />
                      {clubName}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full border border-border/60 bg-background/50 text-foreground/80">
                      <ShieldCheck className="w-3 h-3 inline mr-1" />
                      {clubId
                        ? language === "de"
                          ? "Verbunden"
                          : "Connected"
                        : language === "de"
                          ? "Kein Verein ausgewahlt"
                          : "No club selected"}
                    </span>
                    <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 p-1">
                      <button
                        type="button"
                        onClick={() => setLanguage("en")}
                        className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${language === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => setLanguage("de")}
                        className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${language === "de" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        DE
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {messages.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-3">
                  <div className="text-[11px] text-muted-foreground mb-2">{t.coTrainerPage.suggestedDuringChat}</div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {quickPrompts.map((qp) => (
                      <button
                        key={`live-${qp.label}`}
                        type="button"
                        onClick={() => void handleSend(qp.prompt)}
                        className="p-2.5 rounded-xl bg-background/60 border border-border text-left hover:border-primary/30 hover:bg-primary/5 transition-colors"
                      >
                        <div className="text-[11px] font-medium text-foreground">{qp.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid gap-4 lg:grid-cols-[1.1fr_1fr]"
                >
                  <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-gold mb-4 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.coTrainerPage.welcomeTitle}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {language === "de" ? (
                        <>
                          Du arbeitest mit <span className="text-foreground font-medium">{assistantRoleName}</span>. Stelle
                          strategische Fragen, fordere Plane an und erhalte strukturierte Empfehlungen passend zu deiner Rolle.
                        </>
                      ) : (
                        <>
                          You are working with <span className="text-foreground font-medium">{assistantRoleName}</span>. Ask
                          strategic questions, request plans, and get structured recommendations tailored to your role.
                        </>
                      )}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                        <div className="text-[10px] text-muted-foreground">
                          {language === "de" ? "Assistentenrolle" : "Assistant role"}
                        </div>
                        <div className="text-xs font-semibold text-foreground mt-1">{assistantRoleName}</div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                        <div className="text-[10px] text-muted-foreground">{language === "de" ? "Kontext" : "Context"}</div>
                        <div className="text-xs font-semibold text-foreground mt-1 truncate">{clubName}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">{t.coTrainerPage.suggestedStartsTitle}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                      {quickPrompts.map((qp, i) => (
                        <motion.button
                          key={qp.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 + i * 0.05 }}
                          onClick={() => handleSend(qp.prompt)}
                          className="p-3 rounded-xl bg-background/60 border border-border text-left hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                        >
                          <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                            {qp.label}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                        }`}
                      >
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

          <div className="border-t border-border bg-background/80 backdrop-blur-xl shrink-0">
            <div className="container mx-auto px-4 py-3 max-w-3xl">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t.coTrainerPage.inputPlaceholder.replace("{role}", assistantRoleName)}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="h-11 w-11 rounded-xl bg-gradient-gold-static text-primary-foreground hover:brightness-110 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="flex-1 overflow-y-auto mt-0 px-4 pb-20 data-[state=inactive]:hidden">
          <div className="container mx-auto py-6 max-w-3xl space-y-4">
            {!clubId ? (
              <p className="text-sm text-muted-foreground text-center py-12">{t.ai.selectClub}</p>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                    <div className="flex items-center gap-2 font-display font-bold">
                      <ClipboardList className="w-5 h-5" /> {t.ai.coTrainer}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.ai.coTrainerDesc}</p>
                    <div className="mt-3">
                      <Button
                        className="bg-gradient-gold-static text-primary-foreground font-semibold"
                        onClick={() => runToolGenerate("training_plan")}
                        disabled={toolBusy !== null}
                      >
                        {toolBusy === "training_plan" ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {t.ai.generatePlan}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                    <div className="flex items-center gap-2 font-display font-bold">
                      <ScrollText className="w-5 h-5" /> {t.ai.coAImin}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.ai.coAIminDesc}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="bg-gradient-gold-static text-primary-foreground font-semibold"
                        onClick={() => runToolGenerate("admin_digest")}
                        disabled={toolBusy !== null}
                      >
                        {toolBusy === "admin_digest" ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {t.ai.generateDigest}
                      </Button>
                      <Button variant="outline" onClick={() => void triggerAutomationDigest()} disabled={toolBusy !== null}>
                        Queue digest automation
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/matches"
                    className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-4 flex items-center justify-between gap-2 hover:border-primary/30 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold">{t.coTrainerPage.linkMatchAnalysis}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{t.coTrainerPage.linkMatchAnalysisDesc}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                  <Link
                    to={`/dashboard/${dashboardRolePath}`}
                    className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-4 flex items-center justify-between gap-2 hover:border-primary/30 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold">{t.coTrainerPage.linkStats}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{t.coTrainerPage.linkStatsDesc}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                </div>

                <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                  <div className="flex items-center gap-2 font-display font-bold">
                    <Shield className="w-5 h-5" /> {t.ai.output}
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-xs text-foreground/80 leading-relaxed">
                    {toolOutput || t.ai.outputPlaceholder}
                  </pre>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto mt-0 px-4 pb-20 data-[state=inactive]:hidden">
          <div className="container mx-auto py-6 max-w-3xl space-y-6">
            {historyLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                  <div className="font-display font-bold flex items-center gap-2">
                    <MessageSquarePlus className="w-5 h-5" />
                    {t.coTrainerPage.savedChatsTitle}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.coTrainerPage.savedChatsHint}</p>
                  <div className="mt-3 grid gap-2">
                    {conversations.length === 0 ? (
                      <div className="text-xs text-muted-foreground">{t.coTrainerPage.noSavedChats}</div>
                    ) : (
                      conversations.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => resumeConversation(c)}
                          className="rounded-2xl border border-border/60 bg-background/40 p-3 text-left hover:border-primary/30 transition-colors"
                        >
                          <div className="text-sm font-medium text-foreground line-clamp-2">{c.title || t.coTrainerPage.untitledChat}</div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {new Date(c.updated_at).toLocaleString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {canSeeAiLog ? (
                  <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
                    <div className="font-display font-bold">{t.ai.recentRequests}</div>
                    <div className="mt-2 grid gap-2">
                      {aiLog.length === 0 ? (
                        <div className="text-xs text-muted-foreground">{t.ai.noRequests}</div>
                      ) : (
                        aiLog.map((r) => (
                          <div key={r.id} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                            <div className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleString()} • {r.kind} • {r.model ?? "—"}
                            </div>
                            <div className="mt-1 text-[11px] text-foreground/80">user: {r.user_id.slice(0, 8)}…</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoTrainer;
