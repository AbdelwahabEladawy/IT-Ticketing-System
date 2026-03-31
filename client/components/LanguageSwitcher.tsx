import { useTranslation } from "react-i18next";
import { setAppLanguage, type AppLocale } from "../utils/locale";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.startsWith("ar") ? "ar" : "en") as AppLocale;

  const select = (lng: AppLocale) => {
    if (lng === current) return;
    void setAppLanguage(lng);
  };

  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-white/80 p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => select("en")}
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          current === "en"
            ? "bg-indigo-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        {t("lang.en")}
      </button>
      <button
        type="button"
        onClick={() => select("ar")}
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          current === "ar"
            ? "bg-indigo-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        {t("lang.ar")}
      </button>
    </div>
  );
}
