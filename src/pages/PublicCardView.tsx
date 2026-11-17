import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import CardPreview from "../components/CardPreview";
import { Icon } from "../components/Icon";
import { useDocumentHead } from "../hooks/useDocumentHead";
import { useQrPreview } from "../hooks/useQrPreview";
import { useToast } from "../hooks/useToast";
import { decodeShareParam, SharePasswordRequiredError, type SharedCard } from "../lib/cardShare";
import { copyText, downloadText } from "../lib/download";
import { sanitizeFilename } from "../lib/text";

interface PublicCardViewProps {
 /** The `?v=...` value from the URL. */
 encoded: string;
}

/** WeChat's in-app browser blocks the .vcf download unless opened in a browser. */
function isWeChatBrowser(): boolean {
 if (typeof navigator === "undefined") return false;
 return /MicroMessenger/i.test(navigator.userAgent);
}

/**
 * Recipient-facing page for a URL-mode QR: shows the finished card and offers
 * a one-tap .vcf download, a copy action and the native share sheet.
 */
export function PublicCardView({ encoded }: PublicCardViewProps) {
 const { t } = useTranslation();
 const toast = useToast();
 // Recipient-facing payload: keep the page out of search indexes.
 useDocumentHead({ title: t("share.pageTitle"), description: t("share.pageDescription"), noindex: true });

 // undefined = still decoding (the payload may be deflated or encrypted),
 // null = invalid so far. An encrypted link asks for its passphrase here —
 // the passphrase travels out-of-band and is never part of the URL.
 const [shared, setShared] = useState<SharedCard | null | undefined>(undefined);
 const [needsPassword, setNeedsPassword] = useState(false);
 const [passwordError, setPasswordError] = useState(false);
 const [password, setPassword] = useState("");
 useEffect(() => {
 let cancelled = false;
 setShared(undefined);
 setNeedsPassword(false);
 setPasswordError(false);
 decodeShareParam(encoded)
 .then((result) => {
 if (!cancelled) setShared(result);
 })
 .catch((error) => {
 if (cancelled) return;
 if (error instanceof SharePasswordRequiredError) setNeedsPassword(true);
 setShared(null);
 });
 return () => {
 cancelled = true;
 };
 }, [encoded]);

 const handlePasswordSubmit = async () => {
 if (!password) return;
 setShared(undefined);
 try {
 const result = await decodeShareParam(encoded, password);
 if (result) {
 setShared(result);
 setPasswordError(false);
 } else {
 // GCM authentication failed: wrong passphrase or a tampered link.
 setShared(null);
 setPasswordError(true);
 }
 } catch {
 setShared(null);
 setPasswordError(true);
 }
 };

 const memoKey = useMemo(() => (shared ? JSON.stringify(shared.values) : ""), [shared]);
 const isWechat = useMemo(() => isWeChatBrowser(), []);

 const shareUrl = useMemo(() => {
 if (typeof window === "undefined") return "";
 return `${window.location.origin}${window.location.pathname}#/?v=${encoded}`;
 }, [encoded]);

 const qr = useQrPreview(shared ? shareUrl : null, "#2b4acb", "rounded");

 if (shared === undefined) return null;
 if (!shared && needsPassword) {
 return (
 <div className="shell max-w-lg py-16">
 <form
 onSubmit={(event) => {
 event.preventDefault();
 void handlePasswordSubmit();
 }}
 className="panel p-8 text-center shadow-panel"
 >
 <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-soft text-indigo">
 <Icon name="lock" className="h-6 w-6" />
 </span>
 <h1 className="mt-4 text-[26px] font-bold leading-snug text-ink">
 {t("share.lockTitle")}
 </h1>
 <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("share.lockDesc")}</p>
 <input
 type="password"
 value={password}
 onChange={(event) => setPassword(event.target.value)}
 placeholder={t("share.lockPlaceholder")}
 aria-label={t("share.lockPlaceholder")}
 autoComplete="off"
 className="field mt-5 text-center"
 />
 {passwordError && (
 <p role="alert" className="mt-3 rounded-lg border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12px] leading-relaxed text-danger">
 {t("share.lockWrong")}
 </p>
 )}
 <button type="submit" className="btn btn--primary btn--lg w-full mt-4" disabled={!password}>
 <Icon name="lock" className="h-4 w-4" />
 {t("share.lockSubmit")}
 </button>
 </form>
 </div>
 );
 }
 if (!shared) {
 return (
 <div className="shell max-w-lg py-20">
 <div className="panel p-8 text-center shadow-panel">
 <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger">
 <Icon name="alert" className="h-6 w-6" />
 </span>
 <h1 className="mt-4 text-[26px] font-bold leading-snug text-ink">
 {t("share.invalidTitle")}
 </h1>
 <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("share.invalidDesc")}</p>
 <a href="#/generator" className="btn btn--primary btn--sm mt-6">
 {t("share.invalidCta")}
 </a>
 </div>
 </div>
 );
 }

 const { data, vcard, values } = shared;

 const downloadVcf = () => {
 const filename = `${sanitizeFilename(values.firstName || values.lastName || "contact", "contact")}.vcf`;
 downloadText(vcard, filename, "text/vcard;charset=utf-8");
 toast.push(t("share.savedToast"));
 };

 const handleCopyVcard = async () => {
 const copied = await copyText(vcard);
 toast.push(copied ? t("share.copied") : t("share.copyFailed"));
 };

 const handleShare = async () => {
 if (!navigator.share || !shareUrl) {
 const copied = await copyText(shareUrl);
 toast.push(copied ? t("share.shareUnsupportedCopied") : t("share.copyFailed"));
 return;
 }
 try {
 await navigator.share({ title: t("share.pageTitle"), url: shareUrl });
 } catch (error) {
 if ((error as DOMException | undefined)?.name !== "AbortError") {
 toast.push(t("share.shareFailed"));
 }
 }
 };

 return (
 <div className="mx-auto w-full max-w-[520px] px-5 py-10">
 <div className="flex items-center justify-between gap-4 rounded-t-[14px] border border-line border-b-0 bg-surface px-4 py-3">
 <p className="overline">{t("share.overline")}</p>
 <a href="#/" className="text-[12px] font-semibold text-indigo-deep transition-colors hover:text-indigo">
 {t("share.createMine")}
 </a>
 </div>

 <div className="rounded-b-[14px] border border-line bg-surface p-6 shadow-panel">
 <CardPreview data={data} qrSrc={qr.src} memoKey={memoKey} maskContacts />
 </div>

 <div className="mt-6 space-y-3">
 {isWechat && (
 <div role="alert" className="flex gap-2 rounded-lg border-l-2 border-amber bg-amber-soft px-3 py-2.5 text-[12px] leading-relaxed text-ink-soft">
 <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
 <span>{t("share.wechatHint")}</span>
 </div>
 )}

 <button type="button" onClick={downloadVcf} className="btn btn--primary btn--lg w-full">
 <Icon name="download" className="h-4 w-4" />
 {t("share.saveToContacts")}
 </button>

 <div className="grid grid-cols-2 gap-2">
 <button type="button" onClick={() => void handleCopyVcard()} className="btn btn--outline btn--sm">
 <Icon name="copy" className="h-3.5 w-3.5" />
 {t("share.copyVcard")}
 </button>
 <button type="button" onClick={() => void handleShare()} className="btn btn--outline btn--sm">
 <Icon name="share" className="h-3.5 w-3.5" />
 {t("share.share")}
 </button>
 </div>

 <p className="px-2 text-center text-[11px] leading-relaxed text-muted">{t("share.saveHint")}</p>

 <p className="flex items-center justify-center gap-1.5 border-t border-line pt-4 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
 <Icon name="lock" className="h-3 w-3 text-teal" />
 Smart VCard · {t("share.footerNote")}
 </p>
 </div>
 </div>
 );
}

export default PublicCardView;
