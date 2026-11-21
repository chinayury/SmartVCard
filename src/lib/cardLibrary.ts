import { mergeWithDefaults, type VCardFormValues } from "./schema";
import { isSafeImageSource } from "./safety";

/**
 * The card library — saved snapshots of the whole card (draft + logo) that the
 * user can reload at any time.
 *
 * This is the lightweight slice of multi-card support: it deliberately does
 * NOT touch the live draft/logo keys or the auto-save pipeline, so the data
 * -loss class of defects the project fought hardest (D-01) stays out of scope.
 * A saved snapshot is only written when the user presses "save to library";
 * loading one replaces the current form in one shot, mirroring how .vcf
 * import works.
 */

export const LIBRARY_STORAGE_KEY = "smart-vcard-library-v1";
export const LIBRARY_LIMIT = 20;

export interface LibraryEntry {
	id: string;
	/** Epoch milliseconds, shown as the saved date. */
	savedAt: number;
	/** Display label — the card's full name at save time. */
	label: string;
	/** Sanitised form values; `logoUrl` is always empty (logo rides separately). */
	draft: VCardFormValues;
	logo: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Generate a reasonably unique entry id without any dependency. */
export function makeEntryId(): string {
	return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Derive the display label from the card's name, falling back to a placeholder. */
export function makeEntryLabel(values: VCardFormValues): string {
	const label = `${values.lastName ?? ""}${values.firstName ?? ""}`.trim();
	return label || "未命名名片";
}

/** Insert or update an entry (same label updates in place), capped at the limit. */
export function upsertEntry(entries: LibraryEntry[], entry: LibraryEntry): LibraryEntry[] {
	const existing = entries.findIndex((item) => item.label === entry.label);
	const next = existing >= 0 ? entries.map((item, index) => (index === existing ? entry : item)) : [entry, ...entries];
	return next.slice(0, LIBRARY_LIMIT);
}

/** Remove an entry by id. */
export function removeEntry(entries: LibraryEntry[], id: string): LibraryEntry[] {
	return entries.filter((item) => item.id !== id);
}

/** Sanitise anything read from localStorage into a safe entry list. */
export function sanitizeLibrary(raw: unknown): LibraryEntry[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	const entries: LibraryEntry[] = [];
	for (const item of raw) {
		if (!isRecord(item) || typeof item.id !== "string" || item.id === "") continue;
		if (seen.has(item.id)) continue;
		const draft = mergeWithDefaults(isRecord(item.draft) ? item.draft : {});
		draft.logoUrl = "";
		const logo = typeof item.logo === "string" && isSafeImageSource(item.logo) ? item.logo : "";
		const savedAt = typeof item.savedAt === "number" && Number.isFinite(item.savedAt) ? item.savedAt : Date.now();
		const label = typeof item.label === "string" && item.label.trim() ? item.label.trim().slice(0, 120) : makeEntryLabel(draft);
		seen.add(item.id);
		entries.push({ id: item.id, savedAt, label, draft, logo });
		if (entries.length >= LIBRARY_LIMIT) break;
	}
	return entries;
}

/** Read the library from localStorage; never throws. */
export function readLibrary(): LibraryEntry[] {
	try {
		const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
		return sanitizeLibrary(raw ? JSON.parse(raw) : null);
	} catch {
		return [];
	}
}

/** Persist the library; returns whether the write succeeded. */
export function writeLibrary(entries: LibraryEntry[]): boolean {
	try {
		window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(entries));
		return true;
	} catch {
		return false;
	}
}
