import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import type { useAi4TeamVoice } from "@/hooks/use-ai4team-voice";
import { cn } from "@/lib/utils";

interface Ai4TeamVoiceControlsProps {
  disabled?: boolean;
  onVoiceCommand: (transcript: string) => void;
  voice: ReturnType<typeof useAi4TeamVoice>;
  variant?: "default" | "club";
  /** Show mic/speaker buttons even when the browser lacks support (disabled). */
  showWhenUnsupported?: boolean;
}

const clubIdleButtonClass =
  "h-11 w-11 shrink-0 rounded-xl border border-neutral-200/90 bg-white text-neutral-800 shadow-sm hover:bg-neutral-50 hover:text-neutral-900 [&_svg]:text-neutral-800";

const clubActiveButtonClass =
  "border-transparent bg-[color:var(--club-primary)] text-white shadow-sm hover:bg-[color:var(--club-primary)] [&_svg]:text-white";

export function Ai4TeamVoiceControls({
  disabled,
  onVoiceCommand,
  voice,
  variant = "default",
  showWhenUnsupported = false,
}: Ai4TeamVoiceControlsProps) {
  const { t } = useLanguage();
  const v = t.coTrainerPage.voice;
  const isClub = variant === "club";
  const {
    voiceEnabled,
    setVoiceEnabled,
    isListening,
    isSpeaking,
    interimTranscript,
    speechSupported,
    ttsSupported,
    toggleListening,
    stopSpeaking,
  } = voice;

  const showMic = speechSupported || showWhenUnsupported;
  const showSpeaker = ttsSupported || showWhenUnsupported;

  if (!showMic && !showSpeaker) return null;

  const defaultIdleClass = "h-11 w-11 shrink-0 rounded-xl";
  const defaultListeningClass = "bg-primary text-primary-foreground animate-pulse hover:bg-primary/90 [&_svg]:text-primary-foreground";
  const defaultTtsActiveClass = "bg-primary text-primary-foreground hover:bg-primary/90 [&_svg]:text-primary-foreground";

  return (
    <div className="flex shrink-0 items-center gap-1">
      {showMic ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            isClub ? clubIdleButtonClass : defaultIdleClass,
            !isClub && "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
            isListening && (isClub ? cn(clubActiveButtonClass, "animate-pulse") : defaultListeningClass),
            (!speechSupported || disabled) && "cursor-not-allowed opacity-45",
          )}
          disabled={disabled || !speechSupported}
          title={!speechSupported ? v.startListening : isListening ? v.stopListening : v.startListening}
          aria-label={isListening ? v.stopListening : v.startListening}
          onClick={() => speechSupported && toggleListening(onVoiceCommand)}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      ) : null}

      {showSpeaker ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            isClub ? clubIdleButtonClass : defaultIdleClass,
            !isClub && "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
            voiceEnabled && !isSpeaking && (isClub ? clubActiveButtonClass : defaultTtsActiveClass),
            (!ttsSupported || disabled) && !voiceEnabled && "cursor-not-allowed opacity-45",
          )}
          disabled={!ttsSupported}
          title={!ttsSupported ? v.speechOn : voiceEnabled ? v.speechOff : v.speechOn}
          aria-label={voiceEnabled ? v.speechOff : v.speechOn}
          onClick={() => {
            if (!ttsSupported) return;
            if (voiceEnabled) stopSpeaking();
            setVoiceEnabled(!voiceEnabled);
          }}
        >
          {isSpeaking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : voiceEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      ) : null}

      {isListening && interimTranscript ? (
        <span
          className="hidden max-w-[120px] truncate text-[10px] text-neutral-500 sm:inline"
          title={interimTranscript}
        >
          {interimTranscript}
        </span>
      ) : null}
    </div>
  );
}
