import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Footer from "./Footer";
import Header from "./Header";

export function Layout() {
 const { i18n, t } = useTranslation();

 // Keep the document language in sync with the UI language for screen
 // readers, hyphenation and CJK font selection.
 useEffect(() => {
 const language = (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("zh")
 ? "zh-CN"
 : "en";
 document.documentElement.lang = language;
 }, [i18n.resolvedLanguage, i18n.language]);

 return (
 <div className="flex min-h-screen flex-col">
 <a
 href="#main"
 className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-indigo focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
 >
 {t("nav.skipToContent")}
 </a>
 <Header />
 <main id="main" className="flex-1">
 <Outlet />
 </main>
 <Footer />
 </div>
 );
}

export default Layout;
