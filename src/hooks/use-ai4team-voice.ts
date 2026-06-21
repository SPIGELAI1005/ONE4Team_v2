import { useCallback, useEffect, useRef, useState } from "react";
import { stripMarkdownForSpeech } from "@/lib/ai-agent/voice-text";

const STORAGE_KEY = "ai4team-voice-enabled";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useAi4TeamVoice(language: "en" | "de") {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);

  const speechSupported = Boolean(getSpeechRecognitionCtor());
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, voiceEnabled ? "1" : "0");
  }, [voiceEnabled]);

  useEffect(() => {
    if (!ttsSupported) return;
    const load = () => speechSynthesis.getVoices();
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, [ttsSupported]);

  const pickVoice = useCallback(() => {
    if (!ttsSupported) return null;
    const langPrefix = language === "de" ? "de" : "en";
    const voices = speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang.startsWith(langPrefix) && /google|natural|premium/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith(langPrefix)) ??
      voices[0] ??
      null
    );
  }, [language, ttsSupported]);

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [ttsSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !ttsSupported || !text.trim()) return;
      stopSpeaking();
      const plain = stripMarkdownForSpeech(text);
      if (!plain) return;

      const utter = new SpeechSynthesisUtterance(plain);
      utter.lang = language === "de" ? "de-DE" : "en-US";
      utter.rate = 1;
      utter.pitch = 1;
      const voice = pickVoice();
      if (voice) utter.voice = voice;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utter);
    },
    [voiceEnabled, language, ttsSupported, pickVoice, stopSpeaking],
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startListening = useCallback(
    (onFinal: (transcript: string) => void) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return false;

      stopSpeaking();
      onFinalRef.current = onFinal;

      const rec = new Ctor();
      rec.lang = language === "de" ? "de-DE" : "en-US";
      rec.continuous = false;
      rec.interimResults = true;

      rec.onresult = (ev) => {
        let interim = "";
        let finalText = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const part = ev.results[i][0]?.transcript ?? "";
          if (ev.results[i].isFinal) finalText += part;
          else interim += part;
        }
        setInterimTranscript(interim.trim());
        if (finalText.trim()) {
          onFinalRef.current?.(finalText.trim());
          setInterimTranscript("");
        }
      };

      rec.onerror = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
      return true;
    },
    [language, stopSpeaking],
  );

  const toggleListening = useCallback(
    (onFinal: (transcript: string) => void) => {
      if (isListening) {
        stopListening();
        return;
      }
      startListening(onFinal);
    },
    [isListening, startListening, stopListening],
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    voiceEnabled,
    setVoiceEnabled,
    isListening,
    isSpeaking,
    interimTranscript,
    speechSupported,
    ttsSupported,
    speak,
    stopSpeaking,
    toggleListening,
    stopListening,
  };
}
