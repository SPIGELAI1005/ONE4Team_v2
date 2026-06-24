import { describe, expect, it } from "vitest";

import {
  detectSpeechLanguage,
  prepareBrandNamesForSpeech,
  prepareTextForSpeech,
} from "@/lib/ai-agent/voice-text";

describe("detectSpeechLanguage", () => {
  it("detects English assistant replies when UI is German", () => {
    const reply =
      "Here is your weekly plan. Focus on fitness and decision-making during training sessions this week.";
    expect(detectSpeechLanguage(reply, "de")).toBe("en");
  });

  it("detects German assistant replies", () => {
    const reply = "Hier ist dein Wochenplan. Konzentriere dich auf Fitness und Entscheidungen beim Training.";
    expect(detectSpeechLanguage(reply, "en")).toBe("de");
  });

  it("uses umlauts as a strong German signal", () => {
    expect(detectSpeechLanguage("Für dich als Trainer", "en")).toBe("de");
  });
});

describe("prepareBrandNamesForSpeech", () => {
  it("replaces AI 4 T digit with English four for German TTS", () => {
    expect(prepareBrandNamesForSpeech("Willkommen bei AI 4 T!")).toBe("Willkommen bei A I four T!");
    expect(prepareBrandNamesForSpeech("Ich bin AI 4 T")).toBe("Ich bin A I four T");
  });

  it("normalizes legacy brand spellings", () => {
    expect(prepareBrandNamesForSpeech("Powered by AI4Team")).toBe("Powered by A I four T");
    expect(prepareBrandNamesForSpeech("ONE 4 Team platform")).toBe("ONE four Team platform");
  });
});

describe("prepareTextForSpeech", () => {
  it("strips markdown and fixes brand pronunciation", () => {
    expect(prepareTextForSpeech("## Hallo\nIch bin **AI 4 T**.")).toBe("Hallo Ich bin A I four T.");
  });

  it("removes emojis so they are not spoken", () => {
    expect(prepareTextForSpeech("Los geht's! ⚽ 🏆 💪 Gute Session.")).toBe("Los geht's! Gute Session.");
    expect(prepareTextForSpeech("📊 Stats look strong")).toBe("Stats look strong");
  });
});
