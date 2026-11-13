import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import LanguageToggle from "./LanguageToggle";
import { Icon } from "./Icon";

const NAV_ITEMS = [
 { to: "/generator", index: "01", key: "nav.generator" },
 { to: "/about", index: "02", key: "nav.about" },
] as const;

export function Header() {
 const { t } = useTranslation();

 return (
 <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
 <div className="shell flex h-16 items-center gap-4">
 <a href="#/" className="group flex items-center gap-3" aria-label={t("nav.home")}>
 <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo font-display text-[15px] font-bold leading-none text-white shadow-sm transition-colors group-hover:bg-indigo-deep">
 SV
 </span>
 <span className="flex flex-col leading-none">
 <span className="text-[17px] font-bold tracking-tight text-ink">Smart VCard</span>
 <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-muted">
 Indigo Grid
 </span>
 </span>
 </a>

 <nav className="ml-auto hidden items-center gap-2 sm:flex" aria-label={t("nav.main")}>
 {NAV_ITEMS.map((item) => (
 <NavLink key={item.to} to={item.to} className="nav-link">
 <span className="font-mono text-[10px] text-muted">{item.index}</span>
 {t(item.key)}
 </NavLink>
 ))}
 </nav>

 <div className="ml-auto flex items-center gap-2 sm:ml-0">
 <LanguageToggle />
 </div>
 </div>

 {/* Mobile navigation keeps the same numbered rhythm instead of a hamburger. */}
 <nav className="shell flex items-center gap-3 border-t border-line/70 py-2 sm:hidden" aria-label={t("nav.main")}>
 {NAV_ITEMS.map((item) => (
 <NavLink key={item.to} to={item.to} className="nav-link text-[13px]">
 <span className="font-mono text-[10px] text-muted">{item.index}</span>
 {t(item.key)}
 </NavLink>
 ))}
 <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted">
 <Icon name="lock" className="h-3.5 w-3.5" />
 {t("nav.localOnly")}
 </span>
 </nav>
 </header>
 );
}

export default Header;
