import { Copy, MessageCircle, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { buildMessageShareText, buildWhatsAppShareUrl } from "@/lib/share-utils";
import { clubModalPopoverContentClass } from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";

interface MessageForwardButtonProps {
  content: string;
  clubName?: string;
  senderName?: string | null;
  channelLabel?: string;
  className?: string;
  /** Align menu away from modal edge for right-aligned (own) bubbles. */
  menuAlign?: "start" | "end";
}

export function MessageForwardButton({
  content,
  clubName,
  senderName,
  channelLabel,
  className,
  menuAlign = "start",
}: MessageForwardButtonProps) {
  const { t } = useLanguage();
  const copy = t.communicationPage;
  const { toast } = useToast();
  const shareText = buildMessageShareText(content, {
    clubName,
    senderName,
    channelLabel,
    labels: {
      header: copy.forwardMessageHeader,
      headerFallback: copy.forwardMessageHeaderFallback,
      from: copy.forwardMessageFrom,
      team: copy.forwardMessageTeam,
    },
  });
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (!shareText) return null;

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: channelLabel ?? copy.forwardMessage,
        text: shareText,
      });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
    }
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(shareText);
      toast({ title: copy.messageCopied });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  function handleWhatsAppShare() {
    window.open(buildWhatsAppShareUrl(shareText), "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn("inline-flex items-center gap-1 hover:underline", className)}>
          <Share2 className="h-3 w-3" aria-hidden />
          {copy.forwardMessage}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={menuAlign}
        side="top"
        className={cn("w-52", clubModalPopoverContentClass)}
      >
        {canNativeShare ? (
          <DropdownMenuItem onSelect={() => void handleNativeShare()}>
            <Share2 className="mr-2 h-4 w-4" />
            {copy.shareViaNative}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={handleWhatsAppShare}>
          <MessageCircle className="mr-2 h-4 w-4" />
          {copy.shareViaWhatsApp}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleCopyMessage()}>
          <Copy className="mr-2 h-4 w-4" />
          {copy.shareCopyMessage}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
