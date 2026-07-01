import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Ai4TSendButton } from "@/components/ai/Ai4TSendButton";
import { Ai4TeamVoiceControls } from "@/components/ai-agent/Ai4TeamVoiceControls";
import { useLanguage } from "@/hooks/use-language";
import type { useAi4TeamVoice } from "@/hooks/use-ai4team-voice";
import { cn } from "@/lib/utils";

interface Ai4tChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  voice: ReturnType<typeof useAi4TeamVoice>;
  onVoiceCommand: (transcript: string) => void;
  sendAriaLabel?: string;
  /** `club` = light public embed; `dashboard` = app dark/light theme tokens */
  variant?: "club" | "dashboard";
  /** Omit outer frame when nested inside a card (Agent tab). */
  frameless?: boolean;
  className?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

/** Chat-style input row: textarea + send + voice (club/public styling). */
export function Ai4tChatComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  isLoading = false,
  placeholder,
  voice,
  onVoiceCommand,
  sendAriaLabel,
  variant = "club",
  frameless = false,
  className,
  textareaRef,
}: Ai4tChatComposerProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = textareaRef ?? inputRef;

  const syncTextareaHeight = useCallback(() => {
    const el = fieldRef.current;
    if (!el) return;
    const minPx = 56;
    const maxPx = Math.min(Math.round(window.innerHeight * 0.28), 240);
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, minPx), maxPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxPx ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [value, syncTextareaHeight, fieldRef]);

  const busy = disabled || isLoading;
  const isDashboard = variant === "dashboard";
  const controlVariant = isDashboard ? "default" : "club";

  return (
    <div
      className={cn(
        "shrink-0",
        !frameless &&
          (isDashboard
            ? "border-t border-border bg-background/80 px-1 py-3 backdrop-blur-xl"
            : "border-t border-neutral-200/80 bg-white/80 px-1 py-3 backdrop-blur-sm"),
        frameless && "py-0",
        className,
      )}
    >
      <div className="flex items-end gap-1.5">
        <textarea
          ref={fieldRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder ?? t.coTrainerPage.inputPlaceholder}
          rows={1}
          disabled={busy}
          className={cn(
            "ai4t-subtle-scroll box-border min-h-[56px] max-h-[min(28vh,240px)] flex-1 resize-none overflow-y-hidden rounded-xl border px-3 py-3 text-sm leading-relaxed focus-visible:outline-none",
            isDashboard
              ? "border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
              : "border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[color:var(--club-primary)]/40",
          )}
        />
        <Ai4TSendButton
          disabled={!value.trim() || busy}
          onClick={onSend}
          variant={controlVariant}
          aria-label={sendAriaLabel ?? t.coTrainerPage.tabChat}
        />
        <Ai4TeamVoiceControls
          variant={controlVariant}
          showWhenUnsupported
          disabled={busy}
          voice={voice}
          onVoiceCommand={onVoiceCommand}
        />
      </div>
      {voice.speechSupported || voice.ttsSupported ? (
        <p
          className={cn(
            "mt-1.5 text-[10px]",
            isDashboard ? "text-muted-foreground" : "text-neutral-500",
          )}
        >
          {t.coTrainerPage.voice.hint}
        </p>
      ) : null}
    </div>
  );
}
