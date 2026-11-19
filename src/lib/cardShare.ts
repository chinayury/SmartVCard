import { MAX_SHARE_PARAM_LENGTH } from "./constants";
import { decryptSharePayload, encryptSharePayload } from "./crypto";
import { emptyVCard, mergeWithDefaults, toVCardData, type VCardFormValues } from "./schema";
import { isHttpUrl } from "./safety";
import { createVCard } from "./vcard";
import type { VCardData } from "./vcardTypes";

/**
 * Share links are `…/#/?v=<payload>`.
 *
 * The `v` parameter lives *inside the hash* on purpose: the app is deployed as
 * a static bundle on a sub-path and uses a HashRouter, so `?v=` placed before
 * the `#` would never reach `useSearchParams`.
 *
 * Payload rules:
 * - Empty fields are dropped (encoding all 28 keys would make even a blank
 *   card produce a dense QR symbol).
 * - `logoUrl` is dropped: a base64 upload can be hundreds of KB and would blow
 *   past QR capacity.
 * - Unicode is encoded through TextEncoder, so Chinese names and emoji survive.
 *
 * Payload format:
 * - `x` + base64url(salt|iv|AES-256-GCM(deflate-raw JSON)) — passphrase-
 *   encrypted; the passphrase travels out-of-band, never in the link.
 * - `d` + base64url(deflate-raw(JSON)) — deflated, chosen when it is shorter.
 * - `p` + base64url(JSON) — plain, used when CompressionStream is unavailable
 *   or when deflating does not shrink the payload.
 * - Legacy payloads carry no flag byte: base64url of JSON always starts with
 *   `e` (JSON starts with `{`, 0x7b), so a flag byte can never collide with an
 *   unprefixed legacy string. Deflating keeps dense cards well below the hard
 *   cap, which directly lowers the QR version of a URL-mode symbol.
 */

const URL_FIELDS = ["url", "workUrl", "photo", "linkedIn", "twitter"] as const;

const SHAREABLE_KEYS = (Object.keys(emptyVCard) as (keyof VCardFormValues)[]).filter(
	(key) => key !== "logoUrl" && key !== "pgpPublicKey",
);

export class SharePayloadError extends Error {
	constructor(message: "payload-too-long" | "not-encodable") {
		super(message);
		this.name = "SharePayloadError";
	}
}

/** Raised when an encrypted link is decoded without a passphrase. */
export class SharePasswordRequiredError extends Error {
	constructor() {
		super("password-required");
		this.name = "SharePasswordRequiredError";
	}
}

export interface SharedCard {
	values: VCardFormValues;
	data: VCardData;
	vcard: string;
}

function base64UrlFromBytes(bytes: Uint8Array): string {
	let binary = "";
	// `String.fromCharCode(...bytes)` blows the call stack on large inputs.
	const chunkSize = 0x8000;
	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const remainder = normalized.length % 4;
	// The previous implementation used `"==".slice((len + 3) % 4)`, which added
	// no padding when `len % 4 === 3` and made those links fail to decode.
	const padded = remainder === 0 ? normalized : normalized + "=".repeat(4 - remainder);
	const binary = atob(padded);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function base64UrlEncode(value: string): string {
	return base64UrlFromBytes(new TextEncoder().encode(value));
}

export function base64UrlDecode(value: string): string {
	return new TextDecoder().decode(base64UrlToBytes(value));
}

/** Deflate a JSON string, or return null when the platform cannot. */
async function deflateJson(json: string): Promise<Uint8Array | null> {
	if (typeof CompressionStream === "undefined") return null;
	try {
		const stream = new Blob([json])
			.stream()
			.pipeThrough(new CompressionStream("deflate-raw"));
		const buffer = await new Response(stream).arrayBuffer();
		return new Uint8Array(buffer);
	} catch {
		return null;
	}
}

async function inflateJson(bytes: Uint8Array): Promise<string> {
	const stream = new Blob([bytes])
		.stream()
		.pipeThrough(new DecompressionStream("deflate-raw"));
	const buffer = await new Response(stream).arrayBuffer();
	return new TextDecoder().decode(buffer);
}

/** Serialise only the fields that carry a value, then encrypt, deflate or base64url them. */
export async function encodeSharePayload(values: VCardFormValues, password?: string): Promise<string> {
	const payload: Record<string, string> = {};
	for (const key of SHAREABLE_KEYS) {
		const raw = values[key];
		if (typeof raw !== "string") continue;
		const trimmed = raw.trim();
		if (trimmed) payload[key] = trimmed;
	}
	const json = JSON.stringify(payload);
	let encoded: string;
	if (password) {
		// Encrypted wins outright: silently shipping plaintext when the user
		// asked for a passphrase would be the worst possible fallback.
		const envelope = await encryptSharePayload(json, password);
		if (!envelope) throw new SharePayloadError("not-encodable");
		encoded = "x" + base64UrlFromBytes(envelope);
	} else {
		const plain = "p" + base64UrlEncode(json);
		encoded = plain;
		const deflated = await deflateJson(json);
		if (deflated) {
			const compressed = "d" + base64UrlFromBytes(deflated);
			if (compressed.length < plain.length) encoded = compressed;
		}
	}
	if (encoded.length > MAX_SHARE_PARAM_LENGTH) throw new SharePayloadError("payload-too-long");
	return encoded;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Decode the `v` parameter into form values, rejecting anything malformed. */
export async function decodeSharePayload(raw: string, password?: string): Promise<VCardFormValues | null> {
	if (!raw || raw.length > MAX_SHARE_PARAM_LENGTH) return null;
	let json: string;
	if (raw.startsWith("x")) {
		// Encrypted links must announce the missing passphrase with a typed
		// error, so the UI can ask for it instead of calling the link broken.
		if (!password) throw new SharePasswordRequiredError();
		const decrypted = await decryptSharePayload(base64UrlToBytes(raw.slice(1)), password);
		if (decrypted === null) return null;
		json = decrypted;
	} else {
		try {
			if (raw.startsWith("d")) {
				json = await inflateJson(base64UrlToBytes(raw.slice(1)));
			} else if (raw.startsWith("p")) {
				json = base64UrlDecode(raw.slice(1));
			} else {
				// Legacy links created before the flag byte carry the plain JSON.
				json = base64UrlDecode(raw);
			}
		} catch {
			return null;
		}
	}
	if (json.length > 16_000) return null;

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
 * @param password Encrypt the payload when set; the passphrase travels out-of-band.
 */
export async function buildShareUrl(values: VCardFormValues, baseUrl?: string, password?: string): Promise<string> {
	const encoded = await encodeSharePayload(values, password);
	const base =
		baseUrl ??
		(typeof window === "undefined"
			? "/"
			: `${window.location.origin}${window.location.pathname}`);
	const clean = base.split("#")[0].split("?")[0];
	return `${clean}#/?v=${encoded}`;
}

/**
 * Decode a share parameter into form values, render data and a .vcf payload.
 * Throws SharePasswordRequiredError for an encrypted link without a passphrase.
 */
export async function decodeShareParam(raw: string, password?: string): Promise<SharedCard | null> {
	const values = await decodeSharePayload(raw, password);
	if (!values) return null;
	const data = toVCardData(values);
	return { values, data, vcard: createVCard(data) };
}

/**
 * Read `v` from either the current hash (`#/?v=…`) or a legacy query string
 * (`/?v=…`). Legacy links were produced before v0.1.0 and must keep working.
 */
export function readShareParam(location: { search: string; hash: string }): string | null {
	const hashQuery = location.hash.includes("?") ? location.hash.slice(location.hash.indexOf("?") + 1) : "";
	const fromHash = new URLSearchParams(hashQuery).get("v");
	if (fromHash) return fromHash;

	const fromSearch = new URLSearchParams(location.search.replace(/^\?/, "")).get("v");
	return fromSearch || null;
}
