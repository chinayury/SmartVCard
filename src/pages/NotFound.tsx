import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFound() {
 const { t } = useTranslation();

 return (
 <div className="shell flex min-h-[60vh] max-w-xl flex-col items-center justify-center py-20 text-center">
 <p className="font-mono text-[64px] font-bold leading-none tracking-[-0.04em] text-indigo">404</p>
 <h1 className="mt-4 text-[34px] font-bold leading-tight tracking-[-0.02em] text-ink">{t("notFound.title")}</h1>
 <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted">{t("notFound.desc")}</p>
 <Link to="/" className="btn btn--outline mt-8">
 {t("notFound.cta")}
 </Link>
 </div>
 );
}

export default NotFound;
