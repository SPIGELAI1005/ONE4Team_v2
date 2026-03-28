export { en, type Translations } from "./en";
export { de } from "./de";

export type Language = "en" | "de";

export const LANGUAGES: Record<Language, string> = {
  en: "EN",
  de: "DE",
};
