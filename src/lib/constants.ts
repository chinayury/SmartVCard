import type { QrModuleStyle } from "./qr";

export const DRAFT_STORAGE_KEY = "smart-vcard-draft-v1";
/**
 * The logo lives in its own key, separate from the draft.
 *
 * A base64 upload approaches 1 MB, so it must not ride along with the
 * keystroke-sized draft auto-save — and a draft auto-save that overwrites a
 * previously saved logo is data loss. Keeping the two keys apart lets the draft
 * stay cheap while the logo persists exactly as reliably.
 */
export const LOGO_STORAGE_KEY = "smart-vcard-logo-v1";
export const SETTINGS_STORAGE_KEY = "smart-vcard-settings-v1";
export const LANGUAGE_STORAGE_KEY = "smart-vcard-lang";

/** Matches the1MB limit enforced while reading an uploaded logo. */
export const MAX_LOGO_BYTES =1_000_000;

/** vCard byte-mode capacity at error-correction M is2331 octets; stop earlier for head-room. */
export const MAX_QR_PAYLOAD_BYTES =2200;

/**
 * A share link longer than this is refused instead of rendered. Keeps QR
 * generation bounded and rejects oversized pasted links early.
 */
export const MAX_SHARE_PARAM_LENGTH =6000;

export interface QrColorPreset {
 id: string;
 value: string;
}

/**
 * Ink presets for the QR symbol. The default is the brand indigo: dark enough
 * on white for reliable scanning (≈7:1 contrast) and consistent with the
 * "Indigo Grid" identity. Near-black stays available for conservative prints.
 */
export const QR_COLOR_PRESETS: readonly QrColorPreset[] = [
 { id: "indigo", value: "#2b4acb" },
 { id: "navy", value: "#16213a" },
 { id: "teal", value: "#0e7a5f" },
 { id: "slate", value: "#3d4a63" },
 { id: "black", value: "#000000" },
];

export const QR_MODULE_STYLES: readonly QrModuleStyle[] = ["square", "rounded", "dots"];

/**
 * Minimum raster pixels per QR module for a reliable scan.
 *
 * ISO/IEC 18004 sets 4px/module as the floor; real phone cameras and decoders
 * want more. Below roughly 6px/module a 100+ module symbol stops decoding, so
 * a dense card exported at the smallest size produced an unscannable file. The
 * PNG export raises the requested size to honour this floor instead.
 */
export const QR_MIN_PIXELS_PER_MODULE = 8;

export const QR_EXPORT_SIZES = [512,1024,2048] as const;
export type QrExportSize = (typeof QR_EXPORT_SIZES)[number];

export const DEFAULT_QR_COLOR = QR_COLOR_PRESETS[0].value;
export const DEFAULT_QR_STYLE: QrModuleStyle = "rounded";
export const DEFAULT_QR_SIZE: QrExportSize =1024;
