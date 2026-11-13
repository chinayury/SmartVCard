/** URL / image source allow-lists shared by validation, import and share decoding. */

const HTTP_URL = /^https?:\/\//i;
const DATA_IMAGE_PREFIX = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i;

export const MAX_URL_LENGTH =2048;
export const MAX_LOGO_DATA_URL_LENGTH =1_600_000;

/** True only for absolute http(s) URLs with a hostname. Rejects `javascript:`, `data:`, `file:`… */
export function isHttpUrl(value: string | undefined): boolean {
 if (!value) return false;
 const trimmed = value.trim();
 if (!trimmed || trimmed.length > MAX_URL_LENGTH) return false;
 if (!HTTP_URL.test(trimmed)) return false;
 // Reject control characters / whitespace tricks before the parser sees them.
 // eslint-disable-next-line no-control-regex
 if (/[\u0000-\u0020\u007f]/.test(trimmed)) return false;
 try {
 const parsed = new URL(trimmed);
 return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
 } catch {
 return false;
 }
}

/** True for `data:image/<raster-or-svg>;base64,...` payloads. */
export function isDataImage(value: string | undefined): boolean {
 if (!value) return false;
 if (value.length > MAX_LOGO_DATA_URL_LENGTH) return false;
 const head = value.slice(0,80);
 return DATA_IMAGE_PREFIX.test(head);
}

/**
 * Logo sources may be remote http(s) URLs or locally uploaded base64 images.
 * SVG is safe here because `<img>` never executes embedded scripts.
 */
export function isSafeImageSource(value: string | undefined): boolean {
 return isHttpUrl(value) || isDataImage(value);
}
