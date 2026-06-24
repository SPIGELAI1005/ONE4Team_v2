export type SpeechLanguage = "en" | "de";

const GERMAN_HINT_RE = /[äöüß]/i;
const GERMAN_WORD_RE =
  /\b(der|die|das|und|ist|für|nicht|mit|auf|sie|wir|ihr|beim|eine|einem|einen|einer|den|dem|des|auch|aber|oder|wenn|dann|diese|dieser|dieses|können|konnen|müssen|mussen|werden|haben|wird|sind|zum|zur|vom|über|uber|nach|aus|bei|kein|keine|noch|schon|sehr|gibt|heute|morgen|woche|mannschaft|verein|spiel|trainings|trainingseinheit)\b/gi;
const ENGLISH_WORD_RE =
  /\b(the|and|is|for|with|you|your|this|that|are|was|have|will|can|our|team|training|schedule|match|week|today|tomorrow|not|but|or|when|then|these|those|should|would|could|been|from|about|into|their|there|here|what|which|who|how|session|players|coach)\b/gi;

/**
 * Guess spoken language from message text. Uses UI language only when ambiguous.
 */
export function detectSpeechLanguage(text: string, fallback: SpeechLanguage = "en"): SpeechLanguage {
  const sample = text.slice(0, 4000);
  if (!sample.trim()) return fallback;
  if (GERMAN_HINT_RE.test(sample)) return "de";

  const deCount = (sample.match(GERMAN_WORD_RE) ?? []).length;
  const enCount = (sample.match(ENGLISH_WORD_RE) ?? []).length;

  if (deCount >= 2 && deCount > enCount) return "de";
  if (enCount >= 2 && enCount > deCount) return "en";
  if (deCount > enCount) return "de";
  if (enCount > deCount) return "en";
  return fallback;
}

export function speechLanguageToBcp47(lang: SpeechLanguage): string {
  return lang === "de" ? "de-DE" : "en-US";
}

export function stripEmojisForSpeech(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}+/gu, "")
    .replace(/[\uFE0F\u200D]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain text for browser speech synthesis (strip markdown). */
export function stripMarkdownForSpeech(text: string): string {
  return stripEmojisForSpeech(
    text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/`+/g, "")
      .replace(/---+/g, " "),
  );
}

/**
 * Brand digit for TTS: German voices read "4" as "vier"; keep English "four" for AI 4 T / ONE 4 Team.
 * Spaced letters help engines treat "four" as an English loanword in de-DE utterances.
 */
export function prepareBrandNamesForSpeech(text: string): string {
  return text
    .replace(/\bAI4team\b/gi, "A I four T")
    .replace(/\bAI4Team\b/gi, "A I four T")
    .replace(/\bONE4Team\b/gi, "ONE four Team")
    .replace(/\bAI\s*4\s*T\b/gi, "A I four T")
    .replace(/\bAI\s*4\s*Team\b/gi, "A I four Team")
    .replace(/\bONE\s*4\s*Team\b/gi, "ONE four Team");
}

/** Markdown-stripped text with brand names adjusted for speech synthesis. */
export function prepareTextForSpeech(text: string): string {
  return prepareBrandNamesForSpeech(stripMarkdownForSpeech(text));
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
  } catch {
    return "Europe/Berlin";
  }
}
