import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const stored = (() => {
  try {
    return localStorage.getItem("flowercom_lang");
  } catch {
    return null;
  }
})();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: stored === "ar" ? "ar" : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lng: "en" | "ar") {
  i18n.changeLanguage(lng);
  try {
    localStorage.setItem("flowercom_lang", lng);
  } catch {
    // ignore (private browsing, storage blocked)
  }
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lng;
}

// Set initial direction on load
document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
document.documentElement.lang = i18n.language;

export default i18n;
