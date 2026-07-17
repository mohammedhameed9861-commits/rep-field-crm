import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { setLanguage, type Language } from "@/i18n";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.language === "en" ? "en" : "ar") as Language;
  const next: Language = current === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      className={className ?? "flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-600"}
    >
      <Languages className="h-4 w-4" />
      {next === "ar" ? "العربية" : "English"}
    </button>
  );
}
