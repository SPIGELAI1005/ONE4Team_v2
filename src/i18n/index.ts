export { default as en } from "./en";
export type { Translations } from "./en";
export { default as de } from "./de";

export type Language = "en" | "de";

export const LANGUAGES: Record<Language, string> = {
  en: "EN",
  de: "DE",
};
