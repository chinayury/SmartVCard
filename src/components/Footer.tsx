import { useTranslation } from "react-i18next";

import { Icon } from "./Icon";
import { APP_EDITION, APP_VERSION } from "../lib/version";

export function Footer() {
 const { t } = useTranslation();
 const year = new Date().getFullYear();

 return (
 <footer className="no-print mt-24 border-t border-line bg-surface">
 <div className="shell grid gap-10 py-12 sm:grid-cols-[1.6fr_1fr_1fr]">
 <div>
 <p className="text-[20px] font-bold tracking-tight text-ink">Smart VCard</p>
 <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">{t("footer.tagline")}</p>
 <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-teal">
 <Icon name="lock" className="h-3.5 w-3.5" />
 {t("footer.privacyShort")}
 </p>
 </div>

 <nav aria-label={t("footer.navLabel")} className="text-[13px]">
 <p className="overline mb-3">{t("footer.navLabel")}</p>
 <ul className="space-y-2">
 <li>
 <a className="link" href="#/generator">{t("nav.generator")}</a>
 </li>
 <li>
 <a className="link" href="#/about">{t("nav.about")}</a>
 </li>
 <li>
 <a className="link" href="#/about">{t("footer.creditsLink")}</a>
 </li>
 </ul>
 </nav>

 <div className="text-[13px]">
 <p className="overline mb-3">{t("footer.metaLabel")}</p>
 <dl className="space-y-2 text-muted">
 <div className="flex justify-between gap-4 border-b border-line pb-2">
 <dt>{t("footer.versionLabel")}</dt>
 <dd className="font-mono text-ink">{APP_VERSION}</dd>
 </div>
 <div className="flex justify-between gap-4 border-b border-line pb-2">
 <dt>{t("footer.editionLabel")}</dt>
 <dd className="font-mono text-ink">{APP_EDITION}</dd>
 </div>
 <div className="flex justify-between gap-4">
 <dt>{t("footer.licenseLabel")}</dt>
 <dd className="font-mono text-ink">MIT</dd>
 </div>
 </dl>
 </div>
 </div>

 <div className="border-t border-line">
 <div className="shell flex flex-col gap-2 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:flex-row sm:items-center sm:justify-between">
 <span>© {year} Smart VCard</span>
 <span>{t("footer.colophon")}</span>
 </div>
 </div>
 </footer>
 );
}

export default Footer;
