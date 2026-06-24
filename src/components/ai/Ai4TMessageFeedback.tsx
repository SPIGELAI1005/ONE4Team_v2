import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  submitAiMessageFeedback,
  type AiMessageFeedbackRating,
} from "@/lib/ai-message-feedback";
import { cn } from "@/lib/utils";

interface Ai4TMessageFeedbackProps {
  clubId: string;
  conversationId: string | null;
  messageIndex: number;
  assistantExcerpt: string;
  initialRating?: AiMessageFeedbackRating | null;
  onRated?: (rating: AiMessageFeedbackRating) => void;
  className?: string;
}

export function Ai4TMessageFeedback({
  clubId,
  conversationId,
  messageIndex,
  assistantExcerpt,
  initialRating = null,
  onRated,
  className,
}: Ai4TMessageFeedbackProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [rating, setRating] = useState<AiMessageFeedbackRating | null>(initialRating);
  const [busy, setBusy] = useState(false);

  async function handleRate(next: AiMessageFeedbackRating) {
    if (busy || rating === next) return;
    setBusy(true);
    try {
      await submitAiMessageFeedback({
        clubId,
        conversationId,
        messageIndex,
        rating: next,
        assistantExcerpt,
      });
      setRating(next);
      onRated?.(next);
      toast({ description: t.coTrainerPage.feedback.thanks });
    } catch {
      toast({ variant: "destructive", description: t.coTrainerPage.feedback.failed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex items-center gap-1 pt-2", className)}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn("h-7 w-7", rating === 1 && "text-primary")}
        disabled={busy}
        aria-label={t.coTrainerPage.feedback.helpful}
        title={t.coTrainerPage.feedback.helpful}
        onClick={() => void handleRate(1)}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn("h-7 w-7", rating === -1 && "text-destructive")}
        disabled={busy}
        aria-label={t.coTrainerPage.feedback.notHelpful}
        title={t.coTrainerPage.feedback.notHelpful}
        onClick={() => void handleRate(-1)}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
