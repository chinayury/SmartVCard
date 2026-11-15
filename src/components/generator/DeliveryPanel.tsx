import { useTranslation } from "react-i18next";

import CardPreview from "../CardPreview";
import { Icon } from "../Icon";
import { Segmented } from "../Segmented";
import { QR_COLOR_PRESETS, QR_EXPORT_SIZES } from "../../lib/constants";
import type { QrModuleStyle } from "../../lib/qr";
import type { QrPreviewStatus } from "../../hooks/useQrPreview";
import type { StudioSettings } from "../../lib/settings";
import type { VCardData } from "../../lib/vcardTypes";

const STYLE_OPTIONS: { value: QrModuleStyle; labelKey: string }[] = [
 { value: "square", labelKey: "preview.styles.square" },
 { value: "rounded", labelKey: "preview.styles.rounded" },
 { value: "dots", labelKey: "preview.styles.dots" },
];

const STATUS_KEY: Record<QrPreviewStatus, string> = {
 ready: "preview.status.ready",
 empty: "preview.status.empty",
 "too-long": "preview.status.tooLong",
 error: "preview.status.error",
};

const STATUS_TONE: Record<QrPreviewStatus, string> = {
 ready: "border-teal/40 bg-teal-soft text-teal",
 empty: "border-line bg-canvas text-muted",
 "too-long": "border-danger/40 bg-danger-soft text-danger",
 error: "border-danger/40 bg-danger-soft text-danger",
};

interface SpecimenPanelProps {
 data: VCardData;
 previewKey: string;
 qrSrc: string | null;
 qrStatus: QrPreviewStatus;
}

/** Sticky right column: the live card and its current QR state. */
export function SpecimenPanel({ data, previewKey, qrSrc, qrStatus }: SpecimenPanelProps) {
 const { t } = useTranslation();

 return (
 <div className="space-y-4">
 <div className="flex items-end justify-between gap-3">
 <div>
 <p className="overline">{t("preview.overline")}</p>
 <h2 className="mt-2 text-[26px] font-bold leading-none">{t("preview.title")}</h2>
 </div>
 <span className={`chip ${STATUS_TONE[qrStatus]}`}>{t(STATUS_KEY[qrStatus])}</span>
 </div>

 <CardPreview data={data} qrSrc={qrSrc} memoKey={previewKey} />

 {qrStatus === "too-long" && (
 <p
 role="alert"
 className="rounded-lg border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12px] leading-relaxed text-danger"
 >
 {t("preview.tooLongHint")}
 </p>
 )}

 <p className="text-[11px] leading-relaxed text-muted">{t("preview.footnote")}</p>
 </div>
 );
}

interface DeliveryControlsProps {
 settings: StudioSettings;
 onSettingsChange: (patch: Partial<StudioSettings>) => void;
 shareUrl: string;
 canShare: boolean;
 sharePassword: string;
 onSharePasswordChange: (password: string) => void;
 qrStatus: QrPreviewStatus;
 payloadBytes: number;
 exporting: boolean;
 onDownloadVcf: () => void;
 onDownloadPng: () => void;
 onDownloadSvg: () => void;
 onDownloadPdf: () => void;
 onPrint: () => void;
 onCopyVcard: () => void;
 onCopyQrImage: () => void;
 onCopyLink: () => void;
 onNativeShare: () => void;
}

/** Full-width handover section below the sheet. */
export function DeliveryControls({
 settings,
 onSettingsChange,
 shareUrl,
 canShare,
 sharePassword,
 onSharePasswordChange,
 qrStatus,
 payloadBytes,
 exporting,
 onDownloadVcf,
 onDownloadPng,
 onDownloadSvg,
 onDownloadPdf,
 onPrint,
 onCopyVcard,
 onCopyQrImage,
 onCopyLink,
 onNativeShare,
}: DeliveryControlsProps) {
 const { t } = useTranslation();
 const disabled = qrStatus === "empty";

 return (
 <div className="grid gap-4 md:grid-cols-3">
 {/*01 — QR payload */}
 <section className="panel p-5 shadow-panel">
 <div className="flex items-center gap-2.5">
 <span className="badge-num">01</span>
 <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
 <Icon name="qr" className="h-4 w-4 text-indigo" />
 {t("qrMode.label")}
 </p>
 </div>
 <div className="mt-3">
 <Segmented
 value={settings.mode}
 ariaLabel={t("qrMode.label")}
 onChange={(mode) => onSettingsChange({ mode })}
 options={[
 { value: "url", label: t("qrMode.url") },
 { value: "vcard", label: t("qrMode.vcard") },
 ]}
 />
 </div>
 <p
 className={`mt-2 text-[11.5px] leading-relaxed ${
 settings.mode === "vcard" ? "text-indigo-deep" : "text-muted"
 }`}
 >
 {settings.mode === "vcard" ? t("qrMode.vcardHint") : t("qrMode.urlHint")}
 </p>

 {settings.mode === "url" && (
 <div className="mt-4 space-y-2">
 <label htmlFor="share-password" className="block text-[11px] font-semibold text-muted">
 {t("preview.sharePasswordLabel")}
 </label>
 <input
 id="share-password"
 type="password"
 value={sharePassword}
 onChange={(event) => onSharePasswordChange(event.target.value)}
 placeholder={t("preview.sharePasswordPlaceholder")}
 autoComplete="new-password"
 className="field"
 />
 <p className="text-[11px] leading-relaxed text-muted">{t("preview.sharePasswordHint")}</p>
 </div>
 )}

 {settings.mode === "url" && canShare && (
 <div className="mt-4 space-y-2">
 <label htmlFor="share-url" className="block text-[11px] font-semibold text-muted">
 {t("preview.linkLabel")}
 </label>
 <div className="flex gap-2">
 <input
 id="share-url"
 readOnly
 value={shareUrl}
 onFocus={(event) => event.currentTarget.select()}
 className="field min-w-0 flex-1 font-mono text-[11px]"
 />
 <button type="button" className="btn btn--outline btn--sm shrink-0" onClick={onCopyLink}>
 <Icon name="copy" className="h-3.5 w-3.5" />
 {t("preview.copyLink")}
 </button>
 </div>
 </div>
 )}

 {settings.mode === "url" && !canShare && (
 <p className="mt-3 rounded-lg border-l-2 border-danger bg-danger-soft px-3 py-2 text-[11.5px] leading-relaxed text-danger">
 {t("preview.linkUnavailable")}
 </p>
 )}
 </section>

 {/*02 — Treatment */}
 <section className="panel p-5 shadow-panel">
 <div className="flex items-center gap-2.5">
 <span className="badge-num">02</span>
 <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
 <Icon name="spark" className="h-4 w-4 text-indigo" />
 {t("preview.styleLabel")}
 </p>
 </div>
 <div className="mt-3">
 <Segmented
 value={settings.style}
 ariaLabel={t("preview.styleLabel")}
 onChange={(style) => onSettingsChange({ style })}
 options={STYLE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
 />
 </div>

 <p className="mt-5 flex items-center gap-1.5 text-[13px] font-bold text-ink">
 <Icon name="palette" className="h-4 w-4 text-indigo" />
 {t("preview.colorLabel")}
 </p>
 <div className="mt-3 flex flex-wrap items-center gap-2">
 {QR_COLOR_PRESETS.map((preset) => (
 <button
 key={preset.id}
 type="button"
 aria-pressed={settings.color === preset.value}
 aria-label={t(`preview.colors.${preset.id}`)}
 title={t(`preview.colors.${preset.id}`)}
 onClick={() => onSettingsChange({ color: preset.value })}
 className={`h-7 w-7 rounded-md border transition-transform ${
 settings.color === preset.value
 ? "border-ink ring-2 ring-indigo/30 ring-offset-1 ring-offset-surface"
 : "border-line hover:border-line-strong"
 }`}
 style={{ backgroundColor: preset.value }}
 />
 ))}
 <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-indigo hover:text-indigo-deep">
 <input
 type="color"
 value={settings.color}
 onChange={(event) => onSettingsChange({ color: event.target.value })}
 className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
 aria-label={t("preview.customColor")}
 />
 {t("preview.customColor")}
 </label>
 </div>
 </section>

 {/*03 — Export */}
 <section className="panel p-5 shadow-panel">
 <div className="flex items-center gap-2.5">
 <span className="badge-num">03</span>
 <p className="text-[13px] font-bold text-ink">{t("preview.sizeLabel")}</p>
 </div>
 <div className="mt-3">
 <Segmented
 value={settings.size}
 ariaLabel={t("preview.sizeLabel")}
 onChange={(size) => onSettingsChange({ size })}
 options={QR_EXPORT_SIZES.map((size) => ({ value: size, label: `${size}px` }))}
 />
 </div>

 <div className="mt-4 grid grid-cols-2 gap-2">
 <button type="button" className="btn btn--primary btn--sm" onClick={onDownloadVcf} disabled={disabled}>
 <Icon name="download" className="h-4 w-4" />
 {t("preview.downloadVcf")}
 </button>
 <button
 type="button"
 className="btn btn--outline btn--sm"
 onClick={onDownloadPng}
 disabled={qrStatus !== "ready" || exporting}
 >
 <Icon name="download" className="h-4 w-4" />
 {exporting ? t("preview.exporting") : t("preview.downloadPng")}
 </button>
 <button
 type="button"
 className="btn btn--outline btn--sm"
 onClick={onDownloadSvg}
 disabled={qrStatus !== "ready"}
 >
 <Icon name="file-text" className="h-4 w-4" />
 {t("preview.downloadSvg")}
 </button>
 <button
 type="button"
 className="btn btn--outline btn--sm"
 onClick={onDownloadPdf}
 disabled={qrStatus !== "ready"}
 >
 <Icon name="file-text" className="h-4 w-4" />
 {t("preview.downloadPdf")}
 </button>
 <button type="button" className="btn btn--outline btn--sm" onClick={onPrint} disabled={disabled}>
 <Icon name="print" className="h-4 w-4" />
 {t("preview.print")}
 </button>
 </div>

 <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
 <button type="button" className="btn btn--ghost btn--sm" onClick={onCopyVcard} disabled={disabled}>
 <Icon name="copy" className="h-3.5 w-3.5" />
 {t("preview.copyVcard")}
 </button>
 <button
 type="button"
 className="btn btn--ghost btn--sm"
 onClick={onCopyQrImage}
 disabled={qrStatus !== "ready"}
 >
 <Icon name="qr" className="h-3.5 w-3.5" />
 {t("preview.copyQrImage")}
 </button>
 <button type="button" className="btn btn--ghost btn--sm" onClick={onNativeShare} disabled={!canShare}>
 <Icon name="share" className="h-3.5 w-3.5" />
 {t("preview.share")}
 </button>
 </div>

 <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
 {payloadBytes > 0 ? t("preview.payloadBytes", { bytes: payloadBytes }) : t("preview.emptyHint")}
 </p>
 </section>
 </div>
 );
}
