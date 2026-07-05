import { Copy, MessageCircle, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { buildWhatsAppShareUrl, resolveShareUrl } from "@/lib/share-utils";
import { cn } from "@/lib/utils";

interface SommerfestShareButtonProps {
  url: string;
  title: string;
  message: string;
  className?: string;
}

export function SommerfestShareButton({ url, title, message, className }: SommerfestShareButtonProps) {
  const { t } = useLanguage();
  const copy = t.sommerfest2026;
  const { toast } = useToast();
  const shareUrl = resolveShareUrl(url);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text: message, url: shareUrl });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: copy.shareCopied });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  function handleWhatsAppShare() {
    window.open(buildWhatsAppShareUrl(message, shareUrl), "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 transition-colors",
            "hover:bg-white/25 active:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:min-h-10 sm:px-3.5 sm:text-xs",
            className,
          )}
        >
          <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{copy.shareTournament}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
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
        <DropdownMenuItem onSelect={() => void handleCopyLink()}>
          <Copy className="mr-2 h-4 w-4" />
          {copy.shareCopyLink}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
