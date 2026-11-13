import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_FILE_BYTES = 262_144;

interface ImportDialogProps {
 open: boolean;
 onClose: () => void;
 /** Returns an error message, or null when the import succeeded. */
 onSubmit: (text: string) => string | null;
}

/** Paste or pick a .vcf file and refill the form. */
export function ImportDialog({ open, onClose, onSubmit }: ImportDialogProps) {
 const { t } = useTranslation();
 const ref = useRef<HTMLDialogElement>(null);
 const areaRef = useRef<HTMLTextAreaElement>(null);
 const [text, setText] = useState("");
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 const dialog = ref.current;
 if (!dialog) return;
 if (open && !dialog.open) {
 dialog.showModal();
 setText("");
 setError(null);
 window.setTimeout(() => areaRef.current?.focus(), 0);
 }
 if (!open && dialog.open) dialog.close();
 }, [open]);

 const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;
 // Always clear the input so picking the same file again still fires a
 // change event — otherwise a retry after an error looks broken.
 event.target.value = "";
 if (file.size > MAX_FILE_BYTES) {
 setError(t("import.errorTooLarge"));
 return;
 }
 const reader = new FileReader();
 reader.onload = () => {
 setText(String(reader.result ?? ""));
 setError(null);
 };
 reader.onerror = () => setError(t("import.errorRead"));
 reader.readAsText(file, "utf-8");
 };

 const submit = () => {
 const message = onSubmit(text);
 if (message) {
 setError(message);
 return;
 }
 onClose();
 };

 return (
 <dialog
 ref={ref}
 aria-labelledby="import-title"
 onCancel={(event) => {
 event.preventDefault();
 onClose();
 }}
 className="w-[min(94vw,34rem)] rounded-[14px] border border-line bg-surface p-6 text-ink shadow-raise"
 >
 <p className="overline">{t("import.overline")}</p>
 <h2 id="import-title" className="mt-2 text-[21px] font-bold leading-snug">
 {t("import.title")}
 </h2>
 <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("import.description")}</p>

 <label className="mt-5 block text-[13px] font-semibold text-ink" htmlFor="import-file">
 {t("import.fileLabel")}
 </label>
 <input
 id="import-file"
 type="file"
 accept=".vcf,.vcard,text/vcard,text/x-vcard"
 onChange={handleFile}
 className="field--file mt-2"
 />

 <label className="mt-4 block text-[13px] font-semibold text-ink" htmlFor="import-text">
 {t("import.textLabel")}
 </label>
 <textarea
 id="import-text"
 ref={areaRef}
 value={text}
 onChange={(event) => setText(event.target.value)}
 rows={8}
 placeholder={t("import.textPlaceholder")}
 className="field field--area mt-2 font-mono text-[12px]"
 />

 {error && (
 <p role="alert" className="mt-3 rounded-lg border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12px] text-danger">
 {error}
 </p>
 )}

 <div className="mt-6 flex justify-end gap-2">
 <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
 {t("common.cancel")}
 </button>
 <button
 type="button"
 className="btn btn--primary btn--sm"
 onClick={submit}
 disabled={text.trim() === ""}
 >
 {t("import.submit")}
 </button>
 </div>
 </dialog>
);
}
