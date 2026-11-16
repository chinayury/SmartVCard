import {
 DEFAULT_QR_COLOR,
 DEFAULT_QR_SIZE,
 DEFAULT_QR_STYLE,
 QR_EXPORT_SIZES,
 QR_MODULE_STYLES,
 type QrExportSize,
} from "./constants";
import type { QrModuleStyle } from "./qr";

export type QrMode = "url" | "vcard";
export type QrPayloadFormat = "vcard" | "mecard";

export interface StudioSettings {
 mode: QrMode;
 /** Contact payload flavour when mode is "vcard"; MeCard trades fields for a sparser symbol. */
 payloadFormat: QrPayloadFormat;
 color: string;
 style: QrModuleStyle;
 size: QrExportSize;
}

export const DEFAULT_SETTINGS: StudioSettings = {
 mode: "url",
 payloadFormat: "vcard",
 color: DEFAULT_QR_COLOR,
 style: DEFAULT_QR_STYLE,
 size: DEFAULT_QR_SIZE,
};

function isRecord(value: unknown): value is Record<string, unknown> {
 return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalise a persisted settings object, ignoring anything unexpected. */
export function sanitizeSettings(raw: unknown, fallback: StudioSettings = DEFAULT_SETTINGS): StudioSettings {
 if (!isRecord(raw)) return fallback;

 const mode = raw.mode === "vcard" || raw.mode === "url" ? raw.mode : fallback.mode;
 const payloadFormat =
 raw.payloadFormat === "vcard" || raw.payloadFormat === "mecard" ? raw.payloadFormat : fallback.payloadFormat;
 const color =
 typeof raw.color === "string" && /^#[0-9a-f]{6}$/i.test(raw.color)
 ? raw.color.toLowerCase()
 : fallback.color;
 const style = QR_MODULE_STYLES.includes(raw.style as QrModuleStyle)
 ? (raw.style as QrModuleStyle)
 : fallback.style;
 const size = QR_EXPORT_SIZES.includes(raw.size as QrExportSize)
 ? (raw.size as QrExportSize)
 : fallback.size;

 return { mode, payloadFormat, color, style, size };
}
