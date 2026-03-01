import { useContext } from "react";
import { LanguageContext } from "@/contexts/language-context";

export function useLanguage() {
  return useContext(LanguageContext);
}
