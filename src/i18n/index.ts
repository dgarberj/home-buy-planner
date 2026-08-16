import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";

const STORAGE_KEY = "home-buy-planner:lang";

function detectLanguage(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "es") return saved;
  return navigator.language.startsWith("es") ? "es" : "en";
}

export function initI18n(): void {
  void i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: detectLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

  i18next.on("languageChanged", (lng) => {
    localStorage.setItem(STORAGE_KEY, lng);
  });
}
