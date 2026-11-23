import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "./Icon";
import type { LibraryEntry } from "../lib/cardLibrary";

interface LibraryDialogProps {
 open: boolean;
 entries: LibraryEntry[];
 /** Reloads a saved snapshot into the form. */
 onLoad: (entry: LibraryEntry) => void;
 /** Renames a saved snapshot. */
 onRename: (id: string, label: string) => void;
 /** Deletes a saved snapshot. */
 onDelete: (id: string) => void;
 onClose: () => void;
}

/** Saved card snapshots: reload, rename or delete them. */
export function LibraryDialog({ open, entries, onLoad, onRename, onDelete, onClose }: LibraryDialogProps) {
 const { t } = useTranslation();
 const ref = useRef<HTMLDialogElement>(null);
 const i18n = useTranslation().i18n;
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editLabel, setEditLabel] = useState("");

 useEffect(() => {
 const dialog = ref.current;
 if (!dialog) return;
 if (open && !dialog.open) {
 dialog.showModal();
 setEditingId(null);
 }
 if (!open && dialog.open) dialog.close();
 }, [open]);

 const formatDate = (savedAt: number) =>
 new Date(savedAt).toLocaleDateString(i18n.resolvedLanguage?.startsWith("zh") ? "zh-CN" : "en-US");

 const startEdit = (entry: LibraryEntry) => {
 setEditingId(entry.id);
 setEditLabel(entry.label);
 };

 const commitEdit = () => {
 if (editingId) onRename(editingId, editLabel);
 setEditingId(null);
 };

 return (
 <dialog
 ref={ref}
 aria-labelledby="library-title"
 onCancel={(event) => {
 event.preventDefault();
 onClose();
 }}
 className="w-[min(94vw,34rem)] rounded-[14px] border border-line bg-surface p-6 text-ink shadow-raise"
 >
 <p className="overline">{t("library.overline")}</p>
 <h2 id="library-title" className="mt-2 text-[21px] font-bold leading-snug">
 {t("library.title")}
 </h2>
 <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("library.description")}</p>

 {entries.length === 0 ? (
 <p className="mt-6 rounded-lg border border-line bg-canvas px-4 py-6 text-center text-[13px] text-muted">
 {t("library.empty")}
 </p>
 ) : (
 <ul className="mt-5 max-h-[50vh] space-y-2 overflow-y-auto">
 {entries.map((entry) => (
 <li key={entry.id} className="flex items-center gap-3 rounded-lg border border-line bg-canvas px-3 py-2.5">
 {editingId === entry.id ? (
 <>
 <input
 autoFocus
 value={editLabel}
 onChange={(event) => setEditLabel(event.target.value)}
 onKeyDown={(event) => {
 if (event.key === "Enter") commitEdit();
 if (event.key === "Escape") setEditingId(null);
 }}
 aria-label={t("library.rename")}
 className="field min-w-0 flex-1 py-1.5 text-[14px]"
 />
 <button type="button" className="btn btn--primary btn--sm shrink-0" onClick={commitEdit}>
 <Icon name="check" className="h-3.5 w-3.5" />
 {t("library.renameSave")}
 </button>
 <button type="button" className="btn btn--ghost btn--sm shrink-0" onClick={() => setEditingId(null)}>
 {t("common.cancel")}
 </button>
 </>
 ) : (
 <>
 <div className="min-w-0 flex-1">
 <p className="truncate text-[14px] font-semibold text-ink">{entry.label}</p>
 <p className="mt-0.5 font-mono text-[10px] text-muted">{formatDate(entry.savedAt)}</p>
 </div>
 <button
 type="button"
 className="btn btn--ghost btn--sm shrink-0"
 aria-label={t("library.rename")}
 onClick={() => startEdit(entry)}
 >
 <Icon name="user" className="h-3.5 w-3.5" />
 </button>
 <button
 type="button"
 className="btn btn--outline btn--sm shrink-0"
 onClick={() => {
 onLoad(entry);
 onClose();
 }}
 >
 <Icon name="arrow-right" className="h-3.5 w-3.5" />
 {t("library.load")}
 </button>
 <button
 type="button"
 className="btn btn--ghost btn--sm shrink-0"
 aria-label={t("library.delete")}
 onClick={() => onDelete(entry.id)}
 >
 <Icon name="close" className="h-3.5 w-3.5" />
 </button>
 </>
 )}
 </li>
 ))}
 </ul>
 )}

 <div className="mt-6 flex justify-end">
 <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
 {t("common.cancel")}
 </button>
 </div>
 </dialog>
);
}

export default LibraryDialog;
