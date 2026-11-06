import { useTranslation } from "react-i18next";
import { applyLanguage, languages, type Language } from "@/i18n";

export function LanguageSelect() {
  const { t, i18n } = useTranslation();
  return (
    <select
      className="language-select"
      aria-label={t("language")}
      value={i18n.language}
      // Read the value synchronously: React resets a controlled <select> right after onChange.
      onChange={(e) => applyLanguage(e.target.value as Language)}
    >
      {languages.map((lng) => (
        <option key={lng} value={lng}>
          {t(lng)}
        </option>
      ))}
    </select>
  );
}
