import { useTranslation } from "react-i18next";
import { languages, type Language } from "@/i18n";
import i18n from "@/i18n";

export function LanguageSelect() {
  const { t } = useTranslation();
  return (
    <select
      className="language-select"
      aria-label={t("language")}
      value={i18n.language}
      onChange={(e) => {
        void import("@/i18n").then(({ applyLanguage }) =>
          applyLanguage(e.target.value as Language),
        );
      }}
    >
      {languages.map((lng) => (
        <option key={lng} value={lng}>
          {t(lng)}
        </option>
      ))}
    </select>
  );
}
