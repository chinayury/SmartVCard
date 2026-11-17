import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "./Icon";
import { brandLabel, formatAddressLine, formatFullName, hasCJK, maskEmail, maskPhone, monogram, truncateMiddle } from "../lib/text";
import type { VCardData } from "../lib/vcardTypes";

interface CardPreviewProps {
 data: VCardData;
 qrSrc: string | null;
 /**
  * Stable string identity of `data`. Used as the memo equality key so the
  * preview skips re-renders when nothing visible changed.
  */
 memoKey: string;
 /**
  * Recipient-facing privacy (swiish's trio, item two): personal contact rows
  * render masked until the recipient reveals them. The studio always passes
  * false — only the shared-card view masks.
  */
 maskContacts?: boolean;
}

const CARD_FONT =
 '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif';

function ContactRow({ label, value }: { label: string; value: string }) {
 return (
 <div className="flex items-center gap-3 border-b border-line/70 pb-1.5">
 <span className="w-11 shrink-0 rounded-md border border-line bg-canvas px-1.5 py-0.5 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
 {label}
 </span>
 <span className="truncate text-[12.5px] leading-normal text-ink-soft">{value}</span>
 </div>
 );
}

/**
 * The finished card. Deliberately light and geometric: white surface, soft
 * radius, indigo accents, bold sans name, chip labels and a framed QR plate.
 * No gradients and no decorative blobs, so it prints cleanly and stays
 * readable at small sizes.
 */
function CardPreview({ data, qrSrc, maskContacts = false }: CardPreviewProps) {
 const { t } = useTranslation();
 const [logoBroken, setLogoBroken] = useState(false);
 const [revealed, setRevealed] = useState(false);

 useEffect(() => {
 setLogoBroken(false);
 setRevealed(false);
 }, [data.logoUrl, maskContacts]);

 const chinese = hasCJK(data.lastName) || hasCJK(data.firstName);
 const fullName = formatFullName(data);
 const brand = brandLabel(data);
 const addressLine = formatAddressLine(data.workAddress, chinese);
 const showLogo = Boolean(data.logoUrl) && !logoBroken;

 const phone = data.cellPhone || data.workPhone || "";
 const email = data.email || data.workEmail || "";
 const website = data.url || data.workUrl || "";
 const hidePersonal = maskContacts && !revealed;

 return (
 <div
 id="share-card"
 className="relative mx-auto aspect-[3/4] w-full max-w-[420px] select-none overflow-hidden rounded-[20px] border border-line bg-surface text-ink shadow-raise"
 style={{ fontFamily: CARD_FONT }}
 >
 <div className="relative flex h-full flex-col px-8 pb-7 pt-8">
 {/* Brand */}
 <div className="flex items-start justify-between gap-4">
 <div className="flex min-w-0 items-center gap-3">
 {showLogo ? (
 <img
 src={data.logoUrl}
 alt={brand || t("card.logoAlt")}
 draggable={false}
 onError={() => setLogoBroken(true)}
 className="h-10 max-w-[150px] object-contain"
 />
 ) : (
 <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo font-display text-[15px] font-bold leading-none text-white">
 {monogram(data)}
 </span>
 )}
 {!showLogo && brand && (
 <span className="truncate text-[17px] font-bold tracking-tight text-ink">{brand}</span>
 )}
 </div>

 <div
 aria-hidden="true"
 className="shrink-0 text-right font-mono text-[8px] font-semibold uppercase leading-[1.7] tracking-[0.3em] text-muted"
 >
 <span className="block">Digital</span>
 <span className="block">Card</span>
 </div>
 </div>

 {/* Identity */}
 <div className="mt-7 text-center">
 <h2
 className={`line-clamp-2 break-words text-[30px] font-bold leading-[1.16] text-ink ${
 chinese ? "tracking-[0.02em]" : "tracking-[-0.01em]"
 }`}
 >
 {fullName || (
 <span className="text-ink/30">{t("card.namePlaceholder")}</span>
 )}
 </h2>

 {data.title && (
 <p className="mt-2.5 line-clamp-1 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo">
 {data.title}
 </p>
 )}

 {data.organization && (
 <p className="mt-3 line-clamp-1 text-[15px] font-medium text-ink-soft">{data.organization}</p>
 )}

 {addressLine && (
 <p className="mx-auto mt-2 line-clamp-2 max-w-[300px] text-[11.5px] leading-relaxed text-muted">
 {addressLine}
 </p>
 )}
 </div>

 {/* Divider */}
 <div aria-hidden="true" className="mt-6 flex items-center gap-2">
 <span className="h-px flex-1 bg-line" />
 <span className="h-1.5 w-1.5 rotate-45 bg-indigo" />
 <span className="h-px flex-1 bg-line" />
 </div>

 {/* Contact lines */}
 <div className="mt-4 space-y-2">
 {phone && <ContactRow label="TEL" value={hidePersonal ? maskPhone(phone) : phone} />}
 {email && <ContactRow label="MAIL" value={hidePersonal ? maskEmail(truncateMiddle(email, 30)) : truncateMiddle(email, 30)} />}
 {website && <ContactRow label="WEB" value={truncateMiddle(website.replace(/^https?:\/\//i, ""), 32)} />}
 {hidePersonal && (phone || email) && (
 <button
 type="button"
 onClick={() => setRevealed(true)}
 className="self-start text-[11px] font-semibold text-indigo transition-colors hover:text-indigo-deep"
 >
 {t("card.revealContacts")}
 </button>
 )}
 </div>

 {/* Footer: slogan + QR plate */}
 <div className="mt-auto flex items-end justify-between gap-5 pt-4">
 <div className="min-w-0 pb-1">
 {data.slogan ? (
 <p className="line-clamp-3 text-[15px] font-bold leading-snug text-indigo-deep">{data.slogan}</p>
 ) : (
 <p className="text-[15px] font-bold leading-snug text-ink/70">{t("card.tagline")}</p>
 )}
 <p className="mt-2 flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.24em] text-muted">
 <Icon name="card" className="h-3 w-3" />
 Smart VCard · Indigo Grid
 </p>
 </div>

 <div className="shrink-0 text-center">
 <div className="rounded-xl border border-line bg-white p-1.5 shadow-sm ring-1 ring-indigo/10">
 {qrSrc ? (
 <img
 src={qrSrc}
 alt={t("card.qrAlt")}
 draggable={false}
 className="block h-[104px] w-[104px] rounded-lg"
 />
 ) : (
 <div className="grid h-[104px] w-[104px] place-items-center rounded-lg border border-dashed border-line bg-canvas">
 <Icon name="qr" className="h-7 w-7 text-line-strong" />
 </div>
 )}
 </div>
 <p className="mt-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.28em] text-muted">
 {t("card.scan")}
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}

/**
 * `React.memo` with a custom comparison: the parent rebuilds `data` on every
 * keystroke, but only `memoKey` and `qrSrc` decide whether the card must
 * re-render.
 */
export default memo(CardPreview, (previous, next) => {
 return (
 previous.memoKey === next.memoKey &&
 previous.qrSrc === next.qrSrc &&
 previous.maskContacts === next.maskContacts
 );
});
