import ai4tChatWatermark from "@/assets/ai-4-t-chat-watermark.png";
import { cn } from "@/lib/utils";

interface Ai4tChatWatermarkProps {
  className?: string;
}

/** Centered AI 4 T bubble logo behind chat messages (non-interactive). */
export function Ai4tChatWatermark({ className }: Ai4tChatWatermarkProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 top-[min(34%,10rem)] flex items-center justify-center overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <img
        src={ai4tChatWatermark}
        alt=""
        className="max-h-[min(78%,450px)] max-w-[min(95%,510px)] w-auto select-none object-contain opacity-[0.35]"
        draggable={false}
      />
    </div>
  );
}
