import { MAX_SHARE_PARAM_LENGTH } from "./constants";
import { emptyVCard, mergeWithDefaults, toVCardData, type VCardFormValues } from "./schema";
import { isHttpUrl } from "./safety";
import { createVCard } from "./vcard";
import type { VCardData } from "./vcardTypes";

/**
 * Share links are `…/#/?v=<base64url(JSON)>`.
 *
 * The `v` parameter lives *inside the hash* on purpose: the app is deployed as
 * a static bundle on a sub-path and uses aHashRouter, so `?v=` placed before
 * the `#` would never reach `useSearchParams`.
 *
 * Payload rules:
 * - Empty fields are dropped (the previous version encoded all28 keys, which
 * made even a blank card produce a dense QR symbol).
 * - `logoUrl` is dropped: a base64 upload can be hundreds ofKB and would blow
 * past QR capacity.
 * - Unicode is encoded through TextEncoder, so Chinese names and emoji survive.
 */

const URL_FIELDS = ["url", "workUrl", "photo", "linkedIn", "twitter"] as const;

const SHAREABLE_KEYS = (Object.keys(emptyVCard) as (keyof VCardFormValues)[]).filter(
 (key) => key !== "logoUrl",
);

export class SharePayloadError extends Error {
 constructor(message: "payload-too-long" | "not-encodable") {
 super(message);
 this.name = "SharePayloadError";
 }
}

export interface SharedCard {
 values: VCardFormValues;
 data: VCardData;
 vcard: string;
}

export function base64UrlEncode(value: string): string {
 const bytes = new TextEncoder().encode(value);
 let binary = "";
 // `String.fromCharCode(...bytes)` blows the call stack on large inputs.
 const chunkSize =0x8000;
 for (let index =0; index < bytes.length; index += chunkSize) {
 binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
 }
 return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): string {
 const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
 const remainder = normalized.length %4;
 // The previous implementation used `"==".slice((len +3) %4)`, which added
 // no padding when `len %4 ===3` and made those links fail to decode.
 const padded = remainder ===0 ? normalized : normalized + "=".repeat(4 - remainder);
 const binary = atob(padded);
 const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
 return new TextDecoder().decode(bytes);
}

/** Serialise only the fields that carry a value, then base64url them. */
export function encodeSharePayload(values: VCardFormValues): string {
 const payload: Record<string, string> = {};
 for (const key of SHAREABLE_KEYS) {
 const raw = values[key];
 if (typeof raw !== "string") continue;
 const trimmed = raw.trim();
 if (trimmed) payload[key] = trimmed;
 }
 const encoded = base64UrlEncode(JSON.stringify(payload));
 if (encoded.length > MAX_SHARE_PARAM_LENGTH) throw new SharePayloadError("payload-too-long");
 return encoded;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
 return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Decode the `v` parameter into form values, rejecting anything malformed. */
export function decodeSharePayload(raw: string): VCardFormValues | null {
 if (!raw || raw.length > MAX_SHARE_PARAM_LENGTH) return null;
 let json: string;
 try {
 json = base64UrlDecode(raw);
 } catch {
 return null;
 }
 if (json.length >16_000) return null;

 let parsed: unknown;
 try {
 parsed = JSON.parse(json);
 } catch {
 return null;
 }
 if (!isPlainObject(parsed)) return null;

 const values = mergeWithDefaults(parsed);

 // A share link is untrusted input: keep only http(s) URLs, drop the rest.
 for (const key of URL_FIELDS) {
 const candidate = values[key];
 if (candidate && !isHttpUrl(candidate)) values[key] = "";
 }

 // logoUrl is never accepted from a link (payload size / remote tracking).
 values.logoUrl = "";
 return values;
}

/**
 * Build the canonical share URL.
 * @param baseUrl Override used by tests; defaults to the current document.
 */
export function buildShareUrl(values: VCardFormValues, baseUrl?: string): string {
 const encoded = encodeSharePayload(values);
 const base =
 baseUrl ??
 (typeof window === "undefined"
 ? "/"
 : `${window.location.origin}${window.location.pathname}`);
 const clean = base.split("#")[0].split("?")[0];
 return `${clean}#/?v=${encoded}`;
}

/** Decode a share parameter into form values, render data and a .vcf payload. */
export function decodeShareParam(raw: string): SharedCard | null {
 const values = decodeSharePayload(raw);
 if (!values) return null;
 const data = toVCardData(values);
 return { values, data, vcard: createVCard(data) };
}

/**
 * Read `v` from either the current hash (`#/?v=…`) or a legacy query string
 * (`/?v=…`). Legacy links were produced before v0.1.0 and must keep working.
 */
export function readShareParam(location: { search: string; hash: string }): string | null {
 const hashQuery = location.hash.includes("?") ? location.hash.slice(location.hash.indexOf("?") +1) : "";
 const fromHash = new URLSearchParams(hashQuery).get("v");
 if (fromHash) return fromHash;

 const fromSearch = new URLSearchParams(location.search.replace(/^\?/, "")).get("v");
 return fromSearch || null;
}
