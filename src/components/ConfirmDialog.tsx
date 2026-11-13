import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
 open: boolean;
 eyebrow: string;
 title: string;
 description: string;
 confirmLabel: string;
 cancelLabel: string;
 onConfirm: () => void;
 onCancel: () => void;
}

/**
 * Native <dialog> so focus trapping, ESC and the backdrop come from the
 * browser instead of hand-rolled key handlers.
 */
export function ConfirmDialog({
 open,
 eyebrow,
 title,
 description,
 confirmLabel,
 cancelLabel,
 onConfirm,
 onCancel,
}: ConfirmDialogProps) {
 const ref = useRef<HTMLDialogElement>(null);

 useEffect(() => {
 const dialog = ref.current;
 if (!dialog) return;
 if (open && !dialog.open) dialog.showModal();
 if (!open && dialog.open) dialog.close();
 }, [open]);

 return (
 <dialog
 ref={ref}
 aria-labelledby="confirm-title"
 onCancel={(event) => {
 event.preventDefault();
 onCancel();
 }}
 className="w-[min(92vw,28rem)] rounded-[14px] border border-line bg-surface p-6 text-ink shadow-raise"
 >
 <p className="overline">{eyebrow}</p>
 <h2 id="confirm-title" className="mt-2 text-[21px] font-bold leading-snug">
 {title}
 </h2>
 <p className="mt-3 text-[13px] leading-relaxed text-muted">{description}</p>
 <div className="mt-7 flex justify-end gap-2">
 <button type="button" className="btn btn--outline btn--sm" onClick={onCancel}>
 {cancelLabel}
 </button>
 <button type="button" className="btn btn--primary btn--sm" onClick={onConfirm}>
 {confirmLabel}
 </button>
 </div>
 </dialog>
 );
}
