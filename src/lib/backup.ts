import { sanitizeLibrary, type LibraryEntry } from "./cardLibrary";
import { mergeWithDefaults, type VCardFormValues } from "./schema";
import { isSafeImageSource } from "./safety";
import { sanitizeSettings, type StudioSettings } from "./settings";

/**
 * Full backup / restore for everything the app persists: the active card and
 * the card library.
 *
 * localStorage can be wiped by a browser reset, a cleanup tool or a new
 * profile; export/import is the data-sovereignty counterpart of the draft
 * auto-save. The file is a single versioned JSON document:
 *
 * `{ app, kind, version, exportedAt, data: { draft, logo, settings, library? } }`
 *
 * - `draft` is sanitised through mergeWithDefaults, so unknown keys, control
 *   characters and over-limit values from a hand-edited file never reach the
 *   form.
 * - `logo` rides in its own field (never inside the draft) and must pass the
 *   same image-source allow-list as an uploaded or pasted logo.
 * - `settings` runs through the same sanitiser as the persisted key.
 * - `library` (version 2+) carries the saved-card snapshots through the same
 *   sanitiser as the storage key; version 1 files simply have no library.
 * - Language preference is deliberately not part of a backup: it is a device
 *   preference, not card data.
 */

export const BACKUP_KIND = "smart-vcard-backup";
export const BACKUP_VERSION = 2;

/** Refuse files beyond this size before parsing: 20 library entries with a 1 MB logo each bound the worst case. */
export const MAX_BACKUP_BYTES = 40_000_000;

export interface BackupPayload {
	draft: VCardFormValues;
	logo: string;
	settings: StudioSettings;
	library: LibraryEntry[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Serialise the current card state into a versioned backup JSON document. */
export function buildBackupFile(
	draft: VCardFormValues,
	logo: string,
	settings: StudioSettings,
	library: LibraryEntry[] = [],
): string {
	const cleanDraft = mergeWithDefaults(draft);
	// The logo never rides the draft — it lives in its own storage key and its
	// own field here, mirroring how the app persists it.
	cleanDraft.logoUrl = "";
	const file = {
		app: "Smart VCard",
		kind: BACKUP_KIND,
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		data: {
			draft: cleanDraft,
			logo: isSafeImageSource(logo) ? logo : "",
			settings: sanitizeSettings(settings),
			library,
		},
	};
	return JSON.stringify(file);
}

/** Parse and sanitise a backup document; null for anything malformed. */
export function parseBackupFile(text: string): BackupPayload | null {
	if (!text || text.length > MAX_BACKUP_BYTES) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}
	if (!isPlainObject(parsed)) return null;
	if (parsed.kind !== BACKUP_KIND) return null;
	// Version 1 predates the card library (no `library` field); a newer format
	// cannot be read by this build — say so instead of guessing.
	if (parsed.version !== 1 && parsed.version !== BACKUP_VERSION) return null;
	if (!isPlainObject(parsed.data)) return null;

	const draft = mergeWithDefaults(isPlainObject(parsed.data.draft) ? parsed.data.draft : {});
	draft.logoUrl = "";
	const rawLogo = parsed.data.logo;
	const logo = typeof rawLogo === "string" && isSafeImageSource(rawLogo) ? rawLogo : "";
	const settings = sanitizeSettings(parsed.data.settings);
	const library = sanitizeLibrary(parsed.data.library);
	return { draft, logo, settings, library };
}

/** Default backup filename, e.g. `SmartVCard-Backup-20261115.json`. */
export function backupFilename(now: Date = new Date()): string {
	const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
		now.getDate(),
	).padStart(2, "0")}`;
	return `SmartVCard-Backup-${stamp}.json`;
}
