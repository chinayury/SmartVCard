import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";

const LABELS: Record<SupportedLanguage, string> = {
 zh: "中",
 en: "EN",
};

/**
 * Two-state language control. A segmented switch is faster and more
 * discoverable than the previous click-to-open dropdown, and it is fully
 * keyboard operable through plain buttons.
 */
export function LanguageToggle() {
 const { i18n, t } = useTranslation();
 const current = (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("zh") ? "zh" : "en";

 return (
 <div
 role="group"
 aria-label={t("language.label")}
 className="inline-flex items-center rounded-full border border-line bg-canvas p-0.5"
 >
 {SUPPORTED_LANGUAGES.map((language) => (
 <button
 key={language}
 type="button"
 aria-pressed={current === language}
 onClick={() => {
 void i18n.changeLanguage(language);
 }}
 className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] transition-all ${
 current === language
 ? "bg-indigo text-white shadow-sm"
 : "text-muted hover:text-ink"
 }`}
 >
 {LABELS[language]}
 </button>
 ))}
 </div>
 );
}

export default LanguageToggle;
