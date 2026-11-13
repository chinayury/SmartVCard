import type { ReactNode } from "react";

import { FIELD_LIMITS, type VCardFormValues } from "../lib/schema";

export interface FieldControlProps {
 id: string;
 "aria-describedby"?: string;
 "aria-invalid"?: boolean;
}

interface FieldProps {
 /** Stable id; the control render prop receives it back. */
 id: string;
 label: string;
 hint?: string;
 error?: string;
 optionalLabel?: string;
 /**
 * The live form values. When present (and the id matches a form field), the
 * field shows a `used / max` counter once the value nears its cap — borrowed
 * from qrcodly's CharacterCounter, so nobody blind-types past a limit.
 */
 values?: VCardFormValues;
 /** Overrides the form key derived from `id` (e.g. id `jobTitle` → key `title`). */
 fieldKey?: keyof VCardFormValues;
 children: (control: FieldControlProps) => ReactNode;
}

/**
 * Label + control + hint/error, wired with `aria-describedby` and
 * `aria-invalid` so screen readers announce validation state.
 */
export function Field({ id, label, hint, error, optionalLabel, values, fieldKey, children }: FieldProps) {
 const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

 // Counter state: only meaningful for schema-capped text fields.
 const key = fieldKey ?? (id as keyof VCardFormValues);
 const max = FIELD_LIMITS[key];
 const current = values && typeof values[key] === "string" ? (values[key] as string) : "";
 const used = current.length;
 const showCounter = Boolean(max) && used > 0 && used >= max * 0.75;
 const atLimit = Boolean(max) && used >= max;

 return (
 <div className="flex flex-col gap-1.5">
 <div className="flex items-baseline justify-between gap-3">
 <label htmlFor={id} className="text-[13px] font-semibold text-ink">
 {label}
 </label>
 <span className="flex items-center gap-2.5">
 {showCounter && (
 <span
 className={`font-mono text-[10px] tabular-nums ${
 atLimit ? "font-semibold text-danger" : "text-muted"
 }`}
 >
 {used}/{max}
 </span>
 )}
 {optionalLabel && (
 <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
 {optionalLabel}
 </span>
 )}
 </span>
 </div>

 {children({
 id,
 "aria-describedby": describedBy,
 "aria-invalid": error ? true : undefined,
 })}

 {error ? (
 <p id={`${id}-error`} role="alert" className="text-[12px] leading-relaxed text-danger">
 {error}
 </p>
 ) : hint ? (
 <p id={`${id}-hint`} className="text-[12px] leading-relaxed text-muted">
 {hint}
 </p>
 ) : null}
 </div>
 );
}

interface FieldGroupProps {
 index: string;
 title: string;
 description?: string;
 children: ReactNode;
}

/** A numbered fieldset — the visual rhythm of the form. */
export function FieldGroup({ index, title, description, children }: FieldGroupProps) {
 const headingId = `section-${index}`;

 return (
 <section className="panel p-5 shadow-panel sm:p-6" aria-labelledby={headingId}>
 <header className="flex items-center gap-3 border-b border-line pb-3">
 <span className="badge-num">{index}</span>
 <h2 id={headingId} className="text-[18px] font-bold leading-none text-ink">
 {title}
 </h2>
 {description && (
 <span className="ml-auto hidden text-[11px] text-muted sm:block">{description}</span>
 )}
 </header>
 <div className="mt-5 grid gap-4">{children}</div>
 </section>
 );
}
