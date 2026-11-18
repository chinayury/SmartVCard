import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { Field, FieldGroup } from "../components/Field";
import { Icon } from "../components/Icon";
import { ImportDialog } from "../components/ImportDialog";
import { DeliveryControls, SpecimenPanel } from "../components/generator/DeliveryPanel";
import { useDocumentHead } from "../hooks/useDocumentHead";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useQrPreview } from "../hooks/useQrPreview";
import { useToast } from "../hooks/useToast";
import { backupFilename, buildBackupFile, MAX_BACKUP_BYTES, parseBackupFile, type BackupPayload } from "../lib/backup";
import { buildShareUrl } from "../lib/cardShare";
import { DRAFT_STORAGE_KEY, LOGO_STORAGE_KEY, MAX_LOGO_BYTES, SETTINGS_STORAGE_KEY } from "../lib/constants";
import { copyText, copyImageDataUrl, downloadBlob, downloadDataUrl, downloadSvg, downloadText, printCard } from "../lib/download";
import { renderQrPng, renderQrSvg } from "../lib/qr";
import { renderCardPdf } from "../lib/pdf";
import { isSafeImageSource } from "../lib/safety";
import { buildCardSheetHtml, printCardSheet } from "../lib/printSheet";
import { buildSelfContainedCardHtml } from "../lib/htmlCard";
import { createMeCard } from "../lib/mecard";
import {
 countFilledFields,
 emptyVCard,
 mergeWithDefaults,
 toVCardData,
 vcardSchema,
 type VCardFormValues,
} from "../lib/schema";
import { DEFAULT_SETTINGS, sanitizeSettings, type StudioSettings } from "../lib/settings";
import { formatFullName, sanitizeFilename } from "../lib/text";
import { createVCard, createVCardForQr } from "../lib/vcard";
import { MAX_IMPORT_CHARS, countVCards, parseVCard } from "../lib/vcardParse";

function normalizeDraft(raw: unknown): VCardFormValues {
 return mergeWithDefaults(
 typeof raw === "object" && raw !== null && !Array.isArray(raw)
 ? (raw as Record<string, unknown>)
 : null,
 );
}

/** The logo key holds a single data URL or http(s) URL; anything else resets it. */
function sanitizeLogo(raw: unknown): string {
 return typeof raw === "string" && isSafeImageSource(raw) ? raw : "";
}

export function Generator() {
 const { t, i18n } = useTranslation();
 const toast = useToast();
 useDocumentHead({ title: t("form.pageTitle"), description: t("form.subtitle") });

 const [draft, setDraft] = useLocalStorage<VCardFormValues>(
 DRAFT_STORAGE_KEY,
 emptyVCard,
 normalizeDraft,
 );
 // The logo is stored apart from the draft: it can approach 1 MB, so it must
 // not ride the keystroke auto-save, and the auto-save must never overwrite a
 // logo the user already saved.
 const [logo, setLogo] = useLocalStorage<string>(LOGO_STORAGE_KEY, "", sanitizeLogo);
 const [settings, setSettings] = useLocalStorage<StudioSettings>(
 SETTINGS_STORAGE_KEY,
 DEFAULT_SETTINGS,
 sanitizeSettings,
 );

 const [savedAt, setSavedAt] = useState<number | null>(null);
 const [resetOpen, setResetOpen] = useState(false);
 const [importOpen, setImportOpen] = useState(false);
 const [backupOpen, setBackupOpen] = useState(false);
 const [exporting, setExporting] = useState(false);
 const logoFileRef = useRef<HTMLInputElement>(null);
 const logoMigrated = useRef(false);
 const backupPendingRef = useRef<BackupPayload | null>(null);
 const backupFileRef = useRef<HTMLInputElement>(null);

 const {
 register,
 handleSubmit,
 watch,
 reset,
 setValue,
 formState: { errors, isDirty },
 } = useForm<VCardFormValues>({
 resolver: zodResolver(vcardSchema),
 defaultValues: { ...draft, logoUrl: logo },
 mode: "onBlur",
 reValidateMode: "onChange",
 });

 const values = watch();
 // Stable identity for effects: `watch()` returns a new object every render,
 // but this string only changes when a field actually changes.
 const valuesJson = JSON.stringify({ ...values, logoUrl: "" });

 const vcardData = toVCardData(values);
 const previewKey = JSON.stringify(vcardData);
 // Two shapes of the same card: the .vcf/copy form is conservative (CRLF,
 // 75-octet folding); the QR form is compact (LF, unfolded) so a long card
 // stays a lower QR version and therefore scans more reliably. MeCard is the
 // optional sparser contact flavour — it drops org/title, which the QR never
 // carried well anyway.
 const vcardString = createVCard(vcardData);
 const qrVcardString =
 settings.payloadFormat === "mecard" ? createMeCard(vcardData) : createVCardForQr(vcardData);
 const filled = countFilledFields(values);
 const meaningful = filled > 0;

 // The share payload may be deflated or encrypted (async browser APIs), so the
 // URL arrives one tick after the values change. "" means "cannot fit" and the
 // panel explains the fallback. The passphrase never leaves this component and
 // is not persisted anywhere.
 const [shareUrl, setShareUrl] = useState("");
 const [sharePassword, setSharePassword] = useState("");
 useEffect(() => {
 let cancelled = false;
 const parsed = JSON.parse(valuesJson) as VCardFormValues;
 buildShareUrl(parsed, undefined, sharePassword || undefined)
 .then((url) => {
 if (!cancelled) setShareUrl(url);
 })
 .catch(() => {
 // Payload cannot fit in a share link (or WebCrypto is missing); the
 // panel explains the fallback.
 if (!cancelled) setShareUrl("");
 });
 return () => {
 cancelled = true;
 };
 }, [valuesJson, sharePassword]);

 const payload = !meaningful
 ? null
 : settings.mode === "url"
 ? shareUrl || null
 : qrVcardString;

 const qr = useQrPreview(payload, settings.color, settings.style, settings.ecLevel);

 // Auto-save the draft (logo excluded: it lives in its own storage key).
 useEffect(() => {
 if (!isDirty) return;
 const timer = window.setTimeout(() => {
 const parsed = JSON.parse(valuesJson) as Record<string, unknown>;
 setDraft(mergeWithDefaults(parsed));
 setSavedAt(Date.now());
 },1200);
 return () => window.clearTimeout(timer);
 }, [valuesJson, isDirty, setDraft]);

 // One-time migration: drafts saved by earlier builds kept the logo inline.
 // Move it to its own key so the new auto-save cannot wipe it again.
 useEffect(() => {
 if (logoMigrated.current) return;
 logoMigrated.current = true;
 if (!logo && draft.logoUrl) {
 if (isSafeImageSource(draft.logoUrl)) {
 setLogo(draft.logoUrl);
 setValue("logoUrl", draft.logoUrl, { shouldDirty: false, shouldValidate: false });
 } else {
 // A legacy value that no longer validates is dropped, not carried.
 setDraft((previous) => ({ ...previous, logoUrl: "" }));
 }
 }
 // Runs once on mount: the draft and logo keys are read before this fires.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // A pasted image URL is as much a logo as an upload. Mirror the field into
 // the logo key so both kinds survive a reload (an invalid value is dropped
 // by sanitizeLogo on read, so junk never persists).
 useEffect(() => {
 if ((values.logoUrl ?? "") !== logo) setLogo(values.logoUrl ?? "");
 }, [values.logoUrl, logo, setLogo]);

 const errorFor = (key: keyof VCardFormValues): string | undefined => {
 const message = errors[key]?.message;
 return typeof message === "string" ? t(`form.errors.${message}`) : undefined;
 };

 const fileBase = sanitizeFilename(formatFullName(vcardData) || "smart-vcard", "smart-vcard");

 const onSubmit = (data: VCardFormValues) => {
 // The logo is persisted through its own key; the draft never carries it.
 setDraft(mergeWithDefaults({ ...data, logoUrl: "" }));
 setSavedAt(Date.now());
 toast.push(t("form.savedToast"));
 };

 const handleReset = () => {
 reset(emptyVCard);
 setDraft(emptyVCard);
 setLogo("");
 setSavedAt(null);
 setResetOpen(false);
 toast.push(t("form.resetToast"));
 };

 // Backup: everything the app persists about this card — draft, logo and QR
 // settings — as one versioned JSON file; restore goes through the same
 // sanitising pipeline as the storage keys themselves.
 const handleExportBackup = () => {
 downloadText(buildBackupFile(values, logo, settings), backupFilename(), "application/json;charset=utf-8");
 toast.push(t("form.backupExported"));
 };

 const handleBackupFile = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 event.target.value = "";
 if (!file) return;
 if (file.size > MAX_BACKUP_BYTES) {
 toast.push(t("form.backupTooLarge"));
 return;
 }
 const reader = new FileReader();
 reader.onload = () => {
 const payload = parseBackupFile(String(reader.result ?? ""));
 if (!payload) {
 toast.push(t("form.backupInvalid"));
 return;
 }
 backupPendingRef.current = payload;
 setBackupOpen(true);
 };
 reader.onerror = () => toast.push(t("form.backupInvalid"));
 reader.readAsText(file);
 };

 const applyBackup = () => {
 const payload = backupPendingRef.current;
 backupPendingRef.current = null;
 setBackupOpen(false);
 if (!payload) return;
 reset(payload.draft);
 setDraft(payload.draft);
 setLogo(payload.logo);
 setValue("logoUrl", payload.logo, { shouldDirty: false, shouldValidate: true });
 setSettings(payload.settings);
 setSavedAt(Date.now());
 toast.push(t("form.backupImported"));
 };

 const handleLogoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;
 if (!file.type.startsWith("image/")) {
 toast.push(t("form.logoWrongType"));
 event.target.value = "";
 return;
 }
 if (file.size > MAX_LOGO_BYTES) {
 toast.push(t("form.logoTooLarge"));
 event.target.value = "";
 return;
 }
 const reader = new FileReader();
 reader.onload = () => {
 const dataUrl = String(reader.result ?? "");
 setValue("logoUrl", dataUrl, { shouldDirty: true, shouldValidate: true });
 setLogo(dataUrl);
 event.target.value = "";
 };
 reader.onerror = () => toast.push(t("form.logoReadError"));
 reader.readAsDataURL(file);
 };

 const handleClearLogo = () => {
 setValue("logoUrl", "", { shouldDirty: true, shouldValidate: true });
 setLogo("");
 if (logoFileRef.current) logoFileRef.current.value = "";
 };

 const handleImport = (text: string): string | null => {
 // Check the character cap before parsing: a file can pass the dialog's byte
 // check and still be beyond what the parser accepts, and "too large" is a
 // far more useful message than "no vCard found".
 if (text.length > MAX_IMPORT_CHARS) return t("import.errorTooLarge");
 const parsed = parseVCard(text);
 if (!parsed) return t("import.errorInvalid");
 reset(parsed.values);
 setDraft(parsed.values);
 setLogo(parsed.values.logoUrl ?? "");
 setSavedAt(Date.now());
 // A multi-card file still imports its first card, but never silently.
 const cards = countVCards(text);
 toast.push(cards > 1 ? t("import.successMultiple", { count: cards }) : t("import.success"));
 return null;
 };

 const qrOptions = { color: settings.color, style: settings.style, margin:4, errorCorrectionLevel: settings.ecLevel };

 const handleDownloadVcf = () => {
 downloadText(vcardString, `${fileBase}.vcf`, "text/vcard;charset=utf-8");
 toast.push(t("preview.vcfReady"));
 };

 const handleDownloadSvg = () => {
 if (!payload) return;
 try {
 downloadSvg(renderQrSvg(payload, qrOptions), `${fileBase}-qr.svg`);
 toast.push(t("preview.svgReady"));
 } catch {
 toast.push(t("preview.svgFailed"));
 }
 };

 const handleDownloadPdf = async () => {
 if (!payload || qr.status !== "ready") return;
 try {
 // Vector output for print shops; the heavy converters load on demand.
 const { blob } = await renderCardPdf(renderQrSvg(payload, qrOptions));
 downloadBlob(blob, `${fileBase}-qr.pdf`);
 toast.push(t("preview.pdfReady"));
 } catch {
 toast.push(t("preview.pdfFailed"));
 }
 };

 const handleCopyQrImage = async () => {
 if (!payload || qr.status !== "ready") return;
 try {
 const png = await renderQrPng(payload, qrOptions, settings.size);
 const copied = await copyImageDataUrl(png.dataUrl);
 if (copied) {
 toast.push(t("preview.qrImageCopied"));
 } else {
 // No image-capable clipboard here — the download is the honest fallback.
 downloadDataUrl(png.dataUrl, `${fileBase}-qr-${png.size}.png`);
 toast.push(t("preview.qrImageDownloaded"));
 }
 } catch {
 toast.push(t("preview.pngFailed"));
 }
 };

  const handlePrintCardSheet = () => {
 if (!payload) return;
 try {
 // A wallet-size CR80 sheet in a hidden iframe: the card prints at true
 // physical size, isolated from the app's own print stylesheet.
 printCardSheet(buildCardSheetHtml({ qrSvg: renderQrSvg(payload, qrOptions), data: vcardData }));
 } catch {
 toast.push(t("preview.printSheetFailed"));
 }
 };

 // A standalone HTML file: the card, the QR and the .vcf download in one
 // artifact the recipient can open anywhere, offline, without this app.
 const handleExportHtmlCard = () => {
 if (!payload) return;
 try {
 downloadText(
 buildSelfContainedCardHtml({
 qrSvg: renderQrSvg(payload, qrOptions),
 data: vcardData,
 vcard: vcardString,
 strings: {
 save: t("preview.htmlCardSave"),
 detailsSummary: t("preview.htmlCardDetails"),
 footer: t("preview.htmlCardFooter"),
 },
 }),
 `${fileBase}-card.html`,
 "text/html;charset=utf-8",
 );
 toast.push(t("preview.htmlCardReady"));
 } catch {
 toast.push(t("preview.printSheetFailed"));
 }
 };

  const handleDownloadPng = async () => {
    if (!payload || qr.status !== "ready") return;
    setExporting(true);
    try {
      const png = await renderQrPng(payload, qrOptions, settings.size);
      downloadDataUrl(png.dataUrl, `${fileBase}-qr-${png.size}.png`);
      // A dense symbol is exported larger than asked so it still scans; say so
      // rather than silently shipping a different size than requested.
      toast.push(png.raised ? t("preview.pngReadyEnlarged", { size: png.size }) : t("preview.pngReady"));
    } catch {
      toast.push(t("preview.pngFailed"));
    } finally {
      setExporting(false);
    }
  };

 const handleCopyVcard = async () => {
 const copied = await copyText(vcardString);
 toast.push(copied ? t("preview.copied") : t("preview.copyFailed"));
 };

 const handleCopyLink = async () => {
 if (!shareUrl) return;
 const copied = await copyText(shareUrl);
 toast.push(copied ? t("preview.copied") : t("preview.copyFailed"));
 };

 const handleNativeShare = async () => {
 if (!shareUrl) return;
 if (!navigator.share) {
 const copied = await copyText(shareUrl);
 toast.push(copied ? t("preview.shareUnsupportedCopied") : t("preview.copyFailed"));
 return;
 }
 try {
 await navigator.share({
 title: t("app.name"),
 text: formatFullName(vcardData),
 url: shareUrl,
 });
 } catch (error) {
 if ((error as DOMException | undefined)?.name !== "AbortError") {
 toast.push(t("preview.shareFailed"));
 }
 }
 };

 const savedTime = savedAt
 ? new Date(savedAt).toLocaleTimeString(
 i18n.resolvedLanguage?.startsWith("zh") ? "zh-CN" : "en-US",
 { hour: "2-digit", minute: "2-digit" },
 )
 : "";

 return (
 <div className="shell py-8 lg:py-12">
 <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
 <section className="order-2 lg:order-1">
 <div className="flex flex-wrap items-end justify-between gap-4">
 <div>
 <p className="overline">{t("form.overline")}</p>
 <h1 className="mt-3 text-[34px] font-bold leading-none tracking-[-0.02em] text-ink sm:text-[40px]">
 {t("form.pageTitle")}
 </h1>
 <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted">{t("form.subtitle")}</p>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <span className="chip">{t("form.completedCount", { count: filled })}</span>
 <button type="button" className="btn btn--outline btn--sm" onClick={() => setImportOpen(true)}>
 <Icon name="upload" className="h-3.5 w-3.5" />
 {t("form.import")}
 </button>
 <button type="button" className="btn btn--outline btn--sm" onClick={handleExportBackup}>
 <Icon name="download" className="h-3.5 w-3.5" />
 {t("form.exportBackup")}
 </button>
 <button type="button" className="btn btn--outline btn--sm" onClick={() => backupFileRef.current?.click()}>
 <Icon name="upload" className="h-3.5 w-3.5" />
 {t("form.importBackup")}
 </button>
 <button type="button" className="btn btn--ghost btn--sm" onClick={() => setResetOpen(true)}>
 <Icon name="reset" className="h-3.5 w-3.5" />
 {t("form.reset")}
 </button>
 <input
 ref={backupFileRef}
 type="file"
 accept="application/json,.json"
 onChange={handleBackupFile}
 className="hidden"
 aria-hidden="true"
 tabIndex={-1}
 />
 </div>
 </div>

 <div className="mt-3 flex min-h-4 items-center gap-2 text-[11px] text-muted">
 {savedAt ? (
 <>
 <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
 {t("form.draftSaved", { time: savedTime })}
 </>
 ) : (
 <span>{t("form.draftHint")}</span>
 )}
 </div>

 <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
 <FieldGroup index="01" title={t("form.sectionIdentity")} description={t("form.sectionIdentityHint")}>
 <div className="grid gap-4 sm:grid-cols-2">
 <Field values={values} id="firstName" label={t("form.firstName")} error={errorFor("firstName")}>
 {(control) => (
 <input
 {...control}
 {...register("firstName")}
 type="text"
 autoComplete="given-name"
 placeholder={t("form.firstNamePlaceholder")}
 className="field"
 />
 )}
 </Field>

 <Field values={values} id="lastName" label={t("form.lastName")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input
 {...control}
 {...register("lastName")}
 type="text"
 autoComplete="family-name"
 placeholder={t("form.lastNamePlaceholder")}
 className="field"
 />
 )}
 </Field>

 <Field values={values} id="middleName" label={t("form.middleName")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("middleName")} type="text" className="field" />
 )}
 </Field>

 <Field values={values} id="nickname" label={t("form.nickname")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("nickname")} type="text" autoComplete="nickname" className="field" />
 )}
 </Field>

 <Field values={values} id="namePrefix" label={t("form.namePrefix")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("namePrefix")} type="text" autoComplete="honorific-prefix" className="field" />
 )}
 </Field>

 <Field values={values} id="nameSuffix" label={t("form.nameSuffix")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("nameSuffix")} type="text" autoComplete="honorific-suffix" className="field" />
 )}
 </Field>

 <Field values={values} id="birthday" label={t("form.birthday")} optionalLabel={t("form.optional")} hint={t("form.birthdayHint")}>
 {(control) => (
 <input {...control} {...register("birthday")} type="date" className="field" />
 )}
 </Field>

 <Field values={values} id="photo" label={t("form.photo")} optionalLabel={t("form.optional")} error={errorFor("photo")} hint={t("form.photoHint")}>
 {(control) => (
 <input {...control} {...register("photo")} type="url" inputMode="url" placeholder="https://…" className="field" />
 )}
 </Field>
 </div>
 </FieldGroup>

 <FieldGroup index="02" title={t("form.sectionContact")} description={t("form.sectionContactHint")}>
 <div className="grid gap-4 sm:grid-cols-2">
 <Field values={values} id="cellPhone" label={t("form.cellPhone")} optionalLabel={t("form.optional")} error={errorFor("cellPhone")}>
 {(control) => (
 <input {...control} {...register("cellPhone")} type="tel" autoComplete="tel" placeholder="+8613800000000" className="field" />
 )}
 </Field>

 <Field values={values} id="workPhone" label={t("form.workPhone")} optionalLabel={t("form.optional")} error={errorFor("workPhone")}>
 {(control) => (
 <input {...control} {...register("workPhone")} type="tel" autoComplete="tel-work" className="field" />
 )}
 </Field>

 <Field values={values} id="email" label={t("form.email")} optionalLabel={t("form.optional")} error={errorFor("email")}>
 {(control) => (
 <input {...control} {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" className="field" />
 )}
 </Field>

 <Field values={values} id="workEmail" label={t("form.workEmail")} optionalLabel={t("form.optional")} error={errorFor("workEmail")}>
 {(control) => (
 <input {...control} {...register("workEmail")} type="email" autoComplete="email" className="field" />
 )}
 </Field>

 <Field values={values} id="url" label={t("form.url")} optionalLabel={t("form.optional")} error={errorFor("url")}>
 {(control) => (
 <input {...control} {...register("url")} type="url" inputMode="url" autoComplete="url" placeholder="https://…" className="field" />
 )}
 </Field>

 <Field values={values} id="workUrl" label={t("form.workUrl")} optionalLabel={t("form.optional")} error={errorFor("workUrl")}>
 {(control) => (
 <input {...control} {...register("workUrl")} type="url" inputMode="url" className="field" />
 )}
 </Field>
 </div>
 </FieldGroup>

 <FieldGroup index="03" title={t("form.sectionWork")} description={t("form.sectionWorkHint")}>
 <div className="grid gap-4 sm:grid-cols-2">
 <Field values={values} id="organization" label={t("form.organization")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("organization")} type="text" autoComplete="organization" className="field" />
 )}
 </Field>

 <Field values={values} fieldKey="title" id="jobTitle" label={t("form.jobTitle")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("title")} type="text" autoComplete="organization-title" className="field" />
 )}
 </Field>

 <Field values={values} id="companyShortName" label={t("form.companyShortName")} optionalLabel={t("form.optional")} hint={t("form.companyShortNameHint")}>
 {(control) => (
 <input {...control} {...register("companyShortName")} type="text" className="field" />
 )}
 </Field>

 <Field values={values} id="slogan" label={t("form.slogan")} optionalLabel={t("form.optional")} hint={t("form.sloganHint")}>
 {(control) => (
 <input {...control} {...register("slogan")} type="text" className="field" />
 )}
 </Field>
 </div>

 <Field values={values} id="logoUrl" label={t("form.logoUrl")} optionalLabel={t("form.optional")} error={errorFor("logoUrl")} hint={t("form.logoUrlHint")}>
 {(control) => (
 <div className="space-y-3">
 <div className="flex flex-wrap items-center gap-3">
 {values.logoUrl ? (
 <img
 src={values.logoUrl}
 alt={t("form.logoPreviewAlt")}
 className="h-14 w-14 rounded-xl border border-line bg-white object-contain p-1"
 />
 ) : (
 <span className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-line-strong bg-canvas font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
 Logo
 </span>
 )}
 <input
 ref={logoFileRef}
 type="file"
 accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
 onChange={handleLogoFile}
 aria-label={t("form.logoUpload")}
 className="field--file max-w-xs"
 />
 {values.logoUrl && (
 <button type="button" className="btn btn--ghost btn--sm" onClick={handleClearLogo}>
 <Icon name="close" className="h-3.5 w-3.5" />
 {t("form.logoClear")}
 </button>
 )}
 </div>
 <input {...control} {...register("logoUrl")} type="url" inputMode="url" placeholder="https://…" className="field" />
 </div>
 )}
 </Field>

 <div className="space-y-4 border-t border-line pt-4">
 <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{t("form.workAddress")}</p>

 <Field values={values} id="workStreet" label={t("form.street")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("workStreet")} type="text" autoComplete="street-address" className="field" />
 )}
 </Field>

 <div className="grid gap-4 sm:grid-cols-3">
 <Field values={values} id="workCity" label={t("form.city")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("workCity")} type="text" autoComplete="address-level2" className="field" />
 )}
 </Field>
 <Field values={values} id="workState" label={t("form.stateProvince")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("workState")} type="text" autoComplete="address-level1" className="field" />
 )}
 </Field>
 <Field values={values} id="workPostal" label={t("form.postalCode")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("workPostal")} type="text" autoComplete="postal-code" className="field" />
 )}
 </Field>
 </div>

 <Field values={values} id="workCountry" label={t("form.countryRegion")} optionalLabel={t("form.optional")}>
 {(control) => (
 <input {...control} {...register("workCountry")} type="text" autoComplete="country-name" className="field" />
 )}
 </Field>
 </div>
 </FieldGroup>

 <FieldGroup index="04" title={t("form.sectionExtra")} description={t("form.sectionExtraHint")}>
 <div className="grid gap-4 sm:grid-cols-3">
 <Field values={values} id="linkedIn" label={t("form.linkedIn")} optionalLabel={t("form.optional")} error={errorFor("linkedIn")}>
 {(control) => (
 <input {...control} {...register("linkedIn")} type="url" inputMode="url" placeholder="https://linkedin.com/in/…" className="field" />
 )}
 </Field>
 <Field values={values} id="twitter" label={t("form.twitter")} optionalLabel={t("form.optional")} error={errorFor("twitter")}>
 {(control) => (
 <input {...control} {...register("twitter")} type="url" inputMode="url" placeholder="https://x.com/…" className="field" />
 )}
 </Field>
 <Field values={values} id="wechat" label={t("form.wechat")} optionalLabel={t("form.optional")} error={errorFor("wechat")}>
 {(control) => (
 <input {...control} {...register("wechat")} type="text" className="field" />
 )}
 </Field>
 </div>

 <Field values={values} id="note" label={t("form.note")} optionalLabel={t("form.optional")} hint={t("form.noteHint")} error={errorFor("note")}>
 {(control) => <textarea {...control} {...register("note")} rows={3} className="field field--area" />}
 </Field>
 </FieldGroup>

 <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
 <button type="submit" className="btn btn--primary">
 {t("form.submit")}
 <Icon name="arrow-right" className="h-4 w-4" />
 </button>
 <p className="text-[11px] leading-relaxed text-muted">{t("form.submitHint")}</p>
 </div>
 </form>
 </section>

 <div className="order-1 lg:order-2 lg:sticky lg:top-20 lg:self-start">
 <SpecimenPanel
 data={vcardData}
 previewKey={previewKey}
 qrSrc={qr.src}
 qrStatus={qr.status}
 />
 </div>
 </div>

 <section className="no-print mt-12 border-t border-line pt-8" aria-labelledby="delivery-title">
 <div className="flex flex-wrap items-end justify-between gap-4">
 <div>
 <p className="overline">{t("preview.deliveryOverline")}</p>
 <h2 id="delivery-title" className="mt-3 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink">
 {t("preview.deliveryTitle")}
 </h2>
 </div>
 <p className="max-w-md text-[12px] leading-relaxed text-muted">
 {t("preview.deliveryHint")}
 </p>
 </div>

 <div className="mt-6">
 <DeliveryControls
 settings={settings}
 onSettingsChange={(patch) => setSettings((previous) => sanitizeSettings({ ...previous, ...patch }))}
 shareUrl={shareUrl}
 canShare={Boolean(shareUrl)}
 sharePassword={sharePassword}
 onSharePasswordChange={setSharePassword}
 qrStatus={qr.status}
 payloadBytes={qr.bytes}
 exporting={exporting}
 onDownloadVcf={handleDownloadVcf}
 onDownloadPng={() => void handleDownloadPng()}
 onDownloadSvg={handleDownloadSvg}
 onDownloadPdf={() => void handleDownloadPdf()}
 onPrint={printCard}
 onPrintCardSheet={handlePrintCardSheet}
 onExportHtmlCard={handleExportHtmlCard}
 onCopyVcard={() => void handleCopyVcard()}
 onCopyQrImage={() => void handleCopyQrImage()}
 onCopyLink={() => void handleCopyLink()}
 onNativeShare={() => void handleNativeShare()}
 />
 </div>
 </section>

 <ConfirmDialog
 open={resetOpen}
 eyebrow={t("common.confirmEyebrow")}
 title={t("form.resetTitle")}
 description={t("form.resetDesc")}
 confirmLabel={t("form.resetConfirm")}
 cancelLabel={t("common.cancel")}
 onConfirm={handleReset}
 onCancel={() => setResetOpen(false)}
 />

 <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onSubmit={handleImport} />

 <ConfirmDialog
 open={backupOpen}
 eyebrow={t("common.confirmEyebrow")}
 title={t("form.backupConfirmTitle")}
 description={t("form.backupConfirmDesc")}
 confirmLabel={t("form.backupConfirm")}
 cancelLabel={t("common.cancel")}
 onConfirm={applyBackup}
 onCancel={() => {
 setBackupOpen(false);
 backupPendingRef.current = null;
 }}
 />
 </div>
 );
}

export default Generator;
