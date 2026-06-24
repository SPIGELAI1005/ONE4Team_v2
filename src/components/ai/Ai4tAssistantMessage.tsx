import ReactMarkdown from "react-markdown";
import { BookOpen } from "lucide-react";
import { Ai4TMessageFeedback } from "@/components/ai/Ai4TMessageFeedback";
import { normalizeAi4tAssistantBrandText } from "@/components/ai/Ai4TBrand";
import { useLanguage } from "@/hooks/use-language";
import { splitAssistantMessageSources } from "@/lib/ai4t-message-sources";
import type { AiMessageFeedbackRating } from "@/lib/ai-message-feedback";

interface Ai4tAssistantMessageProps {
  content: string;
  clubId: string;
  conversationId: string | null;
  messageIndex: number;
  feedbackRating?: AiMessageFeedbackRating | null;
  showFeedback?: boolean;
  onRated?: (rating: AiMessageFeedbackRating) => void;
  /** `light` = always dark text (public embed white bubble); `card` = theme-aware dashboard bubble */
  tone?: "card" | "light";
}

export function Ai4tAssistantMessage({
  content,
  clubId,
  conversationId,
  messageIndex,
  feedbackRating = null,
  showFeedback = true,
  onRated,
  tone = "card",
}: Ai4tAssistantMessageProps) {
  const { t } = useLanguage();
  const { body, sources } = splitAssistantMessageSources(content);

  const proseClass =
    tone === "light"
      ? "prose prose-sm max-w-none text-sm text-neutral-900 [&_p]:my-1 [&_p]:text-neutral-900 [&_ul]:my-1 [&_li]:my-0.5 [&_li]:text-neutral-900 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-neutral-900"
      : "prose prose-sm max-w-none text-sm text-foreground dark:prose-invert [&_p]:my-1 [&_p]:text-foreground [&_ul]:my-1 [&_li]:my-0.5 [&_li]:text-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-primary";

  return (
    <div>
      <div className={proseClass}>
        <ReactMarkdown>{normalizeAi4tAssistantBrandText(body)}</ReactMarkdown>
      </div>
      {sources.length > 0 ? (
        <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            {t.coTrainerPage.feedback.sourcesTitle}
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {showFeedback && clubId ? (
        <Ai4TMessageFeedback
          clubId={clubId}
          conversationId={conversationId}
          messageIndex={messageIndex}
          assistantExcerpt={body}
          initialRating={feedbackRating}
          onRated={onRated}
        />
      ) : null}
    </div>
  );
}
