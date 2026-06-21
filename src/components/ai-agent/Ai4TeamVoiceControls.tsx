import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import type { useAi4TeamVoice } from "@/hooks/use-ai4team-voice";

interface Ai4TeamVoiceControlsProps {
  disabled?: boolean;
  onVoiceCommand: (transcript: string) => void;
  voice: ReturnType<typeof useAi4TeamVoice>;
}

export function Ai4TeamVoiceControls({ disabled, onVoiceCommand, voice }: Ai4TeamVoiceControlsProps) {
  const { t } = useLanguage();
  const v = t.coTrainerPage.voice;
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

  return (
    <div className="flex items-center gap-1 shrink-0">
      {speechSupported ? (
        <Button
          type="button"
          size="icon"
          variant={isListening ? "default" : "outline"}
          className={`h-11 w-11 rounded-xl ${isListening ? "bg-primary text-primary-foreground animate-pulse" : ""}`}
          disabled={disabled}
          title={isListening ? v.stopListening : v.startListening}
          aria-label={isListening ? v.stopListening : v.startListening}
          onClick={() => toggleListening(onVoiceCommand)}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
      ) : null}

      {ttsSupported ? (
        <Button
          type="button"
          size="icon"
          variant={voiceEnabled ? "default" : "outline"}
          className="h-11 w-11 rounded-xl"
          title={voiceEnabled ? v.speechOff : v.speechOn}
          aria-label={voiceEnabled ? v.speechOff : v.speechOn}
          onClick={() => {
            if (voiceEnabled) stopSpeaking();
            setVoiceEnabled(!voiceEnabled);
          }}
        >
          {isSpeaking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : voiceEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>
      ) : null}

      {isListening && interimTranscript ? (
        <span className="hidden sm:inline text-[10px] text-muted-foreground max-w-[120px] truncate" title={interimTranscript}>
          {interimTranscript}
        </span>
      ) : null}
    </div>
  );
}
