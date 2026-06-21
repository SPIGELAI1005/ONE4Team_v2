/** Heuristic: should we try NL workflow interpretation before normal chat? */
export function shouldTryAgentInterpretation(message: string): boolean {
  const m = message.trim();
  if (!m || m.startsWith("/")) return false;

  const lower = m.toLowerCase();

  const pureQuestion =
    /^(what|how|why|when|where|who|which|can you explain|tell me about|help me understand|explain|was ist|wie kann|warum |wann |wo |wer |erkläre|erklär)\b/i;
  const hasAction =
    /\b(create|schedule|cancel|add|plan|notify|book|set up|remove|delete|post|send|absag|planen|erstell|anlegen|eintragen|informier|ankündig|mitglied|training|einheit|session|lege|leg |mach |stell |trag |schreib|termin)\b/i;

  if (pureQuestion.test(m) && !hasAction.test(m)) return false;

  if (m.endsWith("?") && !hasAction.test(m)) return false;

  if (hasAction.test(lower)) return true;

  // Voice-style short commands: "U17 Dienstag 18 Uhr", "Training morgen absagen"
  if (/\b(u\d+|jugend|senior|damen|herren|u\s?\d+)\b/i.test(m) && /\b(\d{1,2}[:\.]\d{2}|\d{1,2}\s*uhr|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morgen|tomorrow|heute|today)\b/i.test(m)) {
    return true;
  }

  return false;
}
